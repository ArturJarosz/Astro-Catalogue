import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  type SeestarCopyItem,
  type SeestarCopyPlan,
  type SeestarCopyProgress,
  type SeestarSourceDirectory,
} from '../../electron/shared-types'

type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

interface SeestarViewProps {
  defaultTargetDirectory: string | null
}

const PATTERN_EXAMPLE_VALUES = { object: 'M 51', type: 'LP', date: '2026.08.09', exposure: '20s' }

const PATTERN_EXAMPLES = [
  '{object}/{type}/{date} {type} {exposure}',
  '{type}/{object}/{date} {exposure}',
  '{object}/{date}/{type}',
]

function previewPatternPath(pattern: string): string {
  const filled = pattern
    .replaceAll('{object}', PATTERN_EXAMPLE_VALUES.object)
    .replaceAll('{type}', PATTERN_EXAMPLE_VALUES.type)
    .replaceAll('{date}', PATTERN_EXAMPLE_VALUES.date)
    .replaceAll('{exposure}', PATTERN_EXAMPLE_VALUES.exposure)

  const segments = filled
    .split(/[/\\]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  return segments.join(' / ')
}

export function SeestarView({ defaultTargetDirectory }: SeestarViewProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking')

  const [directories, setDirectories] = useState<SeestarSourceDirectory[] | null>(null)
  const [dirsLoading, setDirsLoading] = useState(false)
  const [dirsError, setDirsError] = useState<string | null>(null)
  const [selectedSubDirs, setSelectedSubDirs] = useState<Set<string>>(new Set())

  const [targetDirectory, setTargetDirectory] = useState<string | null>(defaultTargetDirectory)
  const [directoryPattern, setDirectoryPattern] = useState<string>(
    () => localStorage.getItem('seestarDirectoryPattern') ?? DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  )

  function handleDirectoryPatternChange(pattern: string) {
    setDirectoryPattern(pattern)
    localStorage.setItem('seestarDirectoryPattern', pattern)
  }

  const [plan, setPlan] = useState<SeestarCopyPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const [overwrite, setOverwrite] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyProgress, setCopyProgress] = useState<SeestarCopyProgress | null>(null)
  const [copyResult, setCopyResult] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)

  const checkConnection = useCallback(() => {
    setStatus('checking')
    window.astroCatalogue
      .checkSeestarConnection()
      .then((connected) => setStatus(connected ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'))
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  useEffect(() => {
    return window.astroCatalogue.onSeestarCopyProgress(setCopyProgress)
  }, [])

  const loadDirectories = useCallback(() => {
    setDirsLoading(true)
    setDirsError(null)
    setPlan(null)
    setCopyResult(null)
    window.astroCatalogue
      .listSeestarDirectories()
      .then((dirs) => {
        setDirectories(dirs)
        setSelectedSubDirs(new Set(dirs.filter((d) => d.isSub).map((d) => d.name)))
      })
      .catch((e) => setDirsError(String(e)))
      .finally(() => setDirsLoading(false))
  }, [])

  useEffect(() => {
    if (status === 'connected' && directories === null && !dirsLoading) {
      loadDirectories()
    }
  }, [status, directories, dirsLoading, loadDirectories])

  function toggleSubDir(name: string) {
    setSelectedSubDirs((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function chooseTargetDirectory() {
    const dir = await window.astroCatalogue.selectSeestarTargetDir()
    if (dir) setTargetDirectory(dir)
  }

  function buildPlan() {
    if (!targetDirectory || selectedSubDirs.size === 0) return
    setPlanLoading(true)
    setPlanError(null)
    setCopyResult(null)
    window.astroCatalogue
      .buildSeestarCopyPlan(Array.from(selectedSubDirs), targetDirectory, directoryPattern)
      .then(setPlan)
      .catch((e) => setPlanError(String(e)))
      .finally(() => setPlanLoading(false))
  }

  const newItems = useMemo(
    () => plan?.copyItems.filter((item) => overwrite || !item.alreadyExists) ?? [],
    [plan, overwrite],
  )
  const existingCount = plan?.copyItems.filter((item) => item.alreadyExists).length ?? 0

  const destinationGroups = useMemo(() => {
    const groups = new Map<string, { destinationDirectory: string; count: number }>()
    for (const item of newItems) {
      const existing = groups.get(item.destinationDirectory)
      if (existing) existing.count += 1
      else groups.set(item.destinationDirectory, { destinationDirectory: item.destinationDirectory, count: 1 })
    }
    return Array.from(groups.values()).sort((a, b) => a.destinationDirectory.localeCompare(b.destinationDirectory))
  }, [newItems])

  async function runCopy() {
    if (newItems.length === 0) return
    setCopying(true)
    setCopyError(null)
    setCopyProgress(null)
    try {
      const items: SeestarCopyItem[] = plan?.copyItems ?? []
      const result = await window.astroCatalogue.executeSeestarCopy(items, overwrite)
      setCopyResult(result.copiedCount)
      if (targetDirectory) {
        const refreshed = await window.astroCatalogue.buildSeestarCopyPlan(
          Array.from(selectedSubDirs),
          targetDirectory,
          directoryPattern,
        )
        setPlan(refreshed)
      }
    } catch (e) {
      setCopyError(String(e))
    } finally {
      setCopying(false)
    }
  }

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center">
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${status === 'checking' ? 'animate-pulse bg-slate-500' : 'bg-red-400'}`}
          />
          <span className="text-base text-slate-200">
            {status === 'checking' ? 'Checking for Seestar…' : 'Seestar not connected'}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {status === 'disconnected'
            ? String.raw`Couldn't reach \\seestar\EMMC Images\MyWorks on the network`
            : String.raw`Looking for \\seestar\EMMC Images\MyWorks`}
        </p>
        <button
          onClick={checkConnection}
          disabled={status === 'checking'}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'checking' ? 'Checking…' : 'Check again'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        Seestar connected
        <button onClick={checkConnection} className="ml-2 text-xs text-slate-500 underline hover:text-slate-300">
          re-check
        </button>
      </div>

      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Source directories</h2>
          <button
            onClick={loadDirectories}
            disabled={dirsLoading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dirsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {dirsError && <p className="text-sm text-red-300">{dirsError}</p>}

        {directories && directories.length === 0 && (
          <p className="text-sm text-slate-500">No directories found in the Seestar source folder.</p>
        )}

        {directories && directories.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-1"></th>
                  <th className="py-1">Directory</th>
                  <th className="py-1 text-right">Files</th>
                  <th className="py-1 text-right">JPG</th>
                  <th className="py-1 text-right">FIT</th>
                </tr>
              </thead>
              <tbody>
                {directories.map((dir) => (
                  <tr key={dir.name} className="border-t border-white/5">
                    <td className="py-1.5">
                      {dir.isSub && (
                        <input
                          type="checkbox"
                          checked={selectedSubDirs.has(dir.name)}
                          onChange={() => toggleSubDir(dir.name)}
                        />
                      )}
                    </td>
                    <td className="py-1.5 text-slate-200">
                      {dir.name}
                      {!dir.isSub && <span className="ml-2 text-xs text-slate-600">(not a _sub folder)</span>}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-400">{dir.totalFiles}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-400">{dir.jpgFiles}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-400">{dir.fitFiles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Target directory</h2>
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-300">
            {targetDirectory ?? 'No target directory selected'}
          </span>
          <button
            onClick={chooseTargetDirectory}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Choose…
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Import directory pattern</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={directoryPattern}
            onChange={(e) => handleDirectoryPatternChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={() => handleDirectoryPatternChange(DEFAULT_SEESTAR_DIRECTORY_PATTERN)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Use <code className="text-slate-400">/</code> to separate directory levels — each segment becomes one folder
          under the target directory.
        </p>

        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 pr-4 font-medium">Token</th>
              <th className="py-1 pr-4 font-medium">Means</th>
              <th className="py-1 font-medium">Example value</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-300">{'{object}'}</td>
              <td className="py-1 pr-4">Object name, from the source _sub folder</td>
              <td className="py-1 font-mono">M 51</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-300">{'{type}'}</td>
              <td className="py-1 pr-4">Frame type, IRCUT or LP</td>
              <td className="py-1 font-mono">LP</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-300">{'{date}'}</td>
              <td className="py-1 pr-4">Capture date, formatted YYYY.MM.DD</td>
              <td className="py-1 font-mono">2026.08.09</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-300">{'{exposure}'}</td>
              <td className="py-1 pr-4">Single-frame exposure length</td>
              <td className="py-1 font-mono">20s</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <p className="text-slate-400">Examples (for M 51, LP, 2026.08.09, 20s):</p>
          {PATTERN_EXAMPLES.map((example) => (
            <p key={example}>
              <code className="text-slate-400">{example}</code>
              {' → '}
              <code className="text-slate-300">{previewPatternPath(example)}</code>
            </p>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Preview with your current pattern:{' '}
          <code className="text-slate-300">
            {targetDirectory ?? '<target directory>'} / {previewPatternPath(directoryPattern)}
          </code>
        </p>
      </section>

      <div>
        <button
          onClick={buildPlan}
          disabled={!targetDirectory || selectedSubDirs.size === 0 || planLoading}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {planLoading ? 'Building plan…' : 'Build copy plan'}
        </button>
        {planError && <p className="mt-2 text-sm text-red-300">{planError}</p>}
      </div>

      {plan && (
        <section className="space-y-4 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sub directory summary</h2>
          {plan.subDirSummaries.map((summary) => (
            <div key={summary.name}>
              <p className="text-sm text-slate-200">{summary.name}</p>
              {summary.groups.length === 0 ? (
                <p className="pl-3 text-xs text-slate-500">No matching files.</p>
              ) : (
                <ul className="pl-3 text-xs text-slate-500">
                  {summary.groups.map((g) => (
                    <li key={`${g.targetDate}-${g.type}-${g.targetExposure}-${g.extension}`}>
                      {g.targetDate} {g.type} {g.targetExposure}: {g.count} {g.extension} files
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {plan.invalidFiles.length > 0 && (
            <div>
              <p className="text-sm text-amber-300">
                {plan.invalidFiles.length} file(s) skipped — name doesn't match the expected pattern
              </p>
              <ul className="max-h-32 overflow-y-auto pl-3 text-xs text-slate-500">
                {plan.invalidFiles.map((f) => (
                  <li key={`${f.subDirectory}/${f.fileName}`}>
                    [{f.subDirectory}] {f.fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Copy plan (.fit files)</h3>
            {destinationGroups.length === 0 ? (
              <p className="text-sm text-slate-500">No new fit files to copy.</p>
            ) : (
              <ul className="text-xs text-slate-400">
                {destinationGroups.map((g) => (
                  <li key={g.destinationDirectory}>
                    {g.count} file(s) → {g.destinationDirectory}
                  </li>
                ))}
              </ul>
            )}
            {existingCount > 0 && !overwrite && (
              <p className="mt-2 text-xs text-slate-500">
                {existingCount} fit file(s) already exist in the target and will be skipped.
              </p>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              Overwrite existing files
            </label>

            <button
              onClick={runCopy}
              disabled={copying || newItems.length === 0}
              className="mt-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copying ? 'Copying…' : `Copy ${newItems.length} fit file(s)`}
            </button>

            {copying && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
                    style={{
                      width: copyProgress ? `${Math.round((copyProgress.copied / copyProgress.total) * 100)}%` : '0%',
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {copyProgress
                    ? `${copyProgress.copied} / ${copyProgress.total} — ${copyProgress.fileName}`
                    : 'Starting…'}
                </p>
              </div>
            )}
            {copyError && <p className="mt-2 text-sm text-red-300">{copyError}</p>}
            {copyResult !== null && !copying && (
              <p className="mt-2 text-sm text-emerald-300">Copied {copyResult} fit file(s).</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
