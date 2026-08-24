import { contextBridge, ipcRenderer } from 'electron'
import type { AstroCatalogueApi, ScanProgress, SeestarCopyItem, SeestarCopyProgress } from './shared-types'

const api: AstroCatalogueApi = {
  selectRootDir: () => ipcRenderer.invoke('select-root-dir'),
  analyzeDirectory: (root: string) => ipcRenderer.invoke('analyze-directory', root),
  getCatalogue: () => ipcRenderer.invoke('get-catalogue'),
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => callback(progress)
    ipcRenderer.on('scan-progress', listener)
    return () => ipcRenderer.removeListener('scan-progress', listener)
  },
  getObjectSummary: (name: string, catalog: string, catalogNumber: number | null) =>
    ipcRenderer.invoke('get-object-summary', name, catalog, catalogNumber),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  checkSeestarConnection: () => ipcRenderer.invoke('check-seestar-connection'),
  listSeestarDirectories: () => ipcRenderer.invoke('list-seestar-directories'),
  selectSeestarTargetDir: () => ipcRenderer.invoke('select-seestar-target-dir'),
  buildSeestarCopyPlan: (subDirNames: string[], targetDirectory: string, directoryPattern: string) =>
    ipcRenderer.invoke('build-seestar-copy-plan', subDirNames, targetDirectory, directoryPattern),
  executeSeestarCopy: (items: SeestarCopyItem[], overwrite: boolean) =>
    ipcRenderer.invoke('execute-seestar-copy', items, overwrite),
  onSeestarCopyProgress: (callback: (progress: SeestarCopyProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: SeestarCopyProgress) => callback(progress)
    ipcRenderer.on('seestar-copy-progress', listener)
    return () => ipcRenderer.removeListener('seestar-copy-progress', listener)
  },
}

contextBridge.exposeInMainWorld('astroCatalogue', api)
