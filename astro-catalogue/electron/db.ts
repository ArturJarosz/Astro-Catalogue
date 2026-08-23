import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import type { CatalogueData, ObjectInfo, WarningInfo } from './shared-types'

let db: DatabaseSync

export function initDb(): void {
  const dataDir = app.getPath('userData')
  fs.mkdirSync(dataDir, { recursive: true })
  db = new DatabaseSync(path.join(dataDir, 'catalogue.db'))
  db.exec('PRAGMA journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      root_path TEXT,
      last_scanned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS objects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      is_mosaic INTEGER NOT NULL DEFAULT 0,
      catalog TEXT NOT NULL DEFAULT 'Other',
      catalog_number INTEGER
    );

    CREATE TABLE IF NOT EXISTS frame_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      frame_type_id INTEGER NOT NULL REFERENCES frame_types(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      capture_seconds INTEGER NOT NULL,
      frame_count INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      message TEXT NOT NULL
    );
  `)

  const objectColumns = db.prepare('PRAGMA table_info(objects)').all() as { name: string }[]
  const objectColumnNames = new Set(objectColumns.map((c) => c.name))
  if (!objectColumnNames.has('catalog')) {
    db.exec("ALTER TABLE objects ADD COLUMN catalog TEXT NOT NULL DEFAULT 'Other'")
  }
  if (!objectColumnNames.has('catalog_number')) {
    db.exec('ALTER TABLE objects ADD COLUMN catalog_number INTEGER')
  }

  const sessionColumns = db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]
  const sessionColumnNames = new Set(sessionColumns.map((c) => c.name))
  if (!sessionColumnNames.has('size_bytes')) {
    db.exec('ALTER TABLE sessions ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0')
  }
}

export function getLastRoot(): string | null {
  const row = db.prepare('SELECT root_path FROM scan_meta WHERE id = 1').get() as
    | { root_path: string | null }
    | undefined
  return row?.root_path ?? null
}

export function saveCatalogue(rootPath: string, objects: ObjectInfo[], warnings: WarningInfo[]): void {
  const now = new Date().toISOString()

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM warnings').run()
    db.prepare('DELETE FROM objects').run()

    const insertObject = db.prepare(
      'INSERT INTO objects (name, path, is_mosaic, catalog, catalog_number) VALUES (?, ?, ?, ?, ?)',
    )
    const insertFrameType = db.prepare('INSERT INTO frame_types (object_id, name) VALUES (?, ?)')
    const insertSession = db.prepare(
      'INSERT INTO sessions (frame_type_id, date, capture_seconds, frame_count, folder_path, size_bytes) VALUES (?, ?, ?, ?, ?, ?)',
    )
    const insertWarning = db.prepare('INSERT INTO warnings (path, message) VALUES (?, ?)')

    for (const obj of objects) {
      const objResult = insertObject.run(obj.name, obj.path, obj.isMosaic ? 1 : 0, obj.catalog, obj.catalogNumber)
      const objectId = Number(objResult.lastInsertRowid)
      for (const ft of obj.frameTypes) {
        const ftResult = insertFrameType.run(objectId, ft.name)
        const frameTypeId = Number(ftResult.lastInsertRowid)
        for (const session of ft.sessions) {
          insertSession.run(
            frameTypeId,
            session.date,
            session.captureSeconds,
            session.frameCount,
            session.folderPath,
            session.sizeBytes,
          )
        }
      }
    }

    for (const warning of warnings) {
      insertWarning.run(warning.path, warning.message)
    }

    db.prepare(
      `INSERT INTO scan_meta (id, root_path, last_scanned_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET root_path = excluded.root_path, last_scanned_at = excluded.last_scanned_at`,
    ).run(rootPath, now)

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function loadCatalogue(): CatalogueData {
  const meta = db.prepare('SELECT root_path, last_scanned_at FROM scan_meta WHERE id = 1').get() as
    | { root_path: string | null; last_scanned_at: string | null }
    | undefined

  const objectRows = db
    .prepare('SELECT id, name, path, is_mosaic, catalog, catalog_number FROM objects ORDER BY name')
    .all() as {
    id: number
    name: string
    path: string
    is_mosaic: number
    catalog: string
    catalog_number: number | null
  }[]

  const objects: ObjectInfo[] = objectRows.map((objRow) => {
    const frameTypeRows = db
      .prepare('SELECT id, name FROM frame_types WHERE object_id = ? ORDER BY name')
      .all(objRow.id) as { id: number; name: string }[]

    const frameTypes = frameTypeRows.map((ftRow) => {
      const sessionRows = db
        .prepare(
          'SELECT date, capture_seconds, frame_count, folder_path, size_bytes FROM sessions WHERE frame_type_id = ? ORDER BY date',
        )
        .all(ftRow.id) as {
        date: string
        capture_seconds: number
        frame_count: number
        folder_path: string
        size_bytes: number
      }[]

      const sessions = sessionRows.map((s) => ({
        date: s.date,
        captureSeconds: s.capture_seconds,
        frameCount: s.frame_count,
        folderPath: s.folder_path,
        sizeBytes: s.size_bytes,
      }))

      const totalFrames = sessions.reduce((sum, s) => sum + s.frameCount, 0)
      const totalExposureSeconds = sessions.reduce((sum, s) => sum + s.frameCount * s.captureSeconds, 0)
      const totalSizeBytes = sessions.reduce((sum, s) => sum + s.sizeBytes, 0)

      return { name: ftRow.name, sessions, totalFrames, totalExposureSeconds, totalSizeBytes }
    })

    return {
      name: objRow.name,
      isMosaic: objRow.is_mosaic === 1,
      path: objRow.path,
      frameTypes,
      catalog: objRow.catalog,
      catalogNumber: objRow.catalog_number,
    }
  })

  const warningRows = db.prepare('SELECT path, message FROM warnings ORDER BY path').all() as WarningInfo[]

  return {
    rootPath: meta?.root_path ?? null,
    lastScannedAt: meta?.last_scanned_at ?? null,
    objects,
    warnings: warningRows,
  }
}
