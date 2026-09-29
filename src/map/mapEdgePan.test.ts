import { describe, expect, it } from 'vitest'
import { edgePanDelta } from './mapEdgePan'

describe('edgePanDelta', () => {
  it('returns positive x when pointer is near right edge', () => {
    const d = edgePanDelta({ x: 980, y: 400 }, { width: 1000, height: 800 }, 24)
    expect(d.x).toBeGreaterThan(0)
  })

  it('returns zero when pointer is inset from every edge', () => {
    const d = edgePanDelta({ x: 500, y: 400 }, { width: 1000, height: 800 }, 32)
    expect(d).toEqual({ x: 0, y: 0 })
  })

  it('clamps each component to ±16 CSS pixels', () => {
    const d = edgePanDelta({ x: 0, y: 0 }, { width: 1000, height: 800 }, 32)
    expect(d.x).toBeGreaterThanOrEqual(-16)
    expect(d.x).toBeLessThanOrEqual(16)
    expect(d.y).toBeGreaterThanOrEqual(-16)
    expect(d.y).toBeLessThanOrEqual(16)
  })
})
