import { contextBridge, ipcRenderer } from 'electron'
import type { AstroCatalogueApi, ScanProgress } from './shared-types'

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
}

contextBridge.exposeInMainWorld('astroCatalogue', api)
