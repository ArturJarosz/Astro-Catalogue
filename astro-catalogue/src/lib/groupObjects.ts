import type { ObjectInfo } from '../../electron/shared-types'

const CATALOG_ORDER = ['Messier', 'Caldwell', 'NGC', 'IC', 'Abell', 'Other']

export interface ObjectGroup {
  catalog: string
  objects: ObjectInfo[]
}

function catalogRank(catalog: string): number {
  const index = CATALOG_ORDER.indexOf(catalog)
  if (index !== -1) return index
  return CATALOG_ORDER.indexOf('Other')
}

export function groupObjectsByCatalog(objects: ObjectInfo[]): ObjectGroup[] {
  const buckets = new Map<string, ObjectInfo[]>()

  for (const object of objects) {
    const bucket = buckets.get(object.catalog)
    if (bucket) {
      bucket.push(object)
    } else {
      buckets.set(object.catalog, [object])
    }
  }

  const groups: ObjectGroup[] = Array.from(buckets.entries()).map(([catalog, catalogObjects]) => ({
    catalog,
    objects: [...catalogObjects].sort((a, b) => {
      if (a.catalogNumber !== null && b.catalogNumber !== null && a.catalogNumber !== b.catalogNumber) {
        return a.catalogNumber - b.catalogNumber
      }
      return a.name.localeCompare(b.name)
    }),
  }))

  groups.sort((a, b) => {
    const rankDiff = catalogRank(a.catalog) - catalogRank(b.catalog)
    if (rankDiff !== 0) return rankDiff
    return a.catalog.localeCompare(b.catalog)
  })

  return groups
}
