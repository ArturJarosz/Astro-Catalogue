export interface SessionInfo {
  date: string
  captureSeconds: number
  frameCount: number
  folderPath: string
  sizeBytes: number
}

export interface FrameTypeInfo {
  name: string
  sessions: SessionInfo[]
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
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

export interface SeestarSourceDirectory {
  name: string
  isSub: boolean
  totalFiles: number
  jpgFiles: number
  fitFiles: number
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
}

export interface AstroCatalogueApi {
  selectRootDir: () => Promise<string | null>
  analyzeDirectory: (root: string, directoryPattern: string) => Promise<CatalogueData>
  getCatalogue: () => Promise<CatalogueData>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  getObjectSummary: (name: string, catalog: string, catalogNumber: number | null) => Promise<ObjectSummary | null>
  openExternal: (url: string) => Promise<void>
  checkSeestarConnection: () => Promise<boolean>
  listSeestarDirectories: () => Promise<SeestarSourceDirectory[]>
  selectSeestarTargetDir: () => Promise<string | null>
  buildSeestarCopyPlan: (
    subDirNames: string[],
    targetDirectory: string,
    directoryPattern: string,
  ) => Promise<SeestarCopyPlan>
  executeSeestarCopy: (items: SeestarCopyItem[], overwrite: boolean) => Promise<SeestarCopyResult>
  onSeestarCopyProgress: (callback: (progress: SeestarCopyProgress) => void) => () => void
}
