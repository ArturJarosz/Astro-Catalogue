import { useState } from 'react'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  DEFAULT_SEESTAR_SOURCE_DIR_LINUX,
  DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS,
} from '../../electron/shared-types'
import type { ObservingLocation } from './MoonPanel'

interface ConfigurationViewProps {
  directoryPattern: string
  onDirectoryPatternChange: (pattern: string) => void
  targetDirectory: string | null
  observingLocation: ObservingLocation | null
  onObservingLocationChange: (location: ObservingLocation) => void
  moonPanelNights: number
  onMoonPanelNightsChange: (nights: number) => void
  highlightTonight: boolean
  onHighlightTonightChange: (highlight: boolean) => void
  showMoonPanel: boolean
  onShowMoonPanelChange: (show: boolean) => void
  moonCautionThresholdDeg: number
  onMoonCautionThresholdDegChange: (deg: number) => void
  moonCloseThresholdDeg: number
  onMoonCloseThresholdDegChange: (deg: number) => void
  seestarSourceDirectory: string
  onSeestarSourceDirectoryChange: (directory: string) => void
}

type ConfigTab = 'general' | 'planning'

const CONFIG_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'planning', label: 'Planning' },
]

const MOON_PANEL_NIGHTS_OPTIONS = [3, 5, 7, 10, 14]

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

export function ConfigurationView({
  directoryPattern,
  onDirectoryPatternChange,
  targetDirectory,
  observingLocation,
  onObservingLocationChange,
  moonPanelNights,
  onMoonPanelNightsChange,
  highlightTonight,
  onHighlightTonightChange,
  showMoonPanel,
  onShowMoonPanelChange,
  moonCautionThresholdDeg,
  onMoonCautionThresholdDegChange,
  moonCloseThresholdDeg,
  onMoonCloseThresholdDegChange,
  seestarSourceDirectory,
  onSeestarSourceDirectoryChange,
}: ConfigurationViewProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general')
  const [latInput, setLatInput] = useState(observingLocation ? String(observingLocation.latitude) : '')
  const [lonInput, setLonInput] = useState(observingLocation ? String(observingLocation.longitude) : '')
  const [sourceDirectoryInput, setSourceDirectoryInput] = useState(seestarSourceDirectory)
  const sourceDirectoryDirty = sourceDirectoryInput !== seestarSourceDirectory

  function handleCautionThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onMoonCautionThresholdDegChange(deg)
  }

  function handleCloseThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onMoonCloseThresholdDegChange(deg)
  }

  function applySourceDirectory() {
    const trimmed = sourceDirectoryInput.trim()
    if (!trimmed) return
    onSeestarSourceDirectoryChange(trimmed)
  }

  function handleSaveLocation() {
    const latitude = Number.parseFloat(latInput)
    const longitude = Number.parseFloat(lonInput)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return
    onObservingLocationChange({ latitude, longitude })
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = Number(position.coords.latitude.toFixed(4))
      const longitude = Number(position.coords.longitude.toFixed(4))
      setLatInput(String(latitude))
      setLonInput(String(longitude))
      onObservingLocationChange({ latitude, longitude })
    })
  }

  return (
    <div className="flex gap-8">
      <nav className="w-40 shrink-0 space-y-1">
        {CONFIG_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white/10 text-slate-100'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
      {activeTab === 'general' && (
      <>
      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Seestar source path</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={sourceDirectoryInput}
            onChange={(e) => setSourceDirectoryInput(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={applySourceDirectory}
            disabled={!sourceDirectoryDirty || sourceDirectoryInput.trim() === ''}
            className="shrink-0 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          The folder the app reads from when checking the Seestar connection and importing photos — this is where
          your Seestar exposes its <code className="text-slate-400">MyWorks</code> folder, either as a network share
          or a mounted/mapped local path.
        </p>
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <p>
            <span className="text-slate-400">Recommended on Windows:</span>{' '}
            <code className="text-slate-300">{DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS}</code>
            {' — '}the Seestar's SMB share addressed directly by its hostname.
          </p>
          <p>
            <span className="text-slate-400">Recommended on Linux:</span>{' '}
            <code className="text-slate-300">{DEFAULT_SEESTAR_SOURCE_DIR_LINUX}</code>
            {' — '}mount the same SMB share first (e.g. with <code className="text-slate-400">gvfs</code> or a{' '}
            <code className="text-slate-400">cifs</code> mount) and point this at the mount point.
          </p>
        </div>
      </section>

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
      </>
      )}

      {activeTab === 'planning' && (
      <>
      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Moon Panel</h2>
        <p className="mb-3 text-xs text-slate-500">
          Controls the "Next Good Nights" panel on the Catalogue tab, which shows moon illumination and rise/set
          times.
        </p>

        <label className="mb-4 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={showMoonPanel}
            onChange={(e) => onShowMoonPanelChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Show the Moon Panel on the Catalogue tab
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Latitude
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="e.g. 51.5074"
              className="w-32 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Longitude
            <input
              type="text"
              inputMode="decimal"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              placeholder="e.g. -0.1278"
              className="w-32 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
          <button
            onClick={handleSaveLocation}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Save
          </button>
          <button
            onClick={handleUseCurrentLocation}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Use current location
          </button>
        </div>

        {observingLocation && (
          <p className="mt-2 text-xs text-slate-500">
            Currently set to{' '}
            <code className="text-slate-300">
              {observingLocation.latitude}, {observingLocation.longitude}
            </code>
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs text-slate-400" htmlFor="moon-panel-nights">
            Nights to show
          </label>
          <select
            id="moon-panel-nights"
            value={moonPanelNights}
            onChange={(e) => onMoonPanelNightsChange(Number(e.target.value))}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            {MOON_PANEL_NIGHTS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={highlightTonight}
            onChange={(e) => onHighlightTonightChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Highlight tonight's row with a larger font
        </label>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Moon distance badge</h2>
        <p className="mb-3 text-xs text-slate-500">
          Controls the 🌙 Moon-distance badge shown on catalogue objects, and its color, based on how close the Moon
          comes to a target while it's up tonight.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Caution distance (°)
            <input
              type="number"
              min={0}
              max={180}
              step={1}
              value={moonCautionThresholdDeg}
              onChange={(e) => handleCautionThresholdChange(e.target.value)}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Close distance (°)
            <input
              type="number"
              min={0}
              max={180}
              step={1}
              value={moonCloseThresholdDeg}
              onChange={(e) => handleCloseThresholdChange(e.target.value)}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          A badge appears when the Moon comes within the caution distance; it turns red once it's within the close
          distance.
        </p>
      </section>
      </>
      )}
      </div>
    </div>
  )
}
