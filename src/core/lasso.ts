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

export interface LassoDraft {
  status: 'aim' | 'ready'
  radiusPx: number
  maxChannelDelta: number
  corners: LngLat[]
  message: string | null
}

export function beginLasso(): LassoDraft {
  return { status: 'aim', radiusPx: 48, maxChannelDelta: 32, corners: [], message: null }
}

export function setLassoAim(draft: LassoDraft, radiusPx: number, maxChannelDelta: number): LassoDraft {
  if (draft.status !== 'aim') return draft
  return {
    ...draft,
    radiusPx: clamp(radiusPx, 8, 128),
    maxChannelDelta: clamp(maxChannelDelta, 0, 255),
  }
}

export function commitLassoRing(draft: LassoDraft, corners: LngLat[], message: string | null): LassoDraft {
  if (message || corners.length < 3) {
    return { ...draft, status: 'aim', corners: [], message: message ?? 'No feature found at that contrast.' }
  }
  return { ...draft, status: 'ready', corners, message: null }
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

function flood(raster: Raster, seed: Pixel, radiusPx: number, maxChannelDelta: number): Uint8Array {
  const filled = new Uint8Array(raster.width * raster.height)
  const colour = rgb(raster, seed.x, seed.y)
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
