import { centroid } from './geometry'
import { destinationPoint, haversineM } from './projection'
import { LngLat, Vertex } from './types'

const toRad = (degrees: number) => (degrees * Math.PI) / 180
const toDeg = (radians: number) => (radians * 180) / Math.PI

export interface RingDraft {
  sourceName: string
  raw: Vertex[]
  unit: 'm'
  hasZ: false
  anchor: LngLat
  /** Set when the outline is more than one patch. */
  parts?: Vertex[][]
  fixed?: boolean
  pairId?: string
}

export function ringToDraft(corners: LngLat[], sourceName: string): RingDraft | null {
  if (corners.length < 3) return null
  const raw = corners.map((corner) => offsetMetres(corners[0], corner))
  return {
    sourceName,
    raw,
    unit: 'm',
    hasZ: false,
    anchor: geographicCentroid(corners[0], raw),
  }
}

/** One or more colour rings, sharing the drawn centre. The guide is not included. */
export function ringsToDraft(rings: LngLat[][], sourceName: string): RingDraft | null {
  const usable = rings.filter((ring) => ring.length >= 3)
  if (usable.length === 0) return null
  if (usable.length === 1) return ringToDraft(usable[0], sourceName)
  const origin = usable[0][0]
  const parts = usable.map((ring) => ring.map((corner) => offsetMetres(origin, corner)))
  const raw = parts.flat()
  return {
    sourceName,
    raw,
    parts,
    unit: 'm',
    hasZ: false,
    anchor: geographicCentroid(origin, raw),
  }
}

function geographicCentroid(origin: LngLat, points: Vertex[]): LngLat {
  const centre = centroid(points)
  const distance = Math.hypot(centre.x, centre.y)
  if (distance === 0) return { lng: origin.lng, lat: origin.lat }
  const bearing = (toDeg(Math.atan2(centre.x, centre.y)) + 360) % 360
  return destinationPoint(origin, distance, bearing)
}

function offsetMetres(origin: LngLat, point: LngLat): Vertex {
  const distance = haversineM(origin, point)
  if (distance === 0) return { x: 0, y: 0 }
  const φ1 = toRad(origin.lat)
  const φ2 = toRad(point.lat)
  const Δλ = toRad(point.lng - origin.lng)
  const east = Math.sin(Δλ) * Math.cos(φ2)
  const north = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const bearing = Math.atan2(east, north)
  return { x: distance * Math.sin(bearing), y: distance * Math.cos(bearing) }
}
