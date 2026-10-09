import { describe, expect, it } from 'vitest'
import { fitSchematicFrame, FRAME_START, zoomDistance } from './schematicFrame'

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

  it('steps zoom between 2 and 60', () => {
    expect(zoomDistance(10, 'in')).toBeCloseTo(10 / 1.25)
    expect(zoomDistance(10, 'out')).toBeCloseTo(12.5)
    expect(zoomDistance(2, 'in')).toBe(2)
    expect(zoomDistance(60, 'out')).toBe(60)
  })
})
