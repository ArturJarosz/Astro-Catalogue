import { useMemo } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'
import { getMoonSeparationForObject, type NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import type { ObservingLocation } from './MoonPanel'

interface MoonSeparationDetailProps {
  object: ObjectInfo
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Unconditional (unlike MoonSeparationBadge) Moon-distance readout for the
 * Planning view, where it replaces the frame-type breakdown as the card's
 * main content — the point of that tab is deciding whether the Moon rules a
 * target out, not how many subs you already have.
 */
export function MoonSeparationDetail({ object, observingLocation, nightMoonTrack }: MoonSeparationDetailProps) {
  const coordinates = useMemo(
    () => getObjectCoordinates(object.catalog, object.catalogNumber),
    [object.catalog, object.catalogNumber],
  )

  const result = useMemo(() => {
    if (!observingLocation || !nightMoonTrack || !coordinates) return null
    return getMoonSeparationForObject(
      nightMoonTrack,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [observingLocation, nightMoonTrack, coordinates])

  if (!observingLocation) {
    return <p className="text-xs text-slate-500">Set an observing location in Configuration → Planning.</p>
  }
  if (!coordinates) {
    return <p className="text-xs text-slate-500">No coordinate data available for this object.</p>
  }
  if (!result) {
    return <p className="text-xs text-slate-500">Not above the horizon tonight.</p>
  }

  return (
    <div className="space-y-1.5">
      <div className="rounded-md bg-black/20 px-2 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>🌙</span>
          <span className="tabular-nums">
            Closest <span className="font-semibold text-slate-100">{Math.round(result.minSeparationDeg)}°</span> at{' '}
            {formatTime(result.minSeparationTime)}
          </span>
        </div>
        <div className="mt-0.5 tabular-nums text-slate-500">Averages {Math.round(result.avgSeparationDeg)}° while up tonight</div>
      </div>
      <div className="rounded-md bg-black/20 px-2 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>⬆</span>
          <span className="tabular-nums">
            Max height <span className="font-semibold text-slate-100">{Math.round(result.maxAltitudeDeg)}°</span>
          </span>
        </div>
        <div className="mt-0.5 tabular-nums text-slate-500">Averages {Math.round(result.avgAltitudeDeg)}° while up tonight</div>
      </div>
    </div>
  )
}
