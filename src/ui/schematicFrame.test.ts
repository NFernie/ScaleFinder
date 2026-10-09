import { describe, expect, it } from 'vitest'
import {
  fitSchematicFrame,
  FRAME_INSET_PX,
  FRAME_START,
  initialSchematicFrame,
  PANEL_HORIZONTAL_PAD_PX,
  schematicFrameLimits,
  zoomDistance,
} from './schematicFrame'

describe('schematicFrame', () => {
  const ratio = FRAME_START.width / FRAME_START.height

  it('grows with the ratio and stops at the start size and the inset', () => {
    expect(fitSchematicFrame({ width: 400, ratio, minWidth: 328, maxWidth: 800, maxHeight: 600 })).toEqual({
      width: 400,
      height: 400 / ratio,
    })
    expect(fitSchematicFrame({ width: 100, ratio, minWidth: 328, maxWidth: 800, maxHeight: 600 })).toEqual({
      width: 328,
      height: 224,
    })
    const capped = fitSchematicFrame({ width: 900, ratio, minWidth: 328, maxWidth: 500, maxHeight: 600 })
    expect(capped.width).toBe(500)
    expect(capped.height).toBeCloseTo(500 / ratio)
    const short = fitSchematicFrame({ width: 900, ratio, minWidth: 328, maxWidth: 800, maxHeight: 200 })
    expect(short.height).toBeCloseTo(200)
    expect(short.width).toBeCloseTo(200 * ratio)
  })

  it('limits the frame to the map rect minus padding, chrome, and inset', () => {
    const limits = schematicFrameLimits({ width: 800, height: 600 }, 200)
    expect(limits.maxWidth).toBe(800 - PANEL_HORIZONTAL_PAD_PX - FRAME_INSET_PX * 2)
    expect(limits.maxHeight).toBe(600 - 200 - FRAME_INSET_PX * 2)
  })

  it('uses infinity when the map rect is zero (jsdom)', () => {
    expect(schematicFrameLimits({ width: 0, height: 0 }, 200)).toEqual({
      maxWidth: Number.POSITIVE_INFINITY,
      maxHeight: Number.POSITIVE_INFINITY,
    })
  })

  it('does not treat a shrink-wrapped panel box as the map cap', () => {
    const map = { width: 900, height: 700 }
    const shrinkWrap = { width: 352, height: 280 }
    const chrome = shrinkWrap.height - FRAME_START.height
    const fromMap = schematicFrameLimits(map, chrome)
    const fromWrap = schematicFrameLimits(shrinkWrap, chrome)
    expect(fromMap.maxWidth).toBeGreaterThan(fromWrap.maxWidth)
    expect(fromMap.maxHeight).toBeGreaterThan(fromWrap.maxHeight)
  })

  it('initialSchematicFrame picks the largest start-ratio box that fits', () => {
    const infinite = initialSchematicFrame({
      maxWidth: Number.POSITIVE_INFINITY,
      maxHeight: Number.POSITIVE_INFINITY,
    })
    expect(infinite.frame).toEqual({ width: 328, height: 224 })
    expect(infinite.minWidth).toBe(328)

    const short = initialSchematicFrame({ maxWidth: 800, maxHeight: 180 })
    expect(short.frame.height).toBeCloseTo(180)
    expect(short.frame.width).toBeCloseTo(180 * ratio)
    expect(short.minWidth).toBeCloseTo(short.frame.width)

    const narrow = initialSchematicFrame({ maxWidth: 280, maxHeight: 600 })
    expect(narrow.frame.width).toBe(280)
    expect(narrow.frame.height).toBeCloseTo(280 / ratio)
    expect(narrow.minWidth).toBe(280)

    const zero = initialSchematicFrame({ maxWidth: -10, maxHeight: 0 })
    expect(zero.frame.width).toBeGreaterThanOrEqual(0)
    expect(zero.frame.height).toBeGreaterThanOrEqual(0)
    expect(zero.minWidth).toBeGreaterThanOrEqual(0)
  })

  it('steps zoom between 2 and 60', () => {
    expect(zoomDistance(10, 'in')).toBeCloseTo(10 / 1.25)
    expect(zoomDistance(10, 'out')).toBeCloseTo(12.5)
    expect(zoomDistance(2, 'in')).toBe(2)
    expect(zoomDistance(60, 'out')).toBe(60)
  })
})
