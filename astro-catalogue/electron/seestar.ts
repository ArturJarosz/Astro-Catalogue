import fs from 'node:fs'
import path from 'node:path'
import { applyDirectoryPattern } from './directory-pattern'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  DEFAULT_SEESTAR_EXTENSIONS,
  DEFAULT_SEESTAR_SOURCE_DIR,
  type SeestarCopyItem,
  type SeestarCopyPlan,
  type SeestarInvalidFile,
  type SeestarSourceDirectory,
  type SeestarSubDirGroupSummary,
  type SeestarSubDirSummary,
} from './shared-types'

export const SEESTAR_SOURCE_DIR = DEFAULT_SEESTAR_SOURCE_DIR

const SUB_SUFFIX = '_sub'
const VIDEO_SUFFIX = '_video'
const FILE_PATTERN =
  /^Light_.+_(?<exposure>\d+(?:\.\d+)?s)_(?<type>IRCUT|LP)_(?<date>\d{8})-\d{6}\.(?<extension>[A-Za-z0-9]+)$/i

// Sun/Moon/planetary captures save as one continuous video clip instead of individual light
// frames, e.g. "2026-08-28-225936-Lunar-RAW.avi". These aren't per-frame exposures, so they
// get a fixed "0s" placeholder for the {exposure} token — harmless, since video formats never
// count towards frame/exposure totals (see file-types.ts) — and their target name (Lunar,
// Solar, …) becomes {type}.
const VIDEO_FILE_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})-\d{6}-(?<target>[A-Za-z0-9]+)-RAW\.(?<extension>[A-Za-z0-9]+)$/i

interface MatchedFile {
  type: string
  extension: string
  targetDate: string
  targetExposure: string
}

function matchFileName(fileName: string): MatchedFile | null {
  const lightMatch = FILE_PATTERN.exec(fileName)
  if (lightMatch?.groups) {
    return {
      type: lightMatch.groups.type.toUpperCase(),
      extension: lightMatch.groups.extension.toLowerCase(),
      targetDate: formatTargetDate(lightMatch.groups.date),
      targetExposure: formatTargetExposure(lightMatch.groups.exposure),
    }
  }

  const videoMatch = VIDEO_FILE_PATTERN.exec(fileName)
  if (videoMatch?.groups) {
    return {
      type: videoMatch.groups.target,
      extension: videoMatch.groups.extension.toLowerCase(),
      targetDate: formatTargetDate(`${videoMatch.groups.year}${videoMatch.groups.month}${videoMatch.groups.day}`),
      targetExposure: '0s',
    }
  }

  return null
}

function fileExtension(fileName: string): string {
  return path.extname(fileName).replace(/^\./, '').toLowerCase()
}

// Deep-sky light frames live in a "<Object>_sub" folder; Sun/Moon/planetary video clips
// live in a "<Target>_video" folder instead — both are valid import sources.
function isImportableSourceDirectory(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith(SUB_SUFFIX) || lower.endsWith(VIDEO_SUFFIX)
}

function objectNameFromSubDirectory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith(SUB_SUFFIX)) return name.slice(0, -SUB_SUFFIX.length)
  if (lower.endsWith(VIDEO_SUFFIX)) return name.slice(0, -VIDEO_SUFFIX.length)
  return name
}

function formatTargetDate(date: string): string {
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`
}

function formatTargetExposure(exposure: string): string {
  const num = Number.parseFloat(exposure.replace(/s$/i, ''))
  const trimmed = num.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${trimmed}s`
}

export function listSourceDirectories(sourceDir: string = SEESTAR_SOURCE_DIR): SeestarSourceDirectory[] {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true }).filter((e) => e.isDirectory())

  return entries
    .map((entry) => {
      const dirPath = path.join(sourceDir, entry.name)
      const files = fs.readdirSync(dirPath, { withFileTypes: true }).filter((e) => e.isFile())
      const extensionCounts: Record<string, number> = {}
      for (const file of files) {
        const extension = fileExtension(file.name)
        if (!extension) continue
        extensionCounts[extension] = (extensionCounts[extension] ?? 0) + 1
      }

      return {
        name: entry.name,
        isImportable: isImportableSourceDirectory(entry.name),
        totalFiles: files.length,
        extensionCounts,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildCopyPlan(
  subDirNames: string[],
  targetDirectory: string,
  directoryPattern: string = DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  sourceDir: string = SEESTAR_SOURCE_DIR,
  extensions: string[] = DEFAULT_SEESTAR_EXTENSIONS,
): SeestarCopyPlan {
  const selectedExtensions = new Set(extensions.map((e) => e.replace(/^\./, '').toLowerCase()))
  const invalidFiles: SeestarInvalidFile[] = []
  const copyItems: SeestarCopyItem[] = []
  const subDirSummaries: SeestarSubDirSummary[] = []

  for (const subDirName of subDirNames) {
    const subDirPath = path.join(sourceDir, subDirName)
    const objectName = objectNameFromSubDirectory(subDirName)
    const files = fs.readdirSync(subDirPath, { withFileTypes: true }).filter((e) => e.isFile())
    const groups = new Map<string, SeestarSubDirGroupSummary>()

    for (const file of files) {
      const match = matchFileName(file.name)
      if (!match) {
        invalidFiles.push({ subDirectory: subDirName, fileName: file.name })
        continue
      }

      const { type, extension, targetDate, targetExposure } = match

      const groupKey = `${targetDate}|${type}|${targetExposure}|${extension}`
      const existingGroup = groups.get(groupKey)
      if (existingGroup) existingGroup.count += 1
      else groups.set(groupKey, { targetDate, type, targetExposure, extension, count: 1 })

      if (!selectedExtensions.has(extension)) continue

      const destinationDirectory = path.join(
        targetDirectory,
        ...applyDirectoryPattern(directoryPattern, {
          object: objectName,
          type,
          date: targetDate,
          exposure: targetExposure,
        }),
      )
      const destinationPath = path.join(destinationDirectory, file.name)

      copyItems.push({
        sourcePath: path.join(subDirPath, file.name),
        destinationPath,
        destinationDirectory,
        fileName: file.name,
        objectName,
        extension,
        type,
        targetDate,
        targetExposure,
        alreadyExists: fs.existsSync(destinationPath),
      })
    }

    subDirSummaries.push({
      name: subDirName,
      groups: Array.from(groups.values()).sort((a, b) =>
        `${a.targetDate}${a.type}${a.targetExposure}${a.extension}`.localeCompare(
          `${b.targetDate}${b.type}${b.targetExposure}${b.extension}`,
        ),
      ),
    })
  }

  return { subDirSummaries, invalidFiles, copyItems }
}

export function executeCopy(
  items: SeestarCopyItem[],
  overwrite: boolean,
  onProgress?: (copied: number, total: number, fileName: string) => void,
): number {
  const toCopy = items.filter((item) => overwrite || !item.alreadyExists)
  const directories = new Set(toCopy.map((item) => item.destinationDirectory))
  for (const dir of directories) {
    fs.mkdirSync(dir, { recursive: true })
  }

  let copied = 0
  for (const item of toCopy) {
    fs.copyFileSync(item.sourcePath, item.destinationPath)
    copied += 1
    onProgress?.(copied, toCopy.length, item.fileName)
  }
  return copied
}
