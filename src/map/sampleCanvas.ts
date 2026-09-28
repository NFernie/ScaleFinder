import { Pixel, Raster } from '../core/lasso'

export class CanvasSampleError extends Error {
  constructor() {
    super('This basemap does not allow colour sampling.')
    this.name = 'CanvasSampleError'
  }
}

interface MapLibreMap {
  getCanvas(): HTMLCanvasElement
  once(type: 'idle', listener: () => void): void
}

export function flipBottomUp(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const row = width * 4
  for (let y = 0; y < height; y += 1) {
    const source = (height - 1 - y) * row
    out.set(data.subarray(source, source + row), y * row)
  }
  return out
}

export function bufferPixel(
  cssX: number,
  cssY: number,
  canvasWidth: number,
  canvasHeight: number,
  clientWidth: number,
  clientHeight: number,
): Pixel {
  return {
    x: Math.round(cssX * scale(canvasWidth, clientWidth)),
    y: Math.round(cssY * scale(canvasHeight, clientHeight)),
  }
}

export function bufferToCss(
  pixel: Pixel,
  canvasWidth: number,
  canvasHeight: number,
  clientWidth: number,
  clientHeight: number,
): { x: number; y: number } {
  return {
    x: (pixel.x * clientWidth) / canvasWidth,
    y: (pixel.y * clientHeight) / canvasHeight,
  }
}

export function radiusInBuffer(radiusCss: number, canvasWidth: number, clientWidth: number): number {
  return radiusCss * scale(canvasWidth, clientWidth)
}

export async function sampleBasemap(map: MapLibreMap): Promise<Raster> {
  await new Promise<void>((resolve) => map.once('idle', () => resolve()))
  const canvas = map.getCanvas()
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) throw new CanvasSampleError()
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return { width, height, data: flipBottomUp(new Uint8ClampedArray(pixels), width, height) }
  } catch (error) {
    if (error instanceof CanvasSampleError) throw error
    return sampleByCopy(canvas)
  }
}

function sampleByCopy(canvas: HTMLCanvasElement): Raster {
  try {
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    const context = copy.getContext('2d')
    if (!context) throw new CanvasSampleError()
    context.drawImage(canvas, 0, 0)
    const image = context.getImageData(0, 0, copy.width, copy.height)
    return { width: copy.width, height: copy.height, data: image.data }
  } catch {
    throw new CanvasSampleError()
  }
}

function scale(canvasSize: number, clientSize: number): number {
  return clientSize === 0 ? 1 : canvasSize / clientSize
}
