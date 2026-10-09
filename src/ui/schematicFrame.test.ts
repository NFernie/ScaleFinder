import { describe, expect, it } from 'vitest'
import {
  fitSchematicFrame,
  FRAME_INSET_PX,
  FRAME_START,
  initialSchematicFrame,
  PANEL_HORIZONTAL_PAD_PX,
  schematicFrameLimits,
  wheelZoomStep,
  wrapperEdgeGaps,
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

  it('leaves less height when a 34px bottom inset and a 12px top inset replace a flat 12px budget', () => {
    const map = { width: 390, height: 700 }
    const flat = schematicFrameLimits(map, 200)
    const phone = schematicFrameLimits(map, 200, { top: 12, right: 12, bottom: 34, left: 12 })
    expect(phone.maxHeight).toBeLessThan(flat.maxHeight)
    expect(flat.maxHeight - phone.maxHeight).toBe(22)
    expect(phone.maxHeight).toBe(700 - 200 - 12 - 34)
    expect(phone.maxWidth).toBe(flat.maxWidth)
  })

  it('reads the wrapper gap on the bottom and right and ignores an empty wrapper', () => {
    expect(
      wrapperEdgeGaps(
        { width: 400, height: 800, right: 400, bottom: 800 },
        { width: 320, height: 240, right: 388, bottom: 766 },
      ),
    ).toEqual({ right: 12, bottom: 34 })
    expect(
      wrapperEdgeGaps({ width: 400, height: 800, right: 400, bottom: 800 }, { width: 0, height: 0, right: 0, bottom: 0 }),
    ).toEqual({ right: 0, bottom: 0 })
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

  it('counts one wheel detent as one zoom step', () => {
    const first = wheelZoomStep(0, { deltaY: 40, deltaMode: 0 })
    const second = wheelZoomStep(first.accumulator, { deltaY: 40, deltaMode: 0 })
    expect(first.direction).toBeNull()
    expect(second.direction).toBeNull()
    const third = wheelZoomStep(second.accumulator, { deltaY: 40, deltaMode: 0 })
    expect(third.direction).toBe('out')
    expect(third.accumulator).toBe(20)
    expect(wheelZoomStep(0, { deltaY: 1, deltaMode: 1 }).direction).toBe('out')
    expect(wheelZoomStep(0, { deltaY: -1, deltaMode: 2 }).direction).toBe('in')
    expect(wheelZoomStep(40, { deltaY: 0, deltaMode: 0 })).toEqual({ direction: null, accumulator: 40 })
  })

  it('keeps a fitted frame inside the map when the start size cannot fit', () => {
    const fitted = fitSchematicFrame({
      width: FRAME_START.width,
      ratio,
      minWidth: FRAME_START.width,
      maxWidth: 200,
      maxHeight: 80,
    })
    expect(fitted.width).toBeLessThanOrEqual(200)
    expect(fitted.height).toBeLessThanOrEqual(80)
    expect(fitted.width).toBeGreaterThanOrEqual(0)
    expect(fitted.height).toBeGreaterThanOrEqual(0)
    expect(fitted.width).toBeLessThan(FRAME_START.width)
    const minimum = initialSchematicFrame({ maxWidth: 200, maxHeight: 80 })
    expect(minimum.minWidth).toBeCloseTo(minimum.frame.width)
    expect(minimum.frame.width).toBeLessThanOrEqual(200)
    expect(minimum.frame.height).toBeLessThanOrEqual(80)
    expect(
      fitSchematicFrame({ width: 400, ratio, minWidth: 328, maxWidth: -20, maxHeight: -10 }),
    ).toEqual({ width: 0, height: 0 })
  })
})
