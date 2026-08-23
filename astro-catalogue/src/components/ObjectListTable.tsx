import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatExposure, formatSize } from '../lib/format'
import { getObjectWarnings } from '../lib/warnings'
import { ObjectThumbnail } from './ObjectThumbnail'

interface ObjectListTableProps {
  objects: ObjectInfo[]
  warnings: WarningInfo[]
  onSelect: (object: ObjectInfo) => void
  showThumbnails?: boolean
}

export function ObjectListTable({ objects, warnings, onSelect, showThumbnails = false }: ObjectListTableProps) {
  const frameTypeNames = Array.from(new Set(objects.flatMap((o) => o.frameTypes.map((ft) => ft.name)))).sort()

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            {showThumbnails && <th className="w-10 px-3 py-2"></th>}
            <th className="px-3 py-2 text-left font-medium">Object</th>
            {frameTypeNames.map((name) => (
              <th key={name} className="whitespace-nowrap px-3 py-2 text-right font-medium">
                {name}
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((object) => {
            const objectWarnings = getObjectWarnings(object, warnings)
            const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
            const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
            const grandTotalSize = object.frameTypes.reduce((sum, ft) => sum + ft.totalSizeBytes, 0)
            const frameTypeByName = new Map(object.frameTypes.map((ft) => [ft.name, ft]))

            return (
              <tr
                key={object.path}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(object)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(object)
                  }
                }}
                className="cursor-pointer border-b border-white/5 bg-slate-800 transition last:border-b-0 hover:bg-slate-700"
              >
                {showThumbnails && (
                  <td className="px-3 py-2">
                    <ObjectThumbnail object={object} />
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-100">
                    <span className="truncate">
                      {object.name}
                      {object.isMosaic && <span className="text-slate-400"> (Mosaic)</span>}
                    </span>
                    {objectWarnings.length > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-0.5 text-xs text-amber-400"
                        title={`${objectWarnings.length} warning${objectWarnings.length === 1 ? '' : 's'}`}
                      >
                        <span>⚠</span>
                        <span className="font-medium tabular-nums">{objectWarnings.length}</span>
                      </span>
                    )}
                  </span>
                </td>
                {frameTypeNames.map((name) => {
                  const ft = frameTypeByName.get(name)
                  return (
                    <td
                      key={name}
                      className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-300"
                    >
                      {ft ? (
                        <>
                          {ft.totalFrames} frames · {formatExposure(ft.totalExposureSeconds)} ·{' '}
                          {formatSize(ft.totalSizeBytes)}
                        </>
                      ) : (
                        <span className="text-slate-600">–</span>
                      )}
                    </td>
                  )
                })}
                <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] font-bold tabular-nums text-white">
                  {grandTotalFrames} frames · {formatExposure(grandTotalExposure)} · {formatSize(grandTotalSize)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
