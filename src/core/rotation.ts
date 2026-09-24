import { centroid } from './geometry'
import { projectToGeographic } from './projection'
import { LngLat, Vertex } from './types'

export interface ReferenceEdge {
  part: number
  edge: number
}

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

export function wrapBearing(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/** Shortest signed turn from one compass bearing to another, in degrees. */
export function bearingDelta(from: number, to: number): number {
  const delta = wrapBearing(to - from)
  return delta > 180 ? delta - 360 : delta
}

/** Compass bearing clockwise from north, from `start` to `end`. */
export function initialBearing(start: LngLat, end: LngLat): number {
  const lat1 = toRad(start.lat)
  const lat2 = toRad(end.lat)
  const dLng = toRad(end.lng - start.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return wrapBearing(toDeg(Math.atan2(y, x)))
}

/** Turn corners clockwise around `origin`. Lengths from the origin stay the same. */
export function rotateAround(points: Vertex[], origin: Vertex, degrees: number): Vertex[] {
  if (degrees === 0) return points
  const theta = toRad(degrees)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return points.map((point) => {
    const dx = point.x - origin.x
    const dy = point.y - origin.y
    return {
      x: origin.x + dx * cos + dy * sin,
      y: origin.y - dx * sin + dy * cos,
      z: point.z,
    }
  })
}

export function turnedParts(parts: Vertex[][], degrees: number): Vertex[][] {
  const origin = centroid(parts.flat())
  return parts.map((part) => rotateAround(part, origin, degrees))
}

function placedParts(parts: Vertex[][], anchor: LngLat, degrees: number): LngLat[][] {
  const turned = turnedParts(parts, degrees)
  const origin = centroid(turned.flat())
  return turned.map((part) => projectToGeographic(part, anchor, origin))
}

function edgeLength(part: Vertex[], edge: number): number {
  const start = part[edge]
  const end = part[edge + 1]
  if (!start || !end) return 0
  return Math.hypot(end.x - start.x, end.y - start.y)
}

/** The open edge closest to true north. A tie keeps the earliest part, then the earliest edge. */
export function chooseReferenceEdge(parts: Vertex[][], anchor: LngLat): ReferenceEdge | null {
  const placed = placedParts(parts, anchor, 0)
  let best: ReferenceEdge | null = null
  let bestDistance = Infinity
  parts.forEach((part, partIndex) => {
    for (let edge = 0; edge < part.length - 1; edge += 1) {
      if (edgeLength(part, edge) === 0) continue
      const ring = placed[partIndex]
      const bearing = initialBearing(ring[edge], ring[edge + 1])
      const distance = Math.min(bearing, 360 - bearing)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { part: partIndex, edge }
      }
    }
  })
  return best
}

export function measureEdgeBearing(
  parts: Vertex[][],
  anchor: LngLat,
  degrees: number,
  reference: ReferenceEdge,
): number | null {
  const part = parts[reference.part]
  if (!part || edgeLength(part, reference.edge) === 0) return null
  const ring = placedParts(parts, anchor, degrees)[reference.part]
  return initialBearing(ring[reference.edge], ring[reference.edge + 1])
}

/** Rotation that puts the locked edge on `target` degrees, within a tenth of a degree. */
export function rotationForBearing(
  parts: Vertex[][],
  anchor: LngLat,
  rotationDeg: number,
  reference: ReferenceEdge,
  target: number,
): number {
  let rotation = rotationDeg
  for (let step = 0; step < 4; step += 1) {
    const measured = measureEdgeBearing(parts, anchor, rotation, reference)
    if (measured === null) return rotationDeg
    const delta = bearingDelta(measured, target)
    if (Math.abs(delta) < 0.05) break
    rotation = wrapBearing(rotation + delta)
  }
  return rotation
}

export interface RotationState {
  rotationDeg: number
  referenceEdge: ReferenceEdge
  originalBearing: number
}

/** Bearing and locked edge for a Polygon that has just been added. */
export function rotationState(parts: Vertex[][], anchor: LngLat): RotationState | null {
  const referenceEdge = chooseReferenceEdge(parts, anchor)
  if (!referenceEdge) return null
  const originalBearing = measureEdgeBearing(parts, anchor, 0, referenceEdge)
  if (originalBearing === null) return null
  return { rotationDeg: 0, referenceEdge, originalBearing }
}

/** A typed bearing from 0 up to but not including 360. Anything else is refused. */
export function commitBearing(typed: string): number | null {
  const trimmed = typed.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0 || value >= 360) return null
  return value
}
