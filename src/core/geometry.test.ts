import { describe, expect, it } from 'vitest'
import {
  boundingBox,
  centroid,
  computeStats,
  maxSpanM,
  polygonAreaM2,
} from './geometry'
import { Vertex } from './types'

const square1km: Vertex[] = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]

describe('polygonAreaM2', () => {
  it('computes a 1 km square as 1,000,000 m^2', () => {
    expect(polygonAreaM2(square1km)).toBeCloseTo(1_000_000, 3)
  })

  it('is orientation independent', () => {
    const reversed = [...square1km].reverse()
    expect(polygonAreaM2(reversed)).toBeCloseTo(1_000_000, 3)
  })

  it('computes a right triangle', () => {
    const tri = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 0, y: 300 },
    ]
    expect(polygonAreaM2(tri)).toBeCloseTo(60_000, 3)
  })

  it('returns 0 for degenerate input', () => {
    expect(polygonAreaM2([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0)
  })
})

describe('centroid', () => {
  it('finds the centre of a square', () => {
    const c = centroid(square1km)
    expect(c.x).toBeCloseTo(500, 6)
    expect(c.y).toBeCloseTo(500, 6)
  })
})

describe('boundingBox', () => {
  it('computes bounds', () => {
    expect(boundingBox(square1km)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1000,
      maxY: 1000,
    })
  })
})

describe('maxSpanM', () => {
  it('returns the diagonal of the square', () => {
    expect(maxSpanM(square1km)).toBeCloseTo(Math.hypot(1000, 1000), 6)
  })
})

describe('computeStats', () => {
  it('assembles all metrics', () => {
    const s = computeStats(square1km)
    expect(s.areaM2).toBeCloseTo(1_000_000, 3)
    expect(s.characteristicLengthM).toBeCloseTo(1000, 6)
    expect(s.centroid.x).toBeCloseTo(500, 6)
  })
})
