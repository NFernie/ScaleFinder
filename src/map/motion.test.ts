import { describe, expect, it } from 'vitest'
import { approachAngle, easeOutCubic } from './motion'

describe('polygon motion', () => {
  it('starts fast and finishes at the target', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })

  it('takes the short way around the circle', () => {
    expect(approachAngle(350, 10, 1)).toBeCloseTo(370, 5)
    expect(approachAngle(10, 350, 1)).toBeCloseTo(-10, 5)
  })
})
