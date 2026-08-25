import fs from 'node:fs'
import path from 'node:path'
import { resolveCatalog } from './catalog'
import { parseDirectoryPattern, type DirectoryPatternSegment, type PatternToken } from './directory-pattern'
import type { FrameTypeInfo, ObjectInfo, SessionInfo, WarningInfo } from './shared-types'

const MOSAIC_SUFFIX = '_mosaic'
const FIT_EXTENSIONS = new Set(['.fit', '.fits'])
const REQUIRED_TOKENS: PatternToken[] = ['object', 'type', 'date', 'exposure']

function listDirEntries(dirPath: string): fs.Dirent[] {
  return fs.readdirSync(dirPath, { withFileTypes: true }).filter((entry) => !entry.name.startsWith('.'))
}

function isFitFile(fileName: string): boolean {
  return FIT_EXTENSIONS.has(path.extname(fileName).toLowerCase())
}

interface LeafRecord {
  object: string
  objectPath: string
  type: string
  date: string
  captureSeconds: number
  folderPath: string
  frameCount: number
  sizeBytes: number
}

interface WalkContext {
  values: Partial<Record<PatternToken, string>>
  objectPath?: string
}

function scanLeaf(dirPath: string, context: WalkContext, warnings: WarningInfo[]): LeafRecord {
  const entries = listDirEntries(dirPath)
  const fitFiles = entries.filter((e) => e.isFile() && isFitFile(e.name))
  const frameCount = fitFiles.length
  const sizeBytes = fitFiles.reduce((sum, f) => sum + fs.statSync(path.join(dirPath, f.name)).size, 0)

  if (frameCount === 0) {
    warnings.push({ path: dirPath, message: 'No .fit/.fits frames found in this session folder' })
  }

  const { object, type, date, exposure } = context.values
  const captureSeconds = Number.parseFloat((exposure as string).replace(/s$/i, ''))

  return {
    object: object as string,
    objectPath: context.objectPath as string,
    type: type as string,
    date: date as string,
    captureSeconds,
    folderPath: dirPath,
    frameCount,
    sizeBytes,
  }
}

function walk(
  dirPath: string,
  segments: DirectoryPatternSegment[],
  levelIndex: number,
  context: WalkContext,
  warnings: WarningInfo[],
  leaves: LeafRecord[],
  onLeaf?: (leaf: LeafRecord) => void,
): void {
  if (levelIndex === segments.length) {
    const leaf = scanLeaf(dirPath, context, warnings)
    leaves.push(leaf)
    onLeaf?.(leaf)
    return
  }

  const segment = segments[levelIndex]
  const entries = listDirEntries(dirPath)

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (!entry.isDirectory()) {
      warnings.push({ path: entryPath, message: 'Unexpected file directly inside a directory-pattern level' })
      continue
    }

    const match = segment.regex.exec(entry.name)
    if (!match?.groups) {
      warnings.push({
        path: entryPath,
        message: `Folder name "${entry.name}" does not match the configured directory pattern`,
      })
      continue
    }

    const nextValues = { ...context.values }
    for (const token of segment.tokens) {
      nextValues[token] = match.groups[token]
    }
    const nextContext: WalkContext = {
      values: nextValues,
      objectPath: segment.tokens.includes('object') ? entryPath : context.objectPath,
    }

    walk(entryPath, segments, levelIndex + 1, nextContext, warnings, leaves, onLeaf)
  }
}

export interface ScanResult {
  objects: ObjectInfo[]
  warnings: WarningInfo[]
}

export function scanRoot(
  rootPath: string,
  directoryPattern: string,
  onProgress?: (currentPath: string, objectsScanned: number) => void,
): ScanResult {
  const segments = parseDirectoryPattern(directoryPattern)
  const presentTokens = new Set(segments.flatMap((s) => s.tokens))
  for (const token of REQUIRED_TOKENS) {
    if (!presentTokens.has(token)) {
      throw new Error(`Directory pattern must include {${token}} to scan the catalogue`)
    }
  }

  const warnings: WarningInfo[] = []
  const leaves: LeafRecord[] = []
  const objectsSeen = new Set<string>()

  walk(rootPath, segments, 0, { values: {} }, warnings, leaves, (leaf) => {
    objectsSeen.add(leaf.object)
    onProgress?.(leaf.folderPath, objectsSeen.size)
  })

  const objectsByPath = new Map<
    string,
    { name: string; isMosaic: boolean; path: string; frameTypes: Map<string, SessionInfo[]> }
  >()

  for (const leaf of leaves) {
    const isMosaic = leaf.object.toLowerCase().endsWith(MOSAIC_SUFFIX)
    const name = isMosaic ? leaf.object.slice(0, -MOSAIC_SUFFIX.length) : leaf.object

    let objectEntry = objectsByPath.get(leaf.objectPath)
    if (!objectEntry) {
      objectEntry = { name, isMosaic, path: leaf.objectPath, frameTypes: new Map() }
      objectsByPath.set(leaf.objectPath, objectEntry)
    }

    const sessions = objectEntry.frameTypes.get(leaf.type) ?? []
    sessions.push({
      date: leaf.date,
      captureSeconds: leaf.captureSeconds,
      frameCount: leaf.frameCount,
      folderPath: leaf.folderPath,
      sizeBytes: leaf.sizeBytes,
    })
    objectEntry.frameTypes.set(leaf.type, sessions)
  }

  const objects: ObjectInfo[] = Array.from(objectsByPath.values()).map((entry) => {
    const { name } = entry
    const frameTypes: FrameTypeInfo[] = Array.from(entry.frameTypes.entries()).map(([typeName, sessions]) => {
      const totalFrames = sessions.reduce((sum, s) => sum + s.frameCount, 0)
      const totalExposureSeconds = sessions.reduce((sum, s) => sum + s.frameCount * s.captureSeconds, 0)
      const totalSizeBytes = sessions.reduce((sum, s) => sum + s.sizeBytes, 0)
      return { name: typeName, sessions, totalFrames, totalExposureSeconds, totalSizeBytes }
    })

    const { catalog, catalogNumber } = resolveCatalog(name)

    return { name, isMosaic: entry.isMosaic, path: entry.path, frameTypes, catalog, catalogNumber }
  })

  objects.sort((a, b) => a.name.localeCompare(b.name))

  return { objects, warnings }
}
