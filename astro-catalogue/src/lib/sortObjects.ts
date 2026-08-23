import type { ObjectInfo } from '../../electron/shared-types'
import { getLastSessionDate, getTotalExposureSeconds } from './objectStats'

export type SortKey = 'name' | 'exposure' | 'lastSession'
export type SortDirection = 'asc' | 'desc'

export function compareObjects(a: ObjectInfo, b: ObjectInfo, sortKey: SortKey, sortDirection: SortDirection): number {
  let cmp: number
  if (sortKey === 'name') {
    cmp = a.name.localeCompare(b.name)
  } else if (sortKey === 'exposure') {
    cmp = getTotalExposureSeconds(a) - getTotalExposureSeconds(b)
  } else {
    cmp = (getLastSessionDate(a) ?? '').localeCompare(getLastSessionDate(b) ?? '')
  }
  return sortDirection === 'asc' ? cmp : -cmp
}
