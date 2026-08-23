import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatExposure } from '../lib/format'
import { getObjectWarnings } from '../lib/warnings'

interface ObjectCardProps {
  object: ObjectInfo
  warnings: WarningInfo[]
  onClick: () => void
}

export function ObjectCard({ object, warnings, onClick }: ObjectCardProps) {
  const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
  const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
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
      className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] p-3 shadow-sm transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-100">
          <span className="truncate">{object.name}</span>
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
        {object.isMosaic && (
          <span className="shrink-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
            Mosaic
          </span>
        )}
      </div>

      {object.frameTypes.length === 0 ? (
        <p className="text-xs text-slate-500">No frame-type folders found</p>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 rounded-md bg-black/20 px-2 py-1.5 text-xs tabular-nums">
          {object.frameTypes.map((ft) => (
            <div className="contents" key={ft.name}>
              <span className="font-medium text-slate-300">{ft.name}</span>
              <span className="text-right text-slate-200">{ft.totalFrames} frames</span>
              <span className="text-right text-slate-200">{formatExposure(ft.totalExposureSeconds)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-white/5 pt-2 text-[11px] tabular-nums text-slate-500">
        <span>Total</span>
        <span className="text-right">{grandTotalFrames} frames</span>
        <span className="text-right">{formatExposure(grandTotalExposure)}</span>
      </div>
    </div>
  )
}
