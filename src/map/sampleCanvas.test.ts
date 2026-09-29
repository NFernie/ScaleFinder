import { describe, expect, it } from 'vitest'
import { bufferPixel, bufferToCss, flipBottomUp, radiusInBuffer, sampleBasemap } from './sampleCanvas'

describe('canvas sample geometry', () => {
  it('flips a bottom-up buffer so the first row is the top', () => {
    const data = new Uint8ClampedArray([1, 1, 1, 1, 2, 2, 2, 2])
    expect(Array.from(flipBottomUp(data, 1, 2))).toEqual([2, 2, 2, 2, 1, 1, 1, 1])
  })

  it('converts CSS pixels to buffer pixels and back', () => {
    expect(bufferPixel(10, 20, 200, 100, 100, 50)).toEqual({ x: 20, y: 40 })
    expect(bufferToCss({ x: 20, y: 40 }, 200, 100, 100, 50)).toEqual({ x: 10, y: 20 })
    expect(radiusInBuffer(48, 200, 100)).toBe(96)
  })
})

describe('sampleBasemap', () => {
  it('rejects an empty WebGL drawing buffer', async () => {
    const canvas = document.createElement('canvas')
    const gl = {
      drawingBufferWidth: 0,
      drawingBufferHeight: 0,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      readPixels: () => {},
    }
    canvas.getContext = ((type: string) =>
      type === 'webgl2' || type === 'webgl' ? (gl as unknown as WebGLRenderingContext) : null) as typeof canvas.getContext

    const map = {
      getCanvas: () => canvas,
      once: (_type: 'idle', listener: () => void) => {
        listener()
      },
      triggerRepaint: () => {},
    }

    await expect(sampleBasemap(map)).rejects.toThrow('This basemap does not allow colour sampling.')
  })
})
