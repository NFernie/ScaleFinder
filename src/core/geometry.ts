import { PolygonStats, Vertex } from './types'

/**
 * Planar polygon area via the shoelace formula (metres in -> square metres out).
 * The polygon is treated as closed (last vertex joined back to the first).
 */
export function polygonAreaM2(points: Vertex[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** Area-weighted centroid of a polygon (falls back to vertex mean if degenerate). */
export function centroid(points: Vertex[]): Vertex {
  if (points.length === 0) return { x: 0, y: 0 }
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const cross = p.x * q.y - q.x * p.y
    a += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  a /= 2
  if (Math.abs(a) < 1e-9) {
    const mean = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    )
    return { x: mean.x / points.length, y: mean.y / points.length }
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export function boundingBox(points: Vertex[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

export function maxSpanM(points: Vertex[]): number {
  let max = 0
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
      if (d > max) max = d
    }
  }
  return max
}

export function computeStats(points: Vertex[]): PolygonStats {
  const areaM2 = polygonAreaM2(points)
  return {
    areaM2,
    centroid: centroid(points),
    bbox: boundingBox(points),
    maxSpanM: maxSpanM(points),
    characteristicLengthM: Math.sqrt(areaM2),
  }
}
