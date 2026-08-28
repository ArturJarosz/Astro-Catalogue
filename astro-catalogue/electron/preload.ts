import { contextBridge, ipcRenderer } from 'electron'
import type { AstroCatalogueApi, ScanProgress, SeestarCopyItem, SeestarCopyProgress } from './shared-types'

const api: AstroCatalogueApi = {
  selectRootDir: () => ipcRenderer.invoke('select-root-dir'),
  analyzeDirectory: (root: string, directoryPattern: string) =>
    ipcRenderer.invoke('analyze-directory', root, directoryPattern),
  getCatalogue: () => ipcRenderer.invoke('get-catalogue'),
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => callback(progress)
    ipcRenderer.on('scan-progress', listener)
    return () => ipcRenderer.removeListener('scan-progress', listener)
  },
  getObjectSummary: (name: string, catalog: string, catalogNumber: number | null) =>
    ipcRenderer.invoke('get-object-summary', name, catalog, catalogNumber),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  checkSeestarConnection: (sourceDirectory: string) =>
    ipcRenderer.invoke('check-seestar-connection', sourceDirectory),
  listSeestarDirectories: (sourceDirectory: string) =>
    ipcRenderer.invoke('list-seestar-directories', sourceDirectory),
  selectSeestarTargetDir: () => ipcRenderer.invoke('select-seestar-target-dir'),
  selectObjectImagesDir: () => ipcRenderer.invoke('select-object-images-dir'),
  getLocalObjectImage: (imagesPath: string, objectName: string) =>
    ipcRenderer.invoke('get-local-object-image', imagesPath, objectName),
  buildSeestarCopyPlan: (
    subDirNames: string[],
    targetDirectory: string,
    directoryPattern: string,
    sourceDirectory: string,
    extensions: string[],
  ) =>
    ipcRenderer.invoke(
      'build-seestar-copy-plan',
      subDirNames,
      targetDirectory,
      directoryPattern,
      sourceDirectory,
      extensions,
    ),
  executeSeestarCopy: (items: SeestarCopyItem[], overwrite: boolean) =>
    ipcRenderer.invoke('execute-seestar-copy', items, overwrite),
  onSeestarCopyProgress: (callback: (progress: SeestarCopyProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: SeestarCopyProgress) => callback(progress)
    ipcRenderer.on('seestar-copy-progress', listener)
    return () => ipcRenderer.removeListener('seestar-copy-progress', listener)
  },
  getCurrentLocation: () => ipcRenderer.invoke('get-current-location'),
}

contextBridge.exposeInMainWorld('astroCatalogue', api)
