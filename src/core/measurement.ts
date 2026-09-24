import { centroid, polygonAreaM2 } from './geometry'
import { destinationPoint, haversineM } from './projection'
import { LngLat, Vertex } from './types'

const toRad = (degrees: number) => (degrees * Math.PI) / 180
const toDeg = (radians: number) => (radians * 180) / Math.PI

export type MeasurementStatus = 'adding' | 'ruler' | 'polygon'

export interface Measurement {
  status: MeasurementStatus
  corners: LngLat[]
  message: string | null
}

export interface SegmentFigure {
  label: string
  metres: number
}

export interface MeasurementReadout {
  segments: SegmentFigure[]
  totalM: number
  areaM2: number | null
}

export interface MeasuredPolygonDraft {
  sourceName: 'Measured polygon'
  raw: Vertex[]
  unit: 'm'
  hasZ: false
  anchor: LngLat
}

export function beginMeasurement(): Measurement {
  return { status: 'adding', corners: [], message: null }
}

export function addCorner(measurement: Measurement, corner: LngLat): Measurement {
  if (measurement.status !== 'adding') return measurement
  const last = measurement.corners[measurement.corners.length - 1]
  if (last && haversineM(last, corner) < 1) {
    return { ...measurement, message: null }
  }
  return {
    status: 'adding',
    corners: [...measurement.corners, { lng: corner.lng, lat: corner.lat }],
    message: null,
  }
}

export function finishRuler(measurement: Measurement): Measurement {
  if (measurement.status !== 'adding') return measurement
  if (measurement.corners.length < 2) {
    return { ...measurement, message: 'Add at least two corners.' }
  }
  return { status: 'ruler', corners: measurement.corners, message: null }
}

/** Close while adding. A second call on a closed shape clears it. A ruler is unchanged. */
export function applyDoubleClick(measurement: Measurement, corner: LngLat): Measurement | null {
  if (measurement.status === 'polygon') return null
  if (measurement.status === 'ruler') return measurement

  const last = measurement.corners[measurement.corners.length - 1]
  const corners =
    last && haversineM(last, corner) < 1
      ? measurement.corners
      : [...measurement.corners, { lng: corner.lng, lat: corner.lat }]

  if (corners.length < 3) {
    return {
      status: 'adding',
      corners,
      message: 'Add at least three corners to close a polygon.',
    }
  }
  return { status: 'polygon', corners, message: null }
}

export function readout(measurement: Measurement): MeasurementReadout {
  const sides = measurement.corners.slice(1).map((corner, index) => ({
    label: `Segment ${index + 1}`,
    metres: haversineM(measurement.corners[index], corner),
  }))
  if (measurement.status === 'polygon' && measurement.corners.length >= 2) {
    const first = measurement.corners[0]
    const last = measurement.corners[measurement.corners.length - 1]
    sides.push({
      label: `Segment ${sides.length + 1}`,
      metres: haversineM(last, first),
    })
  }
  const local = localMetres(measurement.corners)
  return {
    segments: sides,
    totalM: sides.reduce((sum, side) => sum + side.metres, 0),
    areaM2: measurement.status === 'polygon' ? polygonAreaM2(local) : null,
  }
}

export function measuredPolygonDraft(measurement: Measurement): MeasuredPolygonDraft | null {
  if (measurement.status !== 'polygon' || measurement.corners.length < 3) return null
  const raw = localMetres(measurement.corners)
  return {
    sourceName: 'Measured polygon',
    raw,
    unit: 'm',
    hasZ: false,
    anchor: geographicCentroid(measurement.corners[0], raw),
  }
}

function localMetres(corners: LngLat[]): Vertex[] {
  if (corners.length === 0) return []
  const origin = corners[0]
  return corners.map((corner) => offsetMetres(origin, corner))
}

function geographicCentroid(origin: LngLat, points: Vertex[]): LngLat {
  const centre = centroid(points)
  const distance = Math.hypot(centre.x, centre.y)
  if (distance === 0) return { lng: origin.lng, lat: origin.lat }
  const bearing = (toDeg(Math.atan2(centre.x, centre.y)) + 360) % 360
  return destinationPoint(origin, distance, bearing)
}

/** Metres east/north from `origin` to `point`, clockwise bearing from true north. */
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
