import { describe, expect, it } from 'vitest'
import { destinationPoint, haversineM } from './projection'
import {
  beginSquare,
  setSquareOpposite,
  setSquareOrigin,
  setSquareShape,
  squareCorners,
} from './square'

const origin = { lng: 10, lat: 45 }

describe('square and rectangle', () => {
  it('builds an east-north rectangle from the opposite corner', () => {
    const east = destinationPoint(origin, 1000, 90)
    const opposite = destinationPoint(east, 400, 0)
    const corners = squareCorners(origin, opposite, 'rectangle')
    expect(corners).toHaveLength(4)
    expect(haversineM(corners![0], corners![1])).toBeCloseTo(1000, 0)
    expect(haversineM(corners![1], corners![2])).toBeCloseTo(400, 0)
    expect(haversineM(corners![0], corners![3])).toBeCloseTo(400, 0)
  })

  it('forces a square onto the longer side', () => {
    const east = destinationPoint(origin, 1000, 90)
    const opposite = destinationPoint(east, 400, 0)
    const corners = squareCorners(origin, opposite, 'square')
    expect(haversineM(corners![0], corners![1])).toBeCloseTo(1000, 0)
    expect(haversineM(corners![0], corners![3])).toBeCloseTo(1000, 0)
  })

  it('rejects a flat rectangle and can switch shape before the second click', () => {
    expect(squareCorners(origin, destinationPoint(origin, 1000, 90), 'rectangle')).toBeNull()
    const draft = setSquareShape(setSquareOrigin(beginSquare(), origin), 'square')
    expect(draft.shape).toBe('square')
    const flat = setSquareOpposite(draft, origin)
    expect(flat.status).toBe('origin')
    expect(flat.message).toBe('The box is too small.')
  })
})
