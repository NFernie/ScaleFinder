/** A vertex in local projected space. X = easting, Y = northing, Z = elevation. */
export interface Vertex {
  x: number
  y: number
  z?: number
}

/** A geographic coordinate. */
export interface LngLat {
  lng: number
  lat: number
}

export type LengthUnit = 'm' | 'ft' | 'km'

export interface PolygonStats {
  /** Planform area in square metres. */
  areaM2: number
  /** Centroid in local projected coordinates (metres). */
  centroid: Vertex
  /** Axis-aligned bounding box in local coordinates (metres). */
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
  /** Longest straight-line distance between any two vertices, in metres. */
  maxSpanM: number
  /** sqrt(area) — a size-equivalent square edge length, in metres. */
  characteristicLengthM: number
}
