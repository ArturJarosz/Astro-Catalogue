/** How many files of one format (lower-case extension, no dot) a folder holds, and their size. */
export interface FileTypeInfo {
  extension: string
  count: number
  sizeBytes: number
}

export interface SessionInfo {
  date: string
  captureSeconds: number
  /** Only frame files (see FRAME_EXTENSIONS) — previews and other formats are excluded. */
  frameCount: number
  folderPath: string
  /** Every file in the folder, whatever its format. */
  sizeBytes: number
  fileTypes: FileTypeInfo[]
}

export interface FrameTypeInfo {
  name: string
  sessions: SessionInfo[]
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
  fileTypes: FileTypeInfo[]
}

export interface ObjectInfo {
  name: string
  isMosaic: boolean
  path: string
  frameTypes: FrameTypeInfo[]
  catalog: string
  catalogNumber: number | null
}

export interface WarningInfo {
  path: string
  message: string
}

export interface CatalogueData {
  rootPath: string | null
  lastScannedAt: string | null
  objects: ObjectInfo[]
  warnings: WarningInfo[]
}

export interface ScanProgress {
  currentPath: string
  objectsScanned: number
}

export interface ObjectSummary {
  title: string
  description: string | null
  extract: string | null
  thumbnailUrl: string | null
  pageUrl: string | null
}

export const DEFAULT_SEESTAR_DIRECTORY_PATTERN = '{object}/{type}/{date} {type} {exposure}'

export const DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS = String.raw`\\seestar\EMMC Images\MyWorks`
export const DEFAULT_SEESTAR_SOURCE_DIR_LINUX = '/mnt/seestar/EMMC Images/MyWorks'
export const DEFAULT_SEESTAR_SOURCE_DIR = DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS

export const DEFAULT_SEESTAR_EXTENSIONS = ['fit']

export interface SeestarSourceDirectory {
  name: string
  isSub: boolean
  totalFiles: number
  /** Lower-case extension (without the dot) → number of files in the directory. */
  extensionCounts: Record<string, number>
}

export interface SeestarSubDirGroupSummary {
  targetDate: string
  type: string
  targetExposure: string
  extension: string
  count: number
}

export interface SeestarSubDirSummary {
  name: string
  groups: SeestarSubDirGroupSummary[]
}

export interface SeestarInvalidFile {
  subDirectory: string
  fileName: string
}

export interface SeestarCopyItem {
  sourcePath: string
  destinationPath: string
  destinationDirectory: string
  fileName: string
  objectName: string
  extension: string
  type: string
  targetDate: string
  targetExposure: string
  alreadyExists: boolean
}

export interface SeestarCopyPlan {
  subDirSummaries: SeestarSubDirSummary[]
  invalidFiles: SeestarInvalidFile[]
  copyItems: SeestarCopyItem[]
}

export interface SeestarCopyProgress {
  copied: number
  total: number
  fileName: string
}

export interface SeestarCopyResult {
  copiedCount: number
  /** Top-level folder names under the import target that received files. */
  importedTopLevelDirectories: string[]
}

export type CurrentLocationResult =
  | { ok: true; latitude: number; longitude: number; label: string | null }
  | { ok: false; error: string }

export interface AstroCatalogueApi {
  selectRootDir: () => Promise<string | null>
  analyzeDirectory: (root: string, directoryPattern: string) => Promise<CatalogueData>
  analyzeDirectories: (
    root: string,
    directoryPattern: string,
    topLevelNames: string[],
  ) => Promise<CatalogueData>
  getCatalogue: () => Promise<CatalogueData>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  getObjectSummary: (name: string, catalog: string, catalogNumber: number | null) => Promise<ObjectSummary | null>
  openExternal: (url: string) => Promise<void>
  checkSeestarConnection: (sourceDirectory: string) => Promise<boolean>
  listSeestarDirectories: (sourceDirectory: string) => Promise<SeestarSourceDirectory[]>
  selectSeestarTargetDir: () => Promise<string | null>
  selectObjectImagesDir: () => Promise<string | null>
  getLocalObjectImage: (imagesPath: string, objectName: string) => Promise<string | null>
  buildSeestarCopyPlan: (
    subDirNames: string[],
    targetDirectory: string,
    directoryPattern: string,
    sourceDirectory: string,
    extensions: string[],
  ) => Promise<SeestarCopyPlan>
  executeSeestarCopy: (
    items: SeestarCopyItem[],
    overwrite: boolean,
    targetDirectory: string,
  ) => Promise<SeestarCopyResult>
  onSeestarCopyProgress: (callback: (progress: SeestarCopyProgress) => void) => () => void
  getCurrentLocation: () => Promise<CurrentLocationResult>
}
