import { describe, expect, it } from 'vitest'
import { appendGuidePoint, beginLasso, closeGuide, lockReference, referenceFromRaster, setLassoAim, setLassoBehaviour, traceBrush, traceContrast, type Raster } from './lasso'

function solid(width: number, height: number, paint: (x: number, y: number) => [number, number, number]): Raster {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y)
      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255
    }
  }
  return { width, height, data }
}

describe('lasso contrast', () => {
  it('returns the four corners of a red block and stays inside the radius', () => {
    const raster = solid(9, 9, (x, y) => (x >= 2 && x <= 6 && y >= 2 && y <= 6 ? [200, 40, 40] : [20, 20, 20]))
    const ring = traceContrast(raster, { x: 4, y: 4 }, 10, 12)
    expect(ring?.[0]).toEqual({ x: 2, y: 2 })
    expect(ring).toEqual([
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 2, y: 6 },
    ])
  })

  it('clamps radius and contrast while the stroke is open', () => {
    const drawing = setLassoAim(beginLasso(), 4, 400)
    expect(drawing.status).toBe('drawing')
    expect(drawing.radiusPx).toBe(8)
    expect(drawing.maxChannelDelta).toBe(255)
    const a = { lng: 10, lat: 45 }
    const b = { lng: 10.01, lat: 45 }
    const c = { lng: 10.01, lat: 45.01 }
    const closed = closeGuide({ ...drawing, guide: [a, b, c], parts: [[a, b, c]] })
    expect(closed.status).toBe('closed')
    expect(setLassoAim(closed, 20, 10).radiusPx).toBe(8)
  })

  it('does not cross a radius or a contrasting pixel', () => {
    const raster = solid(9, 9, (x, y) => (x >= 2 && x <= 6 && y >= 2 && y <= 6 ? [200, 40, 40] : [20, 20, 20]))
    expect(traceContrast(raster, { x: 4, y: 4 }, 1, 12)).toBeNull()
    const edgeRing = traceContrast(raster, { x: 0, y: 0 }, 10, 0)
    expect(edgeRing).not.toBeNull()
    for (const point of edgeRing!) {
      const index = (point.y * raster.width + point.x) * 4
      expect([raster.data[index], raster.data[index + 1], raster.data[index + 2]]).toEqual([20, 20, 20])
    }
  })
})

describe('lasso brush', () => {
  it('joins two samples of the same colour into one ring', () => {
    const raster = solid(12, 9, (x, y) => (x >= 2 && x <= 8 && y >= 2 && y <= 6 ? [200, 40, 40] : [20, 20, 20]))
    const parts = traceBrush(raster, [
      { pixel: { x: 3, y: 4 }, radiusPx: 8, maxChannelDelta: 12 },
      { pixel: { x: 7, y: 4 }, radiusPx: 8, maxChannelDelta: 12 },
    ])
    expect(parts).toHaveLength(1)
    expect(parts?.[0]).toEqual([
      { x: 2, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 6 },
      { x: 2, y: 6 },
    ])
  })

  it('joins two different colours when their patches touch', () => {
    const raster = solid(14, 9, (x, y) => {
      if (y < 2 || y > 6) return [20, 20, 20]
      if (x >= 1 && x <= 4) return [200, 40, 40]
      if (x >= 5 && x <= 8) return [40, 40, 200]
      return [20, 20, 20]
    })
    const parts = traceBrush(raster, [
      { pixel: { x: 2, y: 4 }, radiusPx: 8, maxChannelDelta: 10 },
      { pixel: { x: 7, y: 4 }, radiusPx: 8, maxChannelDelta: 10 },
    ])
    expect(parts).toHaveLength(1)
    const xs = parts![0].map((point) => point.x)
    expect(Math.min(...xs)).toBeLessThanOrEqual(1)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(8)
  })

  it('keeps a pixel outside the radius and a contrasting pixel out of the ring', () => {
    const raster = solid(12, 9, (x, y) => {
      if (x === 0 && y === 4) return [200, 40, 40]
      if (x === 6 && y === 4) return [0, 255, 0]
      if (x >= 3 && x <= 5 && y >= 3 && y <= 5) return [200, 40, 40]
      return [20, 20, 20]
    })
    const parts = traceBrush(raster, [{ pixel: { x: 4, y: 4 }, radiusPx: 3, maxChannelDelta: 12 }])
    expect(parts).toHaveLength(1)
    expect(parts![0].some((point) => point.x === 0)).toBe(false)
    expect(Math.max(...parts![0].map((point) => point.x))).toBeLessThanOrEqual(5)
  })

  it('returns null when a sample fills fewer than 8 pixels', () => {
    const raster = solid(8, 8, (x, y) => (x >= 2 && x <= 3 && y >= 2 && y <= 3 ? [200, 40, 40] : [20, 20, 20]))
    expect(traceBrush(raster, [{ pixel: { x: 2, y: 2 }, radiusPx: 5, maxChannelDelta: 12 }])).toBeNull()
  })

  it('splits a gap into two parts', () => {
    const raster = solid(16, 9, (x, y) => {
      if (y < 2 || y > 6) return [20, 20, 20]
      if (x >= 1 && x <= 3) return [200, 40, 40]
      if (x >= 8 && x <= 10) return [40, 40, 200]
      return [20, 20, 20]
    })
    const parts = traceBrush(raster, [
      { pixel: { x: 2, y: 4 }, radiusPx: 6, maxChannelDelta: 10 },
      { pixel: { x: 9, y: 4 }, radiusPx: 6, maxChannelDelta: 10 },
    ])
    expect(parts).toHaveLength(2)
    const bands = parts!.map((part) => Math.min(...part.map((point) => point.x)))
    expect(bands.some((x) => x <= 1)).toBe(true)
    expect(bands.some((x) => x >= 8)).toBe(true)
  })
})

describe('lasso behaviour', () => {
  it('starts on Dynamic and ignores a change after the first point', () => {
    const empty = beginLasso()
    expect(empty.behaviour).toBe('dynamic')
    expect(empty.reference).toBeNull()
    const chosen = setLassoBehaviour(empty, 'static')
    expect(chosen.behaviour).toBe('static')
    const pointed = appendGuidePoint(chosen, { lng: 10, lat: 45 })
    expect(setLassoBehaviour(pointed, 'outline').behaviour).toBe('static')
  })
})

describe('static reference', () => {
  it('includes a later red sample and drops a blue sample', () => {
    const raster = solid(16, 9, (x, y) => {
      if (y < 2 || y > 6) return [20, 20, 20]
      if (x >= 1 && x <= 4) return [200, 40, 40]
      if (x >= 10 && x <= 13) return [200, 40, 40]
      if (x >= 6 && x <= 8) return [40, 40, 200]
      return [20, 20, 20]
    })
    const reference = { r: 200, g: 40, b: 40 }
    const parts = traceBrush(
      raster,
      [
        { pixel: { x: 2, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
        { pixel: { x: 11, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
        { pixel: { x: 7, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
      ],
      reference,
    )
    expect(parts).toHaveLength(2)
    const bands = parts!.map((part) => Math.min(...part.map((point) => point.x)))
    expect(bands.some((x) => x <= 1)).toBe(true)
    expect(bands.some((x) => x >= 10)).toBe(true)
    expect(parts!.some((part) => part.some((point) => point.x === 7))).toBe(false)
  })

  it('keeps a red pixel outside that sample radius out of the ring', () => {
    const raster = solid(16, 9, (x, y) => {
      if (y >= 2 && y <= 6 && x >= 1 && x <= 4) return [200, 40, 40]
      if (x === 15 && y === 4) return [200, 40, 40]
      return [20, 20, 20]
    })
    const parts = traceBrush(
      raster,
      [{ pixel: { x: 2, y: 4 }, radiusPx: 4, maxChannelDelta: 12 }],
      { r: 200, g: 40, b: 40 },
    )
    expect(parts![0].some((point) => point.x === 15)).toBe(false)
  })

  it('does not invent a reference when lock is refused', () => {
    const draft = setLassoBehaviour(beginLasso(), 'static')
    expect(lockReference(draft, { r: 1, g: 2, b: 3 }).reference).toEqual({ r: 1, g: 2, b: 3 })
    expect(lockReference(beginLasso(), { r: 1, g: 2, b: 3 }).reference).toBeNull()
    const raster = solid(2, 2, () => [9, 8, 7])
    expect(referenceFromRaster(raster, { x: 0, y: 0 })).toEqual({ r: 9, g: 8, b: 7 })
    expect(referenceFromRaster(raster, { x: 9, y: 0 })).toBeNull()
  })
})
