import { formatTimestamp } from '../lib/format'

interface HeaderProps {
  rootPath: string | null
  lastScannedAt: string | null
  scanning: boolean
  scanProgressLabel: string | null
  onSelectRoot: () => void
  onAnalyze: () => void
}

export function Header({
  rootPath,
  lastScannedAt,
  scanning,
  scanProgressLabel,
  onSelectRoot,
  onAnalyze,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-sky-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Astro Catalogue
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {rootPath ? (
              <span className="font-mono text-slate-300">{rootPath}</span>
            ) : (
              'No root directory selected'
            )}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex gap-2">
            <button
              onClick={onSelectRoot}
              disabled={scanning}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select Root Directory
            </button>
            <button
              onClick={onAnalyze}
              disabled={scanning || !rootPath}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {scanning && scanProgressLabel ? scanProgressLabel : `Last scanned: ${formatTimestamp(lastScannedAt)}`}
          </p>
        </div>
      </div>
    </header>
  )
}
