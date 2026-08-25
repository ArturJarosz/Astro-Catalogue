import deepSkyCoordinates from './data/deepSkyCoordinates.json'

export interface CelestialCoordinates {
  raDeg: number
  decDeg: number
}

const coordinatesByKey = deepSkyCoordinates as Record<string, CelestialCoordinates>

/** Looks up J2000 RA/Dec for a catalogued object. Returns null if no data is bundled for it. */
export function getObjectCoordinates(catalog: string, catalogNumber: number | null): CelestialCoordinates | null {
  if (catalogNumber === null) return null
  return coordinatesByKey[`${catalog}:${catalogNumber}`] ?? null
}
