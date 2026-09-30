import { LngLat } from './types'

export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface Pixel {
  x: number
  y: number
}

/** One guide point. `pixel` stays empty until the canvas read for that point returns. */
export interface LassoSample {
  pixel: Pixel | null
  radiusPx: number
  maxChannelDelta: number
}

export interface BrushSample {
  pixel: Pixel
  radiusPx: number
  maxChannelDelta: number
}

export type LassoBehaviour = 'dynamic' | 'static' | 'outline'

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface LassoDraft {
  status: 'drawing' | 'closed'
  behaviour: LassoBehaviour
  /** Static only. The colour under the first sample. Alpha is ignored. */
  reference: Rgb | null
  radiusPx: number
  maxChannelDelta: number
  /** Stroke the user drew. Each point is one brush sample. */
  guide: LngLat[]
  /** Parallel to `guide`. A null pixel has not been read yet. */
  samples: LassoSample[]
  /** Colour outline in geographic coordinates. One ring per separated patch. */
  parts: LngLat[][]
  message: string | null
}

export const CANNOT_SAMPLE = 'This basemap does not allow colour sampling.'

export function beginLasso(): LassoDraft {
  return {
    status: 'drawing',
    behaviour: 'dynamic',
    reference: null,
    radiusPx: 48,
    maxChannelDelta: 32,
    guide: [],
    samples: [],
    parts: [],
    message: null,
  }
}

export function lockReference(draft: LassoDraft, reference: Rgb): LassoDraft {
  if (draft.behaviour !== 'static' || draft.reference) return draft
  return { ...draft, reference: { r: reference.r, g: reference.g, b: reference.b } }
}

export function referenceFromRaster(raster: Raster, pixel: Pixel): Rgb | null {
  if (pixel.x < 0 || pixel.y < 0 || pixel.x >= raster.width || pixel.y >= raster.height) return null
  const index = (pixel.y * raster.width + pixel.x) * 4
  return { r: raster.data[index], g: raster.data[index + 1], b: raster.data[index + 2] }
}

export function setLassoBehaviour(draft: LassoDraft, behaviour: LassoBehaviour): LassoDraft {
  if (draft.status !== 'drawing' || draft.guide.length > 0) return draft
  if (behaviour === draft.behaviour) return draft
  return { ...draft, behaviour, reference: null, message: null }
}

export function setLassoAim(draft: LassoDraft, radiusPx: number, maxChannelDelta: number): LassoDraft {
  if (draft.status !== 'drawing') return draft
  return {
    ...draft,
    radiusPx: clamp(radiusPx, 8, 128),
    maxChannelDelta: clamp(maxChannelDelta, 0, 255),
  }
}

export function appendGuidePoint(draft: LassoDraft, point: LngLat): LassoDraft {
  if (draft.status !== 'drawing') return draft
  return {
    ...draft,
    guide: [...draft.guide, { lng: point.lng, lat: point.lat }],
    samples: [
      ...draft.samples,
      { pixel: null, radiusPx: draft.radiusPx, maxChannelDelta: draft.maxChannelDelta },
    ],
    message: null,
  }
}

export function paintGuideSample(draft: LassoDraft, index: number, pixel: Pixel): LassoDraft {
  if (draft.status !== 'drawing') return draft
  if (index < 0 || index >= draft.samples.length) return draft
  const samples = draft.samples.slice()
  const slot = samples[index]
  if (!slot) return draft
  samples[index] = { ...slot, pixel }
  return { ...draft, samples }
}

export function setOutline(draft: LassoDraft, parts: LngLat[][]): LassoDraft {
  if (draft.status !== 'drawing') return draft
  return { ...draft, parts, message: null }
}

export function markLassoMessage(draft: LassoDraft, message: string): LassoDraft {
  if (draft.status !== 'drawing') return draft
  return { ...draft, message }
}

export function dropLastGuidePoint(draft: LassoDraft): LassoDraft {
  if (draft.status !== 'drawing' || draft.guide.length === 0) return draft
  return {
    ...draft,
    guide: draft.guide.slice(0, -1),
    samples: draft.samples.slice(0, -1),
  }
}

/** Close without adding a point. Fewer than 3 guide points stays open. */
export function closeGuide(draft: LassoDraft): LassoDraft {
  if (draft.status !== 'drawing') return draft
  if (draft.guide.length < 3) {
    return { ...draft, message: 'Add at least three corners to close a polygon.' }
  }
  const parts = draft.parts.filter((part) => part.length >= 3)
  if (parts.length === 0) {
    const message =
      draft.message === CANNOT_SAMPLE ? draft.message : 'No feature found at that contrast.'
    return { ...draft, status: 'closed', parts: [], message }
  }
  return { ...draft, status: 'closed', parts, message: null }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1]
const DY = [0, 1, 1, 1, 0, -1, -1, -1]

export function traceContrast(
  raster: Raster,
  seed: Pixel,
  radiusPx: number,
  maxChannelDelta: number,
): Pixel[] | null {
  if (radiusPx < 1) return null
  if (seed.x < 0 || seed.y < 0 || seed.x >= raster.width || seed.y >= raster.height) return null
  const filled = flood(raster, seed, radiusPx, maxChannelDelta)
  let count = 0
  for (const cell of filled) count += cell
  if (count < 8) return null
  const start = topLeft(raster, filled)
  if (!start) return null
  const walked = moore(raster, filled, start)
  const simplified = simplifyRing(walked, 1.25)
  return simplified.length >= 3 ? simplified : null
}

/**
 * Union of one flood per sample. Each sample keeps the radius and contrast it
 * was drawn with. A sample that fills fewer than 8 pixels adds nothing.
 * Touching patches are one part. A gap is another part.
 */
export function traceBrush(raster: Raster, samples: BrushSample[], reference?: Rgb | null): Pixel[][] | null {
  if (raster.width === 0 || raster.height === 0 || samples.length === 0) return null
  const mask = new Uint8Array(raster.width * raster.height)
  let total = 0
  let minX = raster.width
  let minY = raster.height
  let maxX = 0
  let maxY = 0
  for (const sample of samples) {
    if (sample.radiusPx < 1) continue
    const seed = sample.pixel
    if (seed.x < 0 || seed.y < 0 || seed.x >= raster.width || seed.y >= raster.height) continue
    const patch = flood(raster, seed, sample.radiusPx, sample.maxChannelDelta, reference)
    const reach = Math.ceil(sample.radiusPx)
    const x0 = Math.max(0, seed.x - reach)
    const y0 = Math.max(0, seed.y - reach)
    const x1 = Math.min(raster.width - 1, seed.x + reach)
    const y1 = Math.min(raster.height - 1, seed.y + reach)
    let count = 0
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (patch[y * raster.width + x]) count += 1
      }
    }
    if (count < 8) continue
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const key = y * raster.width + x
        if (!patch[key] || mask[key]) continue
        mask[key] = 1
        total += 1
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (total < 8) return null
  const parts = connectedOutlines(raster, mask, minX, minY, maxX, maxY)
  return parts.length > 0 ? parts : null
}

function connectedOutlines(
  raster: Raster,
  filled: Uint8Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Pixel[][] {
  const seen = new Uint8Array(filled.length)
  const parts: Pixel[][] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const startKey = y * raster.width + x
      if (!filled[startKey] || seen[startKey]) continue
      const component = new Uint8Array(filled.length)
      const stack: Pixel[] = [{ x, y }]
      seen[startKey] = 1
      component[startKey] = 1
      while (stack.length > 0) {
        const current = stack.pop()!
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = current.x + ox
          const ny = current.y + oy
          if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue
          const key = ny * raster.width + nx
          if (!filled[key] || seen[key]) continue
          seen[key] = 1
          component[key] = 1
          stack.push({ x: nx, y: ny })
        }
      }
      const start = topLeft(raster, component)
      if (!start) continue
      const simplified = simplifyRing(moore(raster, component, start), 1.25)
      if (simplified.length >= 3) parts.push(simplified)
    }
  }
  return parts
}

function flood(
  raster: Raster,
  seed: Pixel,
  radiusPx: number,
  maxChannelDelta: number,
  reference?: Rgb | null,
): Uint8Array {
  const filled = new Uint8Array(raster.width * raster.height)
  const seedColour = rgb(raster, seed.x, seed.y)
  const colour: [number, number, number] = reference
    ? [reference.r, reference.g, reference.b]
    : seedColour
  if (reference) {
    const delta = Math.max(
      Math.abs(seedColour[0] - colour[0]),
      Math.abs(seedColour[1] - colour[1]),
      Math.abs(seedColour[2] - colour[2]),
    )
    if (delta > maxChannelDelta) return filled
  }
  const stack: Pixel[] = [seed]
  filled[seed.y * raster.width + seed.x] = 1
  const radius2 = radiusPx * radiusPx
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + ox
      const y = current.y + oy
      if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) continue
      const key = y * raster.width + x
      if (filled[key]) continue
      const dx = x - seed.x
      const dy = y - seed.y
      if (dx * dx + dy * dy > radius2) continue
      const next = rgb(raster, x, y)
      const delta = Math.max(
        Math.abs(next[0] - colour[0]),
        Math.abs(next[1] - colour[1]),
        Math.abs(next[2] - colour[2]),
      )
      if (delta > maxChannelDelta) continue
      filled[key] = 1
      stack.push({ x, y })
    }
  }
  return filled
}

function rgb(raster: Raster, x: number, y: number): [number, number, number] {
  const index = (y * raster.width + x) * 4
  return [raster.data[index], raster.data[index + 1], raster.data[index + 2]]
}

function topLeft(raster: Raster, filled: Uint8Array): Pixel | null {
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      if (filled[y * raster.width + x]) return { x, y }
    }
  }
  return null
}

function inside(raster: Raster, filled: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return false
  return filled[y * raster.width + x] === 1
}

function moore(raster: Raster, filled: Uint8Array, start: Pixel): Pixel[] {
  const points: Pixel[] = []
  let x = start.x
  let y = start.y
  let check = 6
  for (let guard = 0; guard < raster.width * raster.height; guard += 1) {
    points.push({ x, y })
    let moved = false
    for (let turn = 0; turn < 8; turn += 1) {
      const direction = (check + turn) % 8
      const nx = x + DX[direction]
      const ny = y + DY[direction]
      if (!inside(raster, filled, nx, ny)) continue
      if (nx === start.x && ny === start.y) return points
      x = nx
      y = ny
      check = (direction + 5) % 8
      moved = true
      break
    }
    if (!moved) return points
  }
  return points
}

function simplifyRing(points: Pixel[], epsilon: number): Pixel[] {
  if (points.length < 3) return points
  const simplified = rdp([...points, points[0]], epsilon)
  const last = simplified[simplified.length - 1]
  if (simplified.length > 1 && last.x === simplified[0].x && last.y === simplified[0].y) simplified.pop()
  return simplified
}

function rdp(points: Pixel[], epsilon: number): Pixel[] {
  if (points.length < 3) return points
  let farthest = 0
  let index = 0
  const end = points.length - 1
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicular(points[i], points[0], points[end])
    if (distance > farthest) {
      farthest = distance
      index = i
    }
  }
  if (farthest <= epsilon) return [points[0], points[end]]
  const left = rdp(points.slice(0, index + 1), epsilon)
  const right = rdp(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

function perpendicular(point: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / length
}
