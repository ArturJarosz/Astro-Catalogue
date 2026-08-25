import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  DEFAULT_SEESTAR_SOURCE_DIR,
  type CatalogueData,
  type ObjectInfo,
} from '../electron/shared-types'
import { AppNav, type AppSection } from './components/AppNav'
import { ColumnFilter } from './components/ColumnFilter'
import { ConfigurationView } from './components/ConfigurationView'
import { Header } from './components/Header'
import { MoonPanel, type ObservingLocation } from './components/MoonPanel'
import { ObjectCard } from './components/ObjectCard'
import { ObjectDetailModal } from './components/ObjectDetailModal'
import { ObjectListTable } from './components/ObjectListTable'
import { SeestarView } from './components/SeestarView'
import { Sidebar } from './components/Sidebar'
import { SortControl } from './components/SortControl'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { groupObjectsByCatalog } from './lib/groupObjects'
import { formatMetrics, type MetricKey } from './lib/columns'
import { computeNightMoonTrack } from './lib/moonSeparation'
import { compareObjects, type SortDirection, type SortKey } from './lib/sortObjects'

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('catalogue')
  const [catalogue, setCatalogue] = useState<CatalogueData | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgressLabel, setScanProgressLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<ObjectInfo | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('viewMode') as ViewMode | null) ?? 'card',
  )
  const [nameFilter, setNameFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedFrameTypes, setSelectedFrameTypes] = useState<Set<string> | null>(null)
  const [showTotal, setShowTotal] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    () => new Set<MetricKey>(['frames', 'exposure', 'size']),
  )
  const [directoryPattern, setDirectoryPattern] = useState<string>(
    () => localStorage.getItem('seestarDirectoryPattern') ?? DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  )

  function handleDirectoryPatternChange(pattern: string) {
    setDirectoryPattern(pattern)
    localStorage.setItem('seestarDirectoryPattern', pattern)
  }

  const [observingLocation, setObservingLocation] = useState<ObservingLocation | null>(() => {
    const stored = localStorage.getItem('observingLocation')
    return stored ? (JSON.parse(stored) as ObservingLocation) : null
  })

  function handleObservingLocationChange(location: ObservingLocation) {
    setObservingLocation(location)
    localStorage.setItem('observingLocation', JSON.stringify(location))
  }

  // Recomputed once per calendar day (todayKey), shared by every object card/row so
  // the Moon's position isn't recalculated per-object when rendering the catalogue list.
  const todayKey = new Date().toDateString()
  const nightMoonTrack = useMemo(() => {
    if (!observingLocation) return null
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return computeNightMoonTrack(dayStart, observingLocation.latitude, observingLocation.longitude)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observingLocation, todayKey])

  const [moonPanelNights, setMoonPanelNights] = useState<number>(
    () => Number(localStorage.getItem('moonPanelNights')) || 3,
  )

  function handleMoonPanelNightsChange(nights: number) {
    setMoonPanelNights(nights)
    localStorage.setItem('moonPanelNights', String(nights))
  }

  const [highlightTonight, setHighlightTonight] = useState<boolean>(
    () => (localStorage.getItem('moonPanelHighlightTonight') ?? 'true') === 'true',
  )

  function handleHighlightTonightChange(highlight: boolean) {
    setHighlightTonight(highlight)
    localStorage.setItem('moonPanelHighlightTonight', String(highlight))
  }

  const [moonCautionThresholdDeg, setMoonCautionThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('moonCautionThresholdDeg')) || 30,
  )

  function handleMoonCautionThresholdDegChange(deg: number) {
    setMoonCautionThresholdDeg(deg)
    localStorage.setItem('moonCautionThresholdDeg', String(deg))
  }

  const [moonCloseThresholdDeg, setMoonCloseThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('moonCloseThresholdDeg')) || 15,
  )

  function handleMoonCloseThresholdDegChange(deg: number) {
    setMoonCloseThresholdDeg(deg)
    localStorage.setItem('moonCloseThresholdDeg', String(deg))
  }

  const [showMoonPanel, setShowMoonPanel] = useState<boolean>(
    () => (localStorage.getItem('showMoonPanel') ?? 'true') === 'true',
  )

  function handleShowMoonPanelChange(show: boolean) {
    setShowMoonPanel(show)
    localStorage.setItem('showMoonPanel', String(show))
  }

  const [seestarSourceDirectory, setSeestarSourceDirectory] = useState<string>(
    () => localStorage.getItem('seestarSourceDirectory') ?? DEFAULT_SEESTAR_SOURCE_DIR,
  )

  function handleSeestarSourceDirectoryChange(directory: string) {
    setSeestarSourceDirectory(directory)
    localStorage.setItem('seestarSourceDirectory', directory)
  }

  const [seestarStatus, setSeestarStatus] = useState<ConnectionStatus>('checking')

  const checkSeestarConnection = useCallback(() => {
    setSeestarStatus('checking')
    window.astroCatalogue
      .checkSeestarConnection(seestarSourceDirectory)
      .then((connected) => setSeestarStatus(connected ? 'connected' : 'disconnected'))
      .catch(() => setSeestarStatus('disconnected'))
  }, [seestarSourceDirectory])

  useEffect(() => {
    checkSeestarConnection()
  }, [checkSeestarConnection])

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('viewMode', mode)
  }

  function handleToggleFrameType(name: string) {
    setSelectedFrameTypes((prev) => {
      const base = prev ?? new Set(allFrameTypeNames)
      const next = new Set(base)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleToggleMetric(key: MetricKey) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
      const result = await window.astroCatalogue.analyzeDirectory(catalogue.rootPath, directoryPattern)
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
  const normalizedFilter = nameFilter.trim().toLowerCase()
  const filteredGroups = (
    normalizedFilter === ''
      ? visibleGroups
      : visibleGroups
          .map((group) => ({
            ...group,
            objects: group.objects.filter((o) => o.name.toLowerCase().includes(normalizedFilter)),
          }))
          .filter((group) => group.objects.length > 0)
  ).map((group) => ({
    ...group,
    objects: [...group.objects].sort((a, b) => compareObjects(a, b, sortKey, sortDirection)),
  }))
  const allFrameTypeNames = catalogue
    ? Array.from(new Set(catalogue.objects.flatMap((o) => o.frameTypes.map((ft) => ft.name)))).sort()
    : []
  const effectiveSelectedFrameTypes = selectedFrameTypes ?? new Set(allFrameTypeNames)
  const isPlanning = activeSection === 'planning'
  const effectiveSelectedMetrics = isPlanning
    ? new Set([...selectedMetrics].filter((m) => m !== 'size'))
    : selectedMetrics

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        rootPath={catalogue?.rootPath ?? null}
        lastScannedAt={catalogue?.lastScannedAt ?? null}
        scanning={scanning}
        scanProgressLabel={scanProgressLabel}
        onSelectRoot={handleSelectRoot}
        onAnalyze={handleAnalyze}
        seestarStatus={seestarStatus}
        onCheckSeestarConnection={checkSeestarConnection}
        warningCount={catalogue?.warnings.length ?? 0}
        onWarningsClick={() => setActiveSection('seestar')}
      />

      <div className="mx-auto flex max-w-[96rem] gap-8 px-6 py-8">
        <AppNav active={activeSection} onSelect={setActiveSection} />

        <div className="min-w-0 flex-1">
        {activeSection === 'seestar' ? (
          <SeestarView
            defaultTargetDirectory={catalogue?.rootPath ?? null}
            directoryPattern={directoryPattern}
            status={seestarStatus}
            onCheckConnection={checkSeestarConnection}
            warnings={catalogue?.warnings ?? []}
            sourceDirectory={seestarSourceDirectory}
          />
        ) : activeSection === 'configuration' ? (
          <ConfigurationView
            directoryPattern={directoryPattern}
            onDirectoryPatternChange={handleDirectoryPatternChange}
            targetDirectory={catalogue?.rootPath ?? null}
            observingLocation={observingLocation}
            onObservingLocationChange={handleObservingLocationChange}
            moonPanelNights={moonPanelNights}
            onMoonPanelNightsChange={handleMoonPanelNightsChange}
            highlightTonight={highlightTonight}
            onHighlightTonightChange={handleHighlightTonightChange}
            showMoonPanel={showMoonPanel}
            onShowMoonPanelChange={handleShowMoonPanelChange}
            moonCautionThresholdDeg={moonCautionThresholdDeg}
            onMoonCautionThresholdDegChange={handleMoonCautionThresholdDegChange}
            moonCloseThresholdDeg={moonCloseThresholdDeg}
            onMoonCloseThresholdDegChange={handleMoonCloseThresholdDegChange}
            seestarSourceDirectory={seestarSourceDirectory}
            onSeestarSourceDirectoryChange={handleSeestarSourceDirectoryChange}
          />
        ) : (
        <>
        {catalogue && catalogue.objects.length > 0 && (
          <div className="mb-6 border-b border-white/10 pb-4">
            <Sidebar
              groups={groups}
              totalCount={catalogue.objects.length}
              selectedCatalog={effectiveSelectedCatalog}
              onSelect={setSelectedCatalog}
            />
          </div>
        )}

        {activeSection === 'planning' && showMoonPanel && (
          <div className="mb-6">
            <MoonPanel location={observingLocation} nights={moonPanelNights} highlightTonight={highlightTonight} />
          </div>
        )}

        <main className="min-w-0">
          {error && (
            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {catalogue && catalogue.objects.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-3">
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Filter by name…"
                className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-white/20 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <SortControl
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSortKeyChange={setSortKey}
                  onSortDirectionChange={setSortDirection}
                />
                <ColumnFilter
                  frameTypeOptions={allFrameTypeNames}
                  selectedFrameTypes={effectiveSelectedFrameTypes}
                  onToggleFrameType={handleToggleFrameType}
                  showTotal={showTotal}
                  onToggleTotal={() => setShowTotal((s) => !s)}
                  selectedMetrics={effectiveSelectedMetrics}
                  onToggleMetric={handleToggleMetric}
                  hiddenMetrics={isPlanning ? new Set<MetricKey>(['size']) : undefined}
                />
                <ViewToggle value={viewMode} onChange={handleViewModeChange} />
              </div>
            </div>
          )}

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
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-500">
              <p className="mb-1 text-base">No objects match your filter</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-10">
              {filteredGroups.map((group) => {
                const groupTotalFrames = group.objects.reduce(
                  (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalFrames, 0),
                  0,
                )
                const groupTotalExposure = group.objects.reduce(
                  (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalExposureSeconds, 0),
                  0,
                )
                const groupTotalSize = group.objects.reduce(
                  (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalSizeBytes, 0),
                  0,
                )
                return (
                <section key={group.catalog}>
                  <h2 className="mb-3 flex items-baseline gap-2 text-base font-semibold uppercase tracking-wide text-slate-400">
                    {group.catalog}
                    <span className="text-xs font-normal normal-case text-slate-600">({group.objects.length})</span>
                    {showTotal && (
                      <span className="ml-auto text-xs font-normal normal-case tabular-nums text-slate-600">
                        {formatMetrics(
                          {
                            totalFrames: groupTotalFrames,
                            totalExposureSeconds: groupTotalExposure,
                            totalSizeBytes: groupTotalSize,
                          },
                          effectiveSelectedMetrics,
                        )}
                      </span>
                    )}
                  </h2>
                  {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.objects.map((object) => (
                        <ObjectCard
                          key={object.path}
                          object={object}
                          warnings={catalogue.warnings}
                          onClick={() => setSelectedObject(object)}
                          visibleFrameTypes={effectiveSelectedFrameTypes}
                          showTotal={showTotal}
                          visibleMetrics={effectiveSelectedMetrics}
                          observingLocation={observingLocation}
                          nightMoonTrack={nightMoonTrack}
                          isPlanning={isPlanning}
                        />
                      ))}
                    </div>
                  ) : (
                    <ObjectListTable
                      objects={group.objects}
                      warnings={catalogue.warnings}
                      onSelect={setSelectedObject}
                      showThumbnails={viewMode === 'thumbnail-list'}
                      visibleFrameTypes={effectiveSelectedFrameTypes}
                      showTotal={showTotal}
                      visibleMetrics={effectiveSelectedMetrics}
                      observingLocation={observingLocation}
                      nightMoonTrack={nightMoonTrack}
                      moonCautionThresholdDeg={moonCautionThresholdDeg}
                      moonCloseThresholdDeg={moonCloseThresholdDeg}
                    />
                  )}
                </section>
                )
              })}
            </div>
          )}
        </main>
        </>
        )}
        </div>
      </div>

      {selectedObject && catalogue && (
        <ObjectDetailModal
          key={selectedObject.path}
          object={selectedObject}
          warnings={catalogue.warnings}
          observingLocation={observingLocation}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  )
}
