import { describe, expect, it } from 'vitest'
import { beginLasso, commitLassoRing, setLassoAim, traceContrast, type Raster } from './lasso'

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

  it('clamps the aim settings and keeps a failed pick in aim', () => {
    const aim = setLassoAim(beginLasso(), 4, 400)
    expect(aim.radiusPx).toBe(8)
    expect(aim.maxChannelDelta).toBe(255)
    const missed = commitLassoRing(aim, [], 'No feature found at that contrast.')
    expect(missed.status).toBe('aim')
    expect(missed.message).toBe('No feature found at that contrast.')
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
