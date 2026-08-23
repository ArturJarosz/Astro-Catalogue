import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatExposure, formatSize } from '../lib/format'
import { getObjectWarnings } from '../lib/warnings'

interface ObjectCardProps {
  object: ObjectInfo
  warnings: WarningInfo[]
  onClick: () => void
}

export function ObjectCard({ object, warnings, onClick }: ObjectCardProps) {
  const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
  const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
  const grandTotalSize = object.frameTypes.reduce((sum, ft) => sum + ft.totalSizeBytes, 0)
  const objectWarnings = getObjectWarnings(object, warnings)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer rounded-lg border border-white/20 bg-slate-800 p-3 shadow-md transition hover:border-white/30 hover:bg-slate-700"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-100">
          <span className="truncate">
            {object.name}
            {object.isMosaic && <span className="text-slate-400"> (Mosaic)</span>}
          </span>
          {objectWarnings.length > 0 && (
            <span
              className="flex shrink-0 items-center gap-0.5 text-amber-400"
              title={`${objectWarnings.length} warning${objectWarnings.length === 1 ? '' : 's'}`}
            >
              <span>⚠</span>
              <span className="text-xs font-medium tabular-nums">{objectWarnings.length}</span>
            </span>
          )}
        </h3>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-white">
          {grandTotalFrames} frames · {formatExposure(grandTotalExposure)} · {formatSize(grandTotalSize)}
        </span>
      </div>

      {object.frameTypes.length === 0 ? (
        <p className="text-xs text-slate-500">No frame-type folders found</p>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 rounded-md bg-black/20 px-2 py-1.5 text-xs tabular-nums">
          {object.frameTypes.map((ft) => (
            <div className="contents" key={ft.name}>
              <span className="font-medium text-slate-300">{ft.name}</span>
              <span className="text-right text-slate-200">{ft.totalFrames} frames</span>
              <span className="text-right text-slate-200">{formatExposure(ft.totalExposureSeconds)}</span>
              <span className="text-right text-slate-400">{formatSize(ft.totalSizeBytes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
