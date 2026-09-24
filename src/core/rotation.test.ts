import { describe, expect, it } from 'vitest'
import { centroid } from './geometry'
import {
  chooseReferenceEdge,
  commitBearing,
  measureEdgeBearing,
  rotationForBearing,
  turnedParts,
} from './rotation'

const anchor = { lng: 31, lat: 30 }
const square = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]

function sideLengths(points: { x: number; y: number }[]): number[] {
  return points.slice(0, -1).map((point, index) => {
    const next = points[index + 1]
    return Math.hypot(next.x - point.x, next.y - point.y)
  })
}

describe('polygon rotation', () => {
  it('turns local metres without changing side lengths or the centre', () => {
    const turned = turnedParts([square], 90)[0]
    expect(sideLengths(turned).map((length) => Math.round(length))).toEqual([1000, 1000, 1000])
    const before = centroid(square)
    const after = centroid(turned)
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
  })

  it('locks the edge closest to north and keeps that index after a turn', () => {
    const edge = chooseReferenceEdge([square], anchor)
    expect(edge).toEqual({ part: 0, edge: 1 })
    const turned = turnedParts([square], 40)
    expect(chooseReferenceEdge(turned, anchor)).toEqual({ part: 0, edge: 1 })
  })

  it('matches a typed bearing within a tenth of a degree', () => {
    const edge = chooseReferenceEdge([square], anchor)
    if (!edge) throw new Error('expected an edge')
    const rotation = rotationForBearing([square], anchor, 0, edge, 45)
    const measured = measureEdgeBearing([square], anchor, rotation, edge)
    expect(measured).toBeCloseTo(45, 1)
  })

  it('leaves the rotation unchanged when only the centre moves', () => {
    const edge = { part: 0, edge: 1 }
    const here = measureEdgeBearing([square], anchor, 20, edge)
    const elsewhere = measureEdgeBearing([square], { lng: 31, lat: 60 }, 20, edge)
    expect(here).not.toBeNull()
    expect(elsewhere).not.toBeNull()
    expect(Math.abs((elsewhere ?? 0) - (here ?? 0))).toBeGreaterThan(0)
    expect(Math.abs((elsewhere ?? 0) - (here ?? 0))).toBeLessThan(2)
  })

  it('restores the saved bearing after the centre changes', () => {
    const edge = chooseReferenceEdge([square], anchor)
    if (!edge) throw new Error('expected an edge')
    const original = measureEdgeBearing([square], anchor, 0, edge)
    if (original === null) throw new Error('expected a bearing')
    const moved = { lng: 10, lat: 50 }
    const rotation = rotationForBearing([square], moved, 30, edge, original)
    expect(measureEdgeBearing([square], moved, rotation, edge)).toBeCloseTo(original, 1)
  })

  it('does not rotate a zero-length edge', () => {
    const flat = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    expect(measureEdgeBearing([flat], anchor, 0, { part: 0, edge: 0 })).toBeNull()
    expect(commitBearing('')).toBeNull()
    expect(commitBearing('nope')).toBeNull()
    expect(commitBearing('360')).toBeNull()
    expect(commitBearing('-1')).toBeNull()
    expect(commitBearing(' 12.5 ')).toBe(12.5)
  })
})
