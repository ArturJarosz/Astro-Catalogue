export interface SessionInfo {
  date: string
  captureSeconds: number
  frameCount: number
  folderPath: string
}

export interface FrameTypeInfo {
  name: string
  sessions: SessionInfo[]
  totalFrames: number
  totalExposureSeconds: number
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

export interface AstroCatalogueApi {
  selectRootDir: () => Promise<string | null>
  analyzeDirectory: (root: string) => Promise<CatalogueData>
  getCatalogue: () => Promise<CatalogueData>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
}
