import { DEFAULT_SEESTAR_DIRECTORY_PATTERN } from '../../electron/shared-types'

interface ConfigurationViewProps {
  directoryPattern: string
  onDirectoryPatternChange: (pattern: string) => void
  targetDirectory: string | null
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

export function ConfigurationView({ directoryPattern, onDirectoryPatternChange, targetDirectory }: ConfigurationViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Directory pattern</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={directoryPattern}
            onChange={(e) => onDirectoryPatternChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={() => onDirectoryPatternChange(DEFAULT_SEESTAR_DIRECTORY_PATTERN)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Used both when importing from the Seestar and when analyzing your catalogue's root directory — it defines the
          folder layout that lays out each object's frames. Use <code className="text-slate-400">/</code> to separate
          directory levels — each segment becomes one folder.
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
    </div>
  )
}
