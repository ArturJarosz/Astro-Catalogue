import { useMemo } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'
import { getMoonSeparationForObject, type NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import type { ObservingLocation } from './MoonPanel'

interface MoonSeparationBadgeProps {
  object: ObjectInfo
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  /** Below this separation (deg), the badge is shown at all. */
  cautionThresholdDeg: number
  /** Below this separation (deg), the badge is shown in its more severe color. */
  closeThresholdDeg: number
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Small badge flagging targets the Moon comes close to while they're up tonight. */
export function MoonSeparationBadge({
  object,
  observingLocation,
  nightMoonTrack,
  cautionThresholdDeg,
  closeThresholdDeg,
}: MoonSeparationBadgeProps) {
  const result = useMemo(() => {
    if (!observingLocation || !nightMoonTrack) return null
    const coordinates = getObjectCoordinates(object.catalog, object.catalogNumber)
    if (!coordinates) return null
    return getMoonSeparationForObject(
      nightMoonTrack,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [object.catalog, object.catalogNumber, observingLocation, nightMoonTrack])

  if (!result || result.minSeparationDeg > cautionThresholdDeg) return null

  const isClose = result.minSeparationDeg < closeThresholdDeg

  return (
    <span
      className={`flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums ${isClose ? 'text-rose-400' : 'text-amber-400'}`}
      title={`Moon comes within ${Math.round(result.minSeparationDeg)}° at ${formatTime(result.minSeparationTime)} tonight — averages ${Math.round(result.avgSeparationDeg)}° while up`}
    >
      <span>🌙</span>
      <span>{Math.round(result.minSeparationDeg)}°</span>
      <span className="font-normal text-slate-500">avg {Math.round(result.avgSeparationDeg)}°</span>
    </span>
  )
}
