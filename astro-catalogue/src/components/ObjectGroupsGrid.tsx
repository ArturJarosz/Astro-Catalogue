import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatMetrics, type MetricKey } from '../lib/columns'
import type { ObjectGroup } from '../lib/groupObjects'
import type { AltitudeListMetric, MoonListMetric, NightMoonTrackSample } from '../lib/moonSeparation'
import type { SeestarModel } from '../lib/seestarModel'
import type { ObservingLocation } from './MoonPanel'
import { ObjectCard } from './ObjectCard'
import { ObjectListTable } from './ObjectListTable'
import type { ViewMode } from './ViewToggle'

interface ObjectGroupsGridProps {
  groups: ObjectGroup[]
  viewMode: ViewMode
  warnings: WarningInfo[]
  onSelectObject: (object: ObjectInfo) => void
  visibleFrameTypes: Set<string>
  showTotal: boolean
  visibleMetrics: Set<MetricKey>
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  moonRatingEnabled: boolean
  moonGoodThresholdDeg: number
  moonPerfectThresholdDeg: number
  altitudeRatingEnabled: boolean
  altitudeGoodThresholdDeg: number
  altitudePerfectThresholdDeg: number
  moonListMetric: MoonListMetric
  altitudeListMetric: AltitudeListMetric
  isPlanning: boolean
  seestarModel: SeestarModel
  frameFitRatingEnabled: boolean
  frameFitGoodThresholdPercent: number
  frameFitMosaicThresholdPercent: number
  frameFitTooBigThresholdPercent: number
}

/**
 * Renders a list of catalog groups as either the card grid or the table view, with every
 * frame-type/Moon/altitude/frame-fit prop plumbed through. Shared by the Catalogue tab and
 * both halves of the Planning tab ("Already in catalogue" and "Propositions") so the three
 * places an object list is rendered never drift apart.
 */
export function ObjectGroupsGrid({
  groups,
  viewMode,
  warnings,
  onSelectObject,
  visibleFrameTypes,
  showTotal,
  visibleMetrics,
  observingLocation,
  nightMoonTrack,
  moonRatingEnabled,
  moonGoodThresholdDeg,
  moonPerfectThresholdDeg,
  altitudeRatingEnabled,
  altitudeGoodThresholdDeg,
  altitudePerfectThresholdDeg,
  moonListMetric,
  altitudeListMetric,
  isPlanning,
  seestarModel,
  frameFitRatingEnabled,
  frameFitGoodThresholdPercent,
  frameFitMosaicThresholdPercent,
  frameFitTooBigThresholdPercent,
}: ObjectGroupsGridProps) {
  return (
    <div className="space-y-10">
      {groups.map((group) => {
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
                    visibleMetrics,
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
                    warnings={warnings}
                    onClick={() => onSelectObject(object)}
                    visibleFrameTypes={visibleFrameTypes}
                    showTotal={showTotal}
                    visibleMetrics={visibleMetrics}
                    observingLocation={observingLocation}
                    nightMoonTrack={nightMoonTrack}
                    moonRatingEnabled={moonRatingEnabled}
                    moonGoodThresholdDeg={moonGoodThresholdDeg}
                    moonPerfectThresholdDeg={moonPerfectThresholdDeg}
                    altitudeRatingEnabled={altitudeRatingEnabled}
                    altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
                    altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
                    isPlanning={isPlanning}
                    seestarModel={seestarModel}
                    frameFitRatingEnabled={frameFitRatingEnabled}
                    frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                    frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                    frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
                  />
                ))}
              </div>
            ) : (
              <ObjectListTable
                objects={group.objects}
                warnings={warnings}
                onSelect={onSelectObject}
                showThumbnails={viewMode === 'thumbnail-list'}
                visibleFrameTypes={visibleFrameTypes}
                showTotal={showTotal}
                visibleMetrics={visibleMetrics}
                observingLocation={observingLocation}
                nightMoonTrack={nightMoonTrack}
                moonRatingEnabled={moonRatingEnabled}
                moonGoodThresholdDeg={moonGoodThresholdDeg}
                moonPerfectThresholdDeg={moonPerfectThresholdDeg}
                altitudeRatingEnabled={altitudeRatingEnabled}
                altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
                altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
                moonListMetric={moonListMetric}
                altitudeListMetric={altitudeListMetric}
                isPlanning={isPlanning}
                seestarModel={seestarModel}
                frameFitRatingEnabled={frameFitRatingEnabled}
                frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}
