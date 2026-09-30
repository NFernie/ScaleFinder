import { describe, expect, it } from 'vitest'
import { nearestRingHit } from './ringHit'

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

describe('nearestRingHit', () => {
  it('returns the side, the point on it, and the nearest corner within 12px', () => {
    const hit = nearestRingHit([square], { x: 40, y: 10 })
    expect(hit).toEqual({
      part: 0,
      side: 0,
      corner: 0,
      cornerPart: 0,
      at: { x: 40, y: 0 },
      onCorner: false,
    })
  })

  it('keeps the earlier corner when two corners are the same distance', () => {
    const hit = nearestRingHit([square], { x: 50, y: 10 })
    expect(hit?.corner).toBe(0)
    expect(hit?.at).toEqual({ x: 50, y: 0 })
  })

  it('returns nothing at 13px', () => {
    expect(nearestRingHit([square], { x: 13, y: 50 })).toBeNull()
  })

  it('keeps the earlier part when distances match', () => {
    const hit = nearestRingHit([square, square], { x: 50, y: 5 })
    expect(hit?.part).toBe(0)
    expect(hit?.side).toBe(0)
  })

  it('records a nearer corner on another ring than the nearest side', () => {
    const longBase = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 100, y: 80 },
    ]
    const tiny = [
      { x: 90, y: -40 },
      { x: 110, y: -40 },
      { x: 100, y: -20 },
    ]
    const hit = nearestRingHit([longBase, tiny], { x: 100, y: 8 })
    expect(hit).toEqual({
      part: 0,
      side: 0,
      corner: 2,
      cornerPart: 1,
      at: { x: 100, y: 0 },
      onCorner: false,
    })
  })

  it('marks a point that lands on a corner', () => {
    const hit = nearestRingHit([square], { x: 0, y: 0 })
    expect(hit?.onCorner).toBe(true)
    expect(hit?.corner).toBe(0)
  })
})
