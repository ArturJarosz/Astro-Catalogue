import { useEffect, useState } from 'react'
import type { CatalogueData } from '../electron/shared-types'
import { Header } from './components/Header'
import { ObjectCard } from './components/ObjectCard'
import { Sidebar } from './components/Sidebar'
import { WarningsPanel } from './components/WarningsPanel'
import { groupObjectsByCatalog } from './lib/groupObjects'

export default function App() {
  const [catalogue, setCatalogue] = useState<CatalogueData | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgressLabel, setScanProgressLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null)

  useEffect(() => {
    window.astroCatalogue.getCatalogue().then(setCatalogue).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    return window.astroCatalogue.onScanProgress((progress) => {
      setScanProgressLabel(`Scanning… ${progress.objectsScanned} object(s) processed`)
    })
  }, [])


  async function handleSelectRoot() {
    const root = await window.astroCatalogue.selectRootDir()
    if (!root) return
    setCatalogue((prev) => ({
      rootPath: root,
      lastScannedAt: prev?.rootPath === root ? prev.lastScannedAt : null,
      objects: prev?.rootPath === root ? prev.objects : [],
      warnings: prev?.rootPath === root ? prev.warnings : [],
    }))
  }

  async function handleAnalyze() {
    if (!catalogue?.rootPath) return
    setScanning(true)
    setError(null)
    setScanProgressLabel('Scanning…')
    try {
      const result = await window.astroCatalogue.analyzeDirectory(catalogue.rootPath)
      setCatalogue(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setScanning(false)
      setScanProgressLabel(null)
    }
  }

  const groups = catalogue ? groupObjectsByCatalog(catalogue.objects) : []
  const effectiveSelectedCatalog =
    selectedCatalog !== null && groups.some((g) => g.catalog === selectedCatalog) ? selectedCatalog : null
  const visibleGroups =
    effectiveSelectedCatalog === null ? groups : groups.filter((g) => g.catalog === effectiveSelectedCatalog)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        rootPath={catalogue?.rootPath ?? null}
        lastScannedAt={catalogue?.lastScannedAt ?? null}
        scanning={scanning}
        scanProgressLabel={scanProgressLabel}
        onSelectRoot={handleSelectRoot}
        onAnalyze={handleAnalyze}
      />

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        {catalogue && catalogue.objects.length > 0 && (
          <Sidebar
            groups={groups}
            totalCount={catalogue.objects.length}
            selectedCatalog={effectiveSelectedCatalog}
            onSelect={setSelectedCatalog}
          />
        )}

        <main className="min-w-0 flex-1">
          {error && (
            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {catalogue && <WarningsPanel warnings={catalogue.warnings} />}

          {!catalogue?.rootPath ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-500">
              <p className="mb-1 text-base">No directory selected yet</p>
              <p className="text-sm">Select your astrophoto root directory to get started</p>
            </div>
          ) : catalogue.objects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-500">
              <p className="mb-1 text-base">No objects catalogued yet</p>
              <p className="text-sm">Click Analyze to scan the selected directory</p>
            </div>
          ) : (
            <div className="space-y-10">
              {visibleGroups.map((group) => (
                <section key={group.catalog}>
                  <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    {group.catalog}
                    <span className="text-xs font-normal normal-case text-slate-600">({group.objects.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.objects.map((object) => (
                      <ObjectCard key={object.path} object={object} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
