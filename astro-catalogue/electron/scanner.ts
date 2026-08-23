import fs from 'node:fs'
import path from 'node:path'
import type { FrameTypeInfo, ObjectInfo, SessionInfo, WarningInfo } from './shared-types'

const MOSAIC_SUFFIX = '_mosaic'
const FIT_EXTENSIONS = new Set(['.fit', '.fits'])
const SESSION_DIR_PATTERN = /^(\d{4}\.\d{2}\.\d{2})\s+(\S+)\s+(\d+)s$/

function listDirEntries(dirPath: string): fs.Dirent[] {
  return fs.readdirSync(dirPath, { withFileTypes: true }).filter((entry) => !entry.name.startsWith('.'))
}

function isFitFile(fileName: string): boolean {
  return FIT_EXTENSIONS.has(path.extname(fileName).toLowerCase())
}

function scanSessionDir(sessionPath: string, sessionDirName: string, warnings: WarningInfo[]): SessionInfo | null {
  const match = SESSION_DIR_PATTERN.exec(sessionDirName)
  if (!match) {
    warnings.push({
      path: sessionPath,
      message: `Folder name "${sessionDirName}" does not match the expected pattern "YYYY.MM.DD TYPE Ns"`,
    })
    return null
  }

  const [, date, , captureSecondsStr] = match
  const captureSeconds = Number.parseInt(captureSecondsStr, 10)

  const entries = listDirEntries(sessionPath)
  const frameCount = entries.filter((e) => e.isFile() && isFitFile(e.name)).length

  if (frameCount === 0) {
    warnings.push({ path: sessionPath, message: 'No .fit/.fits frames found in this session folder' })
  }

  return { date, captureSeconds, frameCount, folderPath: sessionPath }
}

function scanFrameTypeDir(frameTypePath: string, frameTypeName: string, warnings: WarningInfo[]): FrameTypeInfo {
  const entries = listDirEntries(frameTypePath)
  const sessions: SessionInfo[] = []

  for (const entry of entries) {
    const entryPath = path.join(frameTypePath, entry.name)
    if (!entry.isDirectory()) {
      warnings.push({ path: entryPath, message: 'Unexpected file directly inside a frame-type directory' })
      continue
    }
    const session = scanSessionDir(entryPath, entry.name, warnings)
    if (session) sessions.push(session)
  }

  const totalFrames = sessions.reduce((sum, s) => sum + s.frameCount, 0)
  const totalExposureSeconds = sessions.reduce((sum, s) => sum + s.frameCount * s.captureSeconds, 0)

  return { name: frameTypeName, sessions, totalFrames, totalExposureSeconds }
}

function scanObjectDir(objectPath: string, objectDirName: string, warnings: WarningInfo[]): ObjectInfo {
  const isMosaic = objectDirName.toLowerCase().endsWith(MOSAIC_SUFFIX)
  const name = isMosaic ? objectDirName.slice(0, -MOSAIC_SUFFIX.length) : objectDirName

  const entries = listDirEntries(objectPath)
  const frameTypes: FrameTypeInfo[] = []

  for (const entry of entries) {
    const entryPath = path.join(objectPath, entry.name)
    if (!entry.isDirectory()) {
      warnings.push({ path: entryPath, message: 'Unexpected file directly inside an object directory' })
      continue
    }
    frameTypes.push(scanFrameTypeDir(entryPath, entry.name, warnings))
  }

  return { name, isMosaic, path: objectPath, frameTypes }
}

export interface ScanResult {
  objects: ObjectInfo[]
  warnings: WarningInfo[]
}

export function scanRoot(rootPath: string, onProgress?: (currentPath: string, objectsScanned: number) => void): ScanResult {
  const warnings: WarningInfo[] = []
  const objects: ObjectInfo[] = []

  const entries = listDirEntries(rootPath)
  let objectsScanned = 0

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name)
    if (!entry.isDirectory()) {
      warnings.push({ path: entryPath, message: 'Unexpected file directly inside the root directory' })
      continue
    }
    objects.push(scanObjectDir(entryPath, entry.name, warnings))
    objectsScanned += 1
    onProgress?.(entryPath, objectsScanned)
  }

  objects.sort((a, b) => a.name.localeCompare(b.name))

  return { objects, warnings }
}
