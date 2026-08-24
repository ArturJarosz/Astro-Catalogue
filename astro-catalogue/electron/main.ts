import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getLastRoot, saveCatalogue, loadCatalogue } from './db'
import { scanRoot } from './scanner'
import { buildCopyPlan, executeCopy, listSourceDirectories, SEESTAR_SOURCE_DIR } from './seestar'
import type { ObjectSummary, SeestarCopyItem } from './shared-types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('select-root-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('analyze-directory', async (_event, rootPath: string) => {
  const { objects, warnings } = scanRoot(rootPath, (currentPath, objectsScanned) => {
    mainWindow?.webContents.send('scan-progress', { currentPath, objectsScanned })
  })
  saveCatalogue(rootPath, objects, warnings)
  return loadCatalogue()
})

ipcMain.handle('get-catalogue', async () => {
  const catalogue = loadCatalogue()
  if (catalogue.rootPath) return catalogue
  const lastRoot = getLastRoot()
  return { ...catalogue, rootPath: lastRoot }
})

const SEESTAR_CHECK_TIMEOUT_MS = 5000

ipcMain.handle('check-seestar-connection', async () => {
  const accessible = fs
    .access(SEESTAR_SOURCE_DIR)
    .then(() => true)
    .catch(() => false)
  const timedOut = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SEESTAR_CHECK_TIMEOUT_MS))
  return Promise.race([accessible, timedOut])
})

ipcMain.handle('list-seestar-directories', async () => {
  return listSourceDirectories()
})

ipcMain.handle('select-seestar-target-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle(
  'build-seestar-copy-plan',
  async (_event, subDirNames: string[], targetDirectory: string, directoryPattern: string) => {
    return buildCopyPlan(subDirNames, targetDirectory, directoryPattern)
  },
)

ipcMain.handle('execute-seestar-copy', async (_event, items: SeestarCopyItem[], overwrite: boolean) => {
  const copiedCount = executeCopy(items, overwrite, (copied, total, fileName) => {
    mainWindow?.webContents.send('seestar-copy-progress', { copied, total, fileName })
  })
  return { copiedCount }
})

interface WikiSummary {
  title: string
  description?: string
  extract?: string
  thumbnail?: { source: string }
  originalimage?: { source: string }
  content_urls?: { desktop?: { page?: string } }
}

const WIKI_USER_AGENT = 'AstroCatalogue/1.0 (local desktop app)'
const wikiSummaryCache = new Map<string, ObjectSummary | null>()

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': WIKI_USER_AGENT },
    })
    if (!res.ok) return null
    return (await res.json()) as WikiSummary
  } catch {
    return null
  }
}

async function searchWikiTitle(query: string): Promise<string | null> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'opensearch')
    url.searchParams.set('search', query)
    url.searchParams.set('limit', '1')
    url.searchParams.set('namespace', '0')
    url.searchParams.set('format', 'json')
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_USER_AGENT } })
    if (!res.ok) return null
    const data = (await res.json()) as [string, string[], string[], string[]]
    return data[1]?.[0] ?? null
  } catch {
    return null
  }
}

function candidateWikiTitle(name: string, catalog: string, catalogNumber: number | null): string {
  if (catalogNumber === null) return name
  switch (catalog) {
    case 'Messier':
      return `Messier ${catalogNumber}`
    case 'Caldwell':
      return `Caldwell ${catalogNumber}`
    case 'NGC':
      return `NGC ${catalogNumber}`
    case 'IC':
      return `IC ${catalogNumber}`
    case 'Abell':
      return `Abell ${catalogNumber}`
    default:
      return name
  }
}

ipcMain.handle(
  'get-object-summary',
  async (
    _event,
    name: string,
    catalog: string,
    catalogNumber: number | null,
  ): Promise<ObjectSummary | null> => {
    const primaryTitle = candidateWikiTitle(name, catalog, catalogNumber)
    const cached = wikiSummaryCache.get(primaryTitle)
    if (cached !== undefined) return cached

    let summary = await fetchWikiSummary(primaryTitle)
    if (!summary) {
      const searched = await searchWikiTitle(primaryTitle)
      if (searched) summary = await fetchWikiSummary(searched)
    }

    const result: ObjectSummary | null = summary
      ? {
          title: summary.title,
          description: summary.description ?? null,
          extract: summary.extract ?? null,
          thumbnailUrl: summary.thumbnail?.source ?? summary.originalimage?.source ?? null,
          pageUrl: summary.content_urls?.desktop?.page ?? null,
        }
      : null

    wikiSummaryCache.set(primaryTitle, result)
    return result
  },
)

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})

app.whenReady().then(() => {
  initDb()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
