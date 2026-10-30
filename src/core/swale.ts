import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { beachRidgeMesh, ridgeFlankSide, type SchematicSceneId } from './schematicScene'
import {
  beachRidgeRing,
  beachRidgeStations,
  type RidgeCorner,
  type RidgeStation,
  type SceneBody,
} from './wfSchematic'

/** Alongshore samples. Both ridges share this parameter, even when station counts differ. */
export const SWALE_ALONG = 16

/** Samples down each facing hypotenuse, from the crest to where the faces meet. */
export const SWALE_FACE = 8

/**
 * Horizontal clearance kept inside the gap, as a fraction of the local opening,
 * and a hard cap. The wedge traces the hypotenuses and stays out of both ridges.
 */
const SWALE_CLEARANCE = 0.008
const SWALE_CLEARANCE_FRACTION = 0.2
/**
 * Extra seaward probe past the inset. The matched-t gap can be wider than the
 * true 3D opening when the next ridge is offset alongshore, so the inset is
 * stopped while this margin is still clear of the other solid.
 */
const SWALE_SURFACE_GAP = 0.002

export interface SwalePoint {
  x: number
  y: number
  z: number
}

export interface SwaleShape {
  id: string
  parentId: string | null
  /** World centroid. The mesh is stored around this origin so explode can move the solid. */
  origin: SwalePoint
  /** Local positions. World = origin + position. Ring layout is {@link SWALE_FACE} × 2 per alongshore sample. */
  positions: number[]
  indices: number[]
  /** Seaward crown of the landward ridge, channel end to tip, before the clearance inset. */
  landCrest: SwalePoint[]
  /** Landward crown of the seaward ridge, channel end to tip, before the clearance inset. */
  seaCrest: SwalePoint[]
}

const shapeCache = new Map<string, SwaleShape[]>()

function cacheKey(scene: SchematicSceneId, bodies: SceneBody[]): string {
  const parts: string[] = [scene]
  for (const body of bodies) {
    if (body.kind !== 'beach-ridge') continue
    parts.push(
      [body.id, body.parentId ?? '', body.nested.x, body.nested.y, body.nested.z, body.yaw ?? 0].join(','),
    )
  }
  return parts.join('|')
}

function ridgeIndex(id: string): number {
  const index = Number(id.slice(id.lastIndexOf('-') + 1))
  return Number.isFinite(index) ? index : 0
}

function stationsFor(scene: SchematicSceneId, body: SceneBody): RidgeStation[] {
  const side = ridgeFlankSide(body.id)
  const index = ridgeIndex(body.id)
  const loft = beachRidgeMesh(scene, body.id)
  if (loft === 'convex-sw') return brConvexSwStations(side, index)
  if (loft === 'asymmetric') return asymmetricBeachRidgeStations(side, index)
  return beachRidgeStations(side, index)
}

/** Linear loft between station rings. This is the cross-section the beach-ridge mesh draws. */
function loftedRing(stations: RidgeStation[], t: number): RidgeCorner[] {
  const last = stations.length - 1
  const scaled = Math.min(last, Math.max(0, t * last))
  const index = Math.min(last - 1, Math.floor(scaled))
  const u = scaled - index
  const start = beachRidgeRing(stations[index])
  const end = beachRidgeRing(stations[Math.min(last, index + 1)])
  return start.map((point, corner) => ({
    x: point.x + (end[corner].x - point.x) * u,
    y: point.y + (end[corner].y - point.y) * u,
    z: point.z + (end[corner].z - point.z) * u,
  }))
}

function worldFromBody(body: SceneBody, local: RidgeCorner): SwalePoint {
  const yaw = body.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: body.nested.x + local.x * cos + local.z * sin,
    y: body.nested.y + local.y,
    z: body.nested.z - local.x * sin + local.z * cos,
  }
}

function localFromBody(body: SceneBody, world: SwalePoint): SwalePoint {
  const yaw = body.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const dx = world.x - body.nested.x
  const dz = world.z - body.nested.z
  return {
    x: dx * cos - dz * sin,
    y: world.y - body.nested.y,
    z: dx * sin + dz * cos,
  }
}

/** +local Z after yaw. Larger means further seaward. */
function seawardOf(yaw: number, point: SwalePoint): number {
  return point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
}

/**
 * Outer silhouette of one cross-section, crest to base.
 * `seaward` is the maximum local Z at each height (the seaward hypotenuse, then
 * whatever outline is further seaward). `landward` is the minimum local Z (the
 * landward hypotenuse while that edge is the outline). The doubled face folds
 * past the straight landward chord, so the chord alone would sit inside the mesh.
 */
function silhouette(ring: RidgeCorner[], edge: 'seaward' | 'landward'): RidgeCorner[] {
  const hi = Math.max(...ring.map((point) => point.y))
  const lo = Math.min(...ring.map((point) => point.y))
  const samples = 32
  const out: RidgeCorner[] = []
  for (let i = 0; i < samples; i += 1) {
    const y = hi + ((lo - hi) * i) / (samples - 1)
    let best = edge === 'seaward' ? -Infinity : Infinity
    for (let e = 0; e < ring.length; e += 1) {
      const a = ring[e]
      const b = ring[(e + 1) % ring.length]
      if (Math.abs(a.y - b.y) < 1e-12) continue
      const u = (a.y - y) / (a.y - b.y)
      if (u < -1e-6 || u > 1 + 1e-6) continue
      const z = a.z + (b.z - a.z) * u
      if (edge === 'seaward' ? z > best : z < best) best = z
    }
    if (Number.isFinite(best)) out.push({ x: ring[0].x, y, z: best })
  }
  return out
}

function nudge(point: SwalePoint, yaw: number, distance: number): SwalePoint {
  return {
    x: point.x + Math.sin(yaw) * distance,
    y: point.y,
    z: point.z + Math.cos(yaw) * distance,
  }
}

function lerp(a: SwalePoint, b: SwalePoint, u: number): SwalePoint {
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
  }
}

/** Polyline is ordered from high Y to low Y. */
function pointAtY(poly: SwalePoint[], y: number): SwalePoint {
  for (let i = 0; i < poly.length - 1; i += 1) {
    const a = poly[i]
    const b = poly[i + 1]
    const high = Math.max(a.y, b.y)
    const low = Math.min(a.y, b.y)
    if (y <= high + 1e-8 && y >= low - 1e-8) {
      const u = Math.abs(a.y - b.y) < 1e-9 ? 0 : (a.y - y) / (a.y - b.y)
      return lerp(a, b, u)
    }
  }
  return poly[poly.length - 1]
}

function clipDown(poly: SwalePoint[], yCut: number): SwalePoint[] {
  if (poly[0].y <= yCut) return [poly[0]]
  const out: SwalePoint[] = [poly[0]]
  for (let i = 1; i < poly.length; i += 1) {
    const prev = poly[i - 1]
    const current = poly[i]
    if (current.y >= yCut) {
      out.push(current)
      continue
    }
    const u = Math.abs(prev.y - current.y) < 1e-9 ? 0 : (prev.y - yCut) / (prev.y - current.y)
    out.push(lerp(prev, current, u))
    break
  }
  return out
}

function resample(points: SwalePoint[], count: number): SwalePoint[] {
  if (points.length === 0) return []
  if (count <= 1) return [{ ...points[0] }]
  const lengths = [0]
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const dz = points[i].z - points[i - 1].z
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy, dz))
  }
  const total = lengths[lengths.length - 1]
  const out: SwalePoint[] = []
  for (let i = 0; i < count; i += 1) {
    const target = total * (i / (count - 1))
    let seg = 1
    while (seg < lengths.length - 1 && lengths[seg] < target) seg += 1
    const span = lengths[seg] - lengths[seg - 1]
    const u = span === 0 ? 0 : (target - lengths[seg - 1]) / span
    out.push(lerp(points[seg - 1], points[seg], u))
  }
  return out
}

/**
 * First Y, walking down from the lower crest, where the opening has closed to
 * the clearance. Below that the faces occupy the same ground, so the swale stops.
 */
function meetingY(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landFace: SwalePoint[],
  seaFace: SwalePoint[],
  yaw: number,
): number {
  const hi = Math.min(landFace[0].y, seaFace[0].y)
  const lo = Math.max(landFace[landFace.length - 1].y, seaFace[seaFace.length - 1].y)
  const gap = (y: number) => seawardOf(yaw, pointAtY(seaFace, y)) - seawardOf(yaw, pointAtY(landFace, y))
  const crestGap = gap(hi)
  if (crestGap <= 1e-6) return hi
  const limit = Math.min(SWALE_CLEARANCE, crestGap * SWALE_CLEARANCE_FRACTION)
  const blocked = (y: number) => {
    if (gap(y) <= limit) return true
    const opening = gap(y)
    const shift = Math.max(0, Math.min(SWALE_CLEARANCE, opening * SWALE_CLEARANCE_FRACTION))
    const probe = shift + SWALE_SURFACE_GAP
    const landPoint = nudge(pointAtY(landFace, y), yaw, probe)
    const seaPoint = nudge(pointAtY(seaFace, y), yaw, -probe)
    return pointInsideRidge(scene, seaBody, landPoint) || pointInsideRidge(scene, landBody, seaPoint)
  }
  if (blocked(hi)) return hi
  const steps = 24
  let prev = hi
  for (let s = 1; s <= steps; s += 1) {
    const y = hi + ((lo - hi) * s) / steps
    if (blocked(y)) {
      let open = prev
      let closed = y
      for (let n = 0; n < 12; n += 1) {
        const mid = (open + closed) / 2
        if (blocked(mid)) closed = mid
        else open = mid
      }
      return open
    }
    prev = y
  }
  return lo
}

/**
 * Move each side into the opening along the seaward axis, at constant height.
 * A downward nudge from the crest would enter the ridge; a horizontal one does not.
 */
function insetPair(
  land: SwalePoint[],
  sea: SwalePoint[],
  yaw: number,
): { land: SwalePoint[]; sea: SwalePoint[] } {
  const axis = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) }
  const nextLand: SwalePoint[] = []
  const nextSea: SwalePoint[] = []
  for (let i = 0; i < land.length; i += 1) {
    const gap = seawardOf(yaw, sea[i]) - seawardOf(yaw, land[i])
    const shift = Math.max(0, Math.min(SWALE_CLEARANCE, gap * SWALE_CLEARANCE_FRACTION))
    nextLand.push({
      x: land[i].x + axis.x * shift,
      y: land[i].y,
      z: land[i].z + axis.z * shift,
    })
    nextSea.push({
      x: sea[i].x - axis.x * shift,
      y: sea[i].y,
      z: sea[i].z - axis.z * shift,
    })
  }
  return { land: nextLand, sea: nextSea }
}

function sectionAt(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landRing: RidgeCorner[],
  seaRing: RidgeCorner[],
): { land: SwalePoint[]; sea: SwalePoint[]; landCrest: SwalePoint; seaCrest: SwalePoint } {
  const yaw = landBody.yaw ?? 0
  const landFace = silhouette(landRing, 'seaward').map((point) => worldFromBody(landBody, point))
  const seaFace = silhouette(seaRing, 'landward').map((point) => worldFromBody(seaBody, point))
  const yCut = meetingY(scene, landBody, seaBody, landFace, seaFace, yaw)
  const land = resample(clipDown(landFace, yCut), SWALE_FACE)
  const sea = resample(clipDown(seaFace, yCut), SWALE_FACE)
  const fitted = insetPair(land, sea, yaw)
  return {
    land: fitted.land,
    sea: fitted.sea,
    landCrest: landFace[0],
    seaCrest: seaFace[0],
  }
}

function outward(positions: number[], a: number, b: number, c: number): boolean {
  const ax = positions[a * 3]
  const ay = positions[a * 3 + 1]
  const az = positions[a * 3 + 2]
  const bx = positions[b * 3] - ax
  const by = positions[b * 3 + 1] - ay
  const bz = positions[b * 3 + 2] - az
  const cx = positions[c * 3] - ax
  const cy = positions[c * 3 + 1] - ay
  const cz = positions[c * 3 + 2] - az
  const nx = by * cz - bz * cy
  const ny = bz * cx - bx * cz
  const nz = bx * cy - by * cx
  return nx * ax + ny * ay + nz * az > 0
}

function pushTri(indices: number[], positions: number[], a: number, b: number, c: number) {
  if (outward(positions, a, b, c)) indices.push(a, b, c)
  else indices.push(a, c, b)
}

function pushQuad(indices: number[], positions: number[], a: number, b: number, c: number, d: number) {
  pushTri(indices, positions, a, b, c)
  pushTri(indices, positions, a, c, d)
}

function buildMesh(sections: { land: SwalePoint[]; sea: SwalePoint[] }[]): {
  positions: number[]
  indices: number[]
  origin: SwalePoint
} {
  const ring = SWALE_FACE * 2
  const positions: number[] = []
  for (const section of sections) {
    for (const point of section.land) positions.push(point.x, point.y, point.z)
    for (let i = section.sea.length - 1; i >= 0; i -= 1) {
      const point = section.sea[i]
      positions.push(point.x, point.y, point.z)
    }
  }
  let sx = 0
  let sy = 0
  let sz = 0
  const count = positions.length / 3
  for (let i = 0; i < positions.length; i += 3) {
    sx += positions[i]
    sy += positions[i + 1]
    sz += positions[i + 2]
  }
  const origin = { x: sx / count, y: sy / count, z: sz / count }
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= origin.x
    positions[i + 1] -= origin.y
    positions[i + 2] -= origin.z
  }
  const indices: number[] = []
  const samples = sections.length
  for (let s = 0; s < samples - 1; s += 1) {
    for (let i = 0; i < ring; i += 1) {
      const next = (i + 1) % ring
      pushQuad(indices, positions, s * ring + i, (s + 1) * ring + i, (s + 1) * ring + next, s * ring + next)
    }
  }
  for (let i = 1; i < ring - 1; i += 1) pushTri(indices, positions, 0, i + 1, i)
  const tip = (samples - 1) * ring
  for (let i = 1; i < ring - 1; i += 1) pushTri(indices, positions, tip, tip + i, tip + i + 1)
  return { positions, indices, origin }
}

function shapeBetween(scene: SchematicSceneId, land: SceneBody, sea: SceneBody): SwaleShape {
  const landStations = stationsFor(scene, land)
  const seaStations = stationsFor(scene, sea)
  const sections: { land: SwalePoint[]; sea: SwalePoint[] }[] = []
  const landCrest: SwalePoint[] = []
  const seaCrest: SwalePoint[] = []
  for (let i = 0; i < SWALE_ALONG; i += 1) {
    const t = i / (SWALE_ALONG - 1)
    const section = sectionAt(scene, land, sea, loftedRing(landStations, t), loftedRing(seaStations, t))
    sections.push(section)
    landCrest.push(section.landCrest)
    seaCrest.push(section.seaCrest)
  }
  const mesh = buildMesh(sections)
  return {
    id: land.id.replace(/^e-ridge-/, 'e-swale-'),
    parentId: land.parentId,
    origin: mesh.origin,
    positions: mesh.positions,
    indices: mesh.indices,
    landCrest,
    seaCrest,
  }
}

/**
 * One swale for each gap in a beach-ridge set. The sides follow that pair’s
 * lofts (symmetric, asymmetric, or convex-seaward). The top joins the facing
 * crests, so it steps down seaward with the ridges. The floor is where the
 * two hypotenuses meet.
 */
export function swaleShapes(scene: SchematicSceneId, bodies: SceneBody[]): SwaleShape[] {
  const key = cacheKey(scene, bodies)
  const hit = shapeCache.get(key)
  if (hit) return hit
  const groups = new Map<string, SceneBody[]>()
  for (const body of bodies) {
    if (body.kind !== 'beach-ridge') continue
    const groupKey = body.parentId ?? body.id
    const group = groups.get(groupKey) ?? []
    group.push(body)
    groups.set(groupKey, group)
  }
  const shapes: SwaleShape[] = []
  for (const ridges of groups.values()) {
    const sorted = [...ridges].sort((a, b) => ridgeIndex(a.id) - ridgeIndex(b.id))
    for (let i = 0; i < sorted.length - 1; i += 1) shapes.push(shapeBetween(scene, sorted[i], sorted[i + 1]))
  }
  shapeCache.set(key, shapes)
  return shapes
}

export function swaleShape(scene: SchematicSceneId, bodies: SceneBody[], id: string): SwaleShape {
  const shape = swaleShapes(scene, bodies).find((entry) => entry.id === id)
  if (!shape) throw new Error(`Missing swale ${id}`)
  return shape
}

/** Scene elements for the swales in `bodies`. Geometry stays centred on `nested`. */
export function swaleBodies(scene: SchematicSceneId, bodies: SceneBody[]): SceneBody[] {
  return swaleShapes(scene, bodies).map((shape) => ({
    id: shape.id,
    name: 'Swale',
    rank: 'element' as const,
    parentId: shape.parentId,
    kind: 'swale' as const,
    nested: shape.origin,
  }))
}

function ringAt(stations: RidgeStation[], x: number): RidgeCorner[] | null {
  const minX = Math.min(stations[0].x, stations[stations.length - 1].x)
  const maxX = Math.max(stations[0].x, stations[stations.length - 1].x)
  if (x < minX - 1e-4 || x > maxX + 1e-4) return null
  let bestT = 0
  let best = Infinity
  const steps = (stations.length - 1) * 4
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const ringX = loftedRing(stations, t)[0].x
    const delta = Math.abs(ringX - x)
    if (delta < best) {
      best = delta
      bestT = t
    }
  }
  if (best > 1e-3) return null
  return loftedRing(stations, bestT)
}

function ringContains(ring: RidgeCorner[], y: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const yi = ring[i].y
    const zi = ring[i].z
    const yj = ring[j].y
    const zj = ring[j].z
    const crosses = yi > y !== yj > y
    const atZ = zi + ((zj - zi) * (y - yi)) / (yj - yi)
    if (crosses && z < atZ) inside = !inside
  }
  return inside
}

/** True when `world` sits in the interior of this beach-ridge loft. */
export function pointInsideRidge(scene: SchematicSceneId, ridge: SceneBody, world: SwalePoint): boolean {
  const local = localFromBody(ridge, world)
  const ring = ringAt(stationsFor(scene, ridge), local.x)
  if (!ring) return false
  return ringContains(ring, local.y, local.z)
}
