import type { ObjectInfo } from '../../electron/shared-types'
import { formatExposure } from '../lib/format'

interface ObjectCardProps {
  object: ObjectInfo
}

export function ObjectCard({ object }: ObjectCardProps) {
  const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
  const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">{object.name}</h3>
        {object.isMosaic && (
          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
            Mosaic
          </span>
        )}
      </div>

      {object.frameTypes.length === 0 ? (
        <p className="text-sm text-slate-500">No frame-type folders found</p>
      ) : (
        <div className="space-y-2">
          {object.frameTypes.map((ft) => (
            <div
              key={ft.name}
              className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-300">{ft.name}</span>
              <span className="text-slate-400">
                <span className="text-slate-200">{ft.totalFrames}</span> frames &middot;{' '}
                <span className="text-slate-200">{formatExposure(ft.totalExposureSeconds)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end border-t border-white/5 pt-3 text-xs text-slate-500">
        Total: {grandTotalFrames} frames &middot; {formatExposure(grandTotalExposure)}
      </div>
    </div>
  )
}
