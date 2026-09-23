import { centroid } from './geometry'
import { LngLat, Vertex } from './types'

const EARTH_RADIUS_M = 6_371_008.8
const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/**
 * Great-circle destination point: start at `origin`, travel `distanceM` metres
 * along `bearingDeg` (clockwise from true north). Spherical direct formula.
 */
export function destinationPoint(
  origin: LngLat,
  distanceM: number,
  bearingDeg: number,
): LngLat {
  const angular = distanceM / EARTH_RADIUS_M
  const bearing = toRad(bearingDeg)
  const lat1 = toRad(origin.lat)
  const lon1 = toRad(origin.lng)

  const sinLat2 =
    Math.sin(lat1) * Math.cos(angular) +
    Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)))
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * sinLat2,
    )

  return {
    lng: ((toDeg(lon2) + 540) % 360) - 180,
    lat: toDeg(lat2),
  }
}

/** Great-circle distance between two geographic points, in metres (haversine). */
export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Place a local projected polygon (metres) onto the globe so that its centroid
 * sits at `anchor`, preserving true ground distances. Each vertex's east/north
 * offset from the centroid becomes a geodesic bearing + distance from `anchor`.
 *
 * Because distances are geodesic, the overlay is true-scale at any latitude,
 * independent of the Web Mercator distortion MapLibre uses to render it.
 */
export function projectToGeographic(
  points: Vertex[],
  anchor: LngLat,
  origin?: Vertex,
): LngLat[] {
  const c = origin ?? centroid(points)
  return points.map((p) => {
    const dx = p.x - c.x // metres east
    const dy = p.y - c.y // metres north
    const distance = Math.hypot(dx, dy)
    if (distance === 0) return { ...anchor }
    // bearing clockwise from north
    const bearingDeg = (toDeg(Math.atan2(dx, dy)) + 360) % 360
    return destinationPoint(anchor, distance, bearingDeg)
  })
}

/** Convenience: build a GeoJSON polygon ring ([lng, lat] pairs, closed). */
export function toGeoJsonRing(coords: LngLat[]): [number, number][] {
  const ring = coords.map((c) => [c.lng, c.lat] as [number, number])
  if (ring.length > 0) ring.push(ring[0])
  return ring
}
