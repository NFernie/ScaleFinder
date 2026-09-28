import { destinationPoint, haversineM } from './projection'
import { LngLat } from './types'

const toRad = (degrees: number) => (degrees * Math.PI) / 180

export type BoxShape = 'rectangle' | 'square'

export interface SquareDraft {
  status: 'origin' | 'ready'
  shape: BoxShape
  origin: LngLat | null
  opposite: LngLat | null
  message: string | null
}

export function beginSquare(): SquareDraft {
  return { status: 'origin', shape: 'rectangle', origin: null, opposite: null, message: null }
}

export function setSquareShape(draft: SquareDraft, shape: BoxShape): SquareDraft {
  if (draft.status !== 'origin') return draft
  return { ...draft, shape }
}

export function setSquareOrigin(draft: SquareDraft, origin: LngLat): SquareDraft {
  if (draft.status !== 'origin' || draft.origin) return draft
  return { ...draft, origin: { lng: origin.lng, lat: origin.lat }, message: null }
}

export function setSquareOpposite(draft: SquareDraft, opposite: LngLat): SquareDraft {
  if (!draft.origin || draft.status !== 'origin') return draft
  const corners = squareCorners(draft.origin, opposite, draft.shape)
  if (!corners) return { ...draft, message: 'The box is too small.' }
  return {
    ...draft,
    status: 'ready',
    opposite: { lng: opposite.lng, lat: opposite.lat },
    message: null,
  }
}

export function squareCorners(origin: LngLat, opposite: LngLat, shape: BoxShape): LngLat[] | null {
  const offset = eastNorth(origin, opposite)
  let east = offset.east
  let north = offset.north
  if (shape === 'square') {
    const side = Math.max(Math.abs(east), Math.abs(north))
    if (side < 1) return null
    east = Math.sign(east || 1) * side
    north = Math.sign(north || 1) * side
  } else if (Math.abs(east) < 1 || Math.abs(north) < 1) {
    return null
  }
  const eastPoint = destinationPoint(origin, Math.abs(east), east >= 0 ? 90 : 270)
  const far = destinationPoint(eastPoint, Math.abs(north), north >= 0 ? 0 : 180)
  const northPoint = destinationPoint(origin, Math.abs(north), north >= 0 ? 0 : 180)
  return [origin, eastPoint, far, northPoint]
}

function eastNorth(origin: LngLat, point: LngLat): { east: number; north: number } {
  const distance = haversineM(origin, point)
  if (distance === 0) return { east: 0, north: 0 }
  const φ1 = toRad(origin.lat)
  const φ2 = toRad(point.lat)
  const Δλ = toRad(point.lng - origin.lng)
  const east = Math.sin(Δλ) * Math.cos(φ2)
  const north = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const bearing = Math.atan2(east, north)
  return { east: distance * Math.sin(bearing), north: distance * Math.cos(bearing) }
}
