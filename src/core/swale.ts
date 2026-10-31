import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { beachRidgeMesh, ridgeFlankSide, type SchematicSceneId } from './schematicScene'
import {
  beachRidgeRing,
  beachRidgeStations,
  GROUND_THICKNESS,
  waterlineY,
  type RidgeCorner,
  type RidgeStation,
  type SceneBody,
} from './wfSchematic'

/**
 * Horizontal inset off each facing hypotenuse. One shift for every vertex, so
 * each swale edge stays parallel to the beach-ridge edge it traces.
 */
const SWALE_CLEARANCE = 0.012

/** Extra probe past the inset, so a vertex is not left sitting on the ridge surface. */
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
  /** Local positions. World = origin + position. */
  positions: number[]
  indices: number[]
  /** Seaward crown of the landward ridge, channel end to tip, before the clearance inset. */
  landCrest: SwalePoint[]
  /** Landward crown of the seaward ridge, channel end to tip, before the clearance inset. */
  seaCrest: SwalePoint[]
}

const shapeCache = new Map<string, SwaleShape[]>()

/** World Y of the water-slab top. The swale floor never goes below this. */
export function swaleFloorY(bodies: SceneBody[]): number {
  const ground = bodies.find((body) => body.kind === 'ground')
  if (!ground) return waterlineY()
  return ground.nested.y + GROUND_THICKNESS / 2
}

function cacheKey(scene: SchematicSceneId, bodies: SceneBody[]): string {
  const parts: string[] = [scene, String(swaleFloorY(bodies))]
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

/** Seaward hypotenuse: crest, down the face corners, to the seaward base. */
function seawardCorners(ring: RidgeCorner[]): RidgeCorner[] {
  const crest = ring.length - 2
  const face: RidgeCorner[] = [ring[crest]]
  for (let i = crest - 1; i >= 1; i -= 1) face.push(ring[i])
  return face
}

/** Landward hypotenuse: crest to the landward base. */
function landwardCorners(ring: RidgeCorner[]): RidgeCorner[] {
  return [ring[ring.length - 1], ring[0]]
}

/** Station parameters of both lofts, so a swale edge never skips a ridge vertex. */
function parameterSamples(a: number, b: number): number[] {
  const raw: number[] = []
  for (let i = 0; i < a; i += 1) raw.push(a === 1 ? 0 : i / (a - 1))
  for (let i = 0; i < b; i += 1) raw.push(b === 1 ? 0 : i / (b - 1))
  raw.sort((left, right) => left - right)
  const out: number[] = []
  for (const value of raw) {
    if (out.length === 0 || value - out[out.length - 1] > 1e-6) out.push(value)
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

/**
 * First Y, walking down from the lower crest, where the opening can no longer
 * hold the inset. Below that the faces occupy the same ground, so the swale stops.
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
  const probe = SWALE_CLEARANCE + SWALE_SURFACE_GAP
  const blocked = (y: number) => {
    if (gap(y) <= probe * 2) return true
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

function sectionAt(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landRing: RidgeCorner[],
  seaRing: RidgeCorner[],
  floorY: number,
): { land: SwalePoint[]; sea: SwalePoint[]; landCrest: SwalePoint; seaCrest: SwalePoint } | null {
  const yaw = landBody.yaw ?? 0
  const landFace = seawardCorners(landRing).map((point) => worldFromBody(landBody, point))
  const seaFace = landwardCorners(seaRing).map((point) => worldFromBody(seaBody, point))
  const yCut = Math.max(meetingY(scene, landBody, seaBody, landFace, seaFace, yaw), floorY)
  const land = clipDown(landFace, yCut).map((point) => nudge(point, yaw, SWALE_CLEARANCE))
  const sea = clipDown(seaFace, yCut).map((point) => nudge(point, yaw, -SWALE_CLEARANCE))
  if (land.length < 2 || sea.length < 2) return null
  if (land[0].y < floorY - 1e-6 || sea[0].y < floorY - 1e-6) return null
  return { land, sea, landCrest: landFace[0], seaCrest: seaFace[0] }
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
  if (a === b || b === c || a === c) return
  if (outward(positions, a, b, c)) indices.push(a, b, c)
  else indices.push(a, c, b)
}

function pushQuad(indices: number[], positions: number[], a: number, b: number, c: number, d: number) {
  pushTri(indices, positions, a, b, c)
  pushTri(indices, positions, a, c, d)
}

/** Triangles between two crest-to-foot polylines. Edges along each polyline stay on that face. */
function zipper(indices: number[], positions: number[], left: number[], right: number[]) {
  let i = 0
  let j = 0
  while (i < left.length - 1 || j < right.length - 1) {
    const nextLeft = i < left.length - 1
    const nextRight = j < right.length - 1
    const stepLeft =
      nextLeft &&
      (!nextRight || positions[left[i + 1] * 3 + 1] >= positions[right[j + 1] * 3 + 1])
    if (stepLeft) {
      pushTri(indices, positions, left[i], left[i + 1], right[j])
      i += 1
    } else {
      pushTri(indices, positions, left[i], right[j + 1], right[j])
      j += 1
    }
  }
}

function worldAt(positions: number[], index: number, origin: SwalePoint): SwalePoint {
  return {
    x: positions[index * 3] + origin.x,
    y: positions[index * 3 + 1] + origin.y,
    z: positions[index * 3 + 2] + origin.z,
  }
}

function triangleHitsRidge(
  scene: SchematicSceneId,
  land: SceneBody,
  sea: SceneBody,
  positions: number[],
  origin: SwalePoint,
  a: number,
  b: number,
  c: number,
): boolean {
  const pa = worldAt(positions, a, origin)
  const pb = worldAt(positions, b, origin)
  const pc = worldAt(positions, c, origin)
  const mid = (p: SwalePoint, q: SwalePoint): SwalePoint => ({
    x: (p.x + q.x) / 2,
    y: (p.y + q.y) / 2,
    z: (p.z + q.z) / 2,
  })
  const samples = [
    pa,
    pb,
    pc,
    mid(pa, pb),
    mid(pb, pc),
    mid(pc, pa),
    { x: (pa.x + pb.x + pc.x) / 3, y: (pa.y + pb.y + pc.y) / 3, z: (pa.z + pb.z + pc.z) / 3 },
  ]
  return samples.some((point) => pointInsideRidge(scene, land, point) || pointInsideRidge(scene, sea, point))
}

/**
 * Split triangles that still cross a ridge. The convex plan can bow into a
 * straight connector even when the face corners themselves sit in the gap.
 * Pieces that remain inside the ridge are left out.
 */
function trimOverlap(
  scene: SchematicSceneId,
  land: SceneBody,
  sea: SceneBody,
  positions: number[],
  indices: number[],
  origin: SwalePoint,
): number[] {
  const midpoint = (i: number, j: number) => {
    const id = positions.length / 3
    positions.push(
      (positions[i * 3] + positions[j * 3]) / 2,
      (positions[i * 3 + 1] + positions[j * 3 + 1]) / 2,
      (positions[i * 3 + 2] + positions[j * 3 + 2]) / 2,
    )
    return id
  }
  const out: number[] = []
  const emit = (a: number, b: number, c: number, depth: number) => {
    if (!triangleHitsRidge(scene, land, sea, positions, origin, a, b, c)) {
      out.push(a, b, c)
      return
    }
    if (depth === 0) return
    const ab = midpoint(a, b)
    const bc = midpoint(b, c)
    const ca = midpoint(c, a)
    emit(a, ab, ca, depth - 1)
    emit(ab, b, bc, depth - 1)
    emit(ca, bc, c, depth - 1)
    emit(ab, bc, ca, depth - 1)
  }
  for (let t = 0; t < indices.length; t += 3) emit(indices[t], indices[t + 1], indices[t + 2], 4)
  const used = new Map<number, number>()
  const packed: number[] = []
  const remapped: number[] = []
  for (const index of out) {
    let id = used.get(index)
    if (id === undefined) {
      id = packed.length / 3
      used.set(index, id)
      packed.push(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2])
    }
    remapped.push(id)
  }
  positions.length = 0
  positions.push(...packed)
  return remapped
}

function buildMesh(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  sections: { land: SwalePoint[]; sea: SwalePoint[] }[],
): {
  positions: number[]
  indices: number[]
  origin: SwalePoint
} {
  const positions: number[] = []
  const landIds: number[][] = []
  const seaIds: number[][] = []
  for (const section of sections) {
    landIds.push(section.land.map((point) => {
      const id = positions.length / 3
      positions.push(point.x, point.y, point.z)
      return id
    }))
    seaIds.push(section.sea.map((point) => {
      const id = positions.length / 3
      positions.push(point.x, point.y, point.z)
      return id
    }))
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
  for (let s = 0; s < sections.length - 1; s += 1) {
    zipper(indices, positions, landIds[s], landIds[s + 1])
    zipper(indices, positions, seaIds[s], seaIds[s + 1])
    pushQuad(indices, positions, landIds[s][0], landIds[s + 1][0], seaIds[s + 1][0], seaIds[s][0])
    const landFoot = landIds[s][landIds[s].length - 1]
    const landNext = landIds[s + 1][landIds[s + 1].length - 1]
    const seaFoot = seaIds[s][seaIds[s].length - 1]
    const seaNext = seaIds[s + 1][seaIds[s + 1].length - 1]
    pushQuad(indices, positions, landFoot, seaFoot, seaNext, landNext)
  }
  zipper(indices, positions, landIds[0], seaIds[0])
  const last = sections.length - 1
  zipper(indices, positions, landIds[last], seaIds[last])
  return { positions, indices: trimOverlap(scene, landBody, seaBody, positions, indices, origin), origin }
}

function shapeBetween(scene: SchematicSceneId, land: SceneBody, sea: SceneBody, floorY: number): SwaleShape {
  const landStations = stationsFor(scene, land)
  const seaStations = stationsFor(scene, sea)
  const sections: { land: SwalePoint[]; sea: SwalePoint[] }[] = []
  const landCrest: SwalePoint[] = []
  const seaCrest: SwalePoint[] = []
  for (const t of parameterSamples(landStations.length, seaStations.length)) {
    const section = sectionAt(
      scene,
      land,
      sea,
      loftedRing(landStations, t),
      loftedRing(seaStations, t),
      floorY,
    )
    if (!section) continue
    sections.push(section)
    landCrest.push(section.landCrest)
    seaCrest.push(section.seaCrest)
  }
  if (sections.length < 2) throw new Error(`Swale between ${land.id} and ${sea.id} is below the water slab`)
  const mesh = buildMesh(scene, land, sea, sections)
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
 * crests, so it steps down seaward with the ridges. The floor is the higher of
 * the water-slab top and the meeting of the two hypotenuses.
 */
export function swaleShapes(scene: SchematicSceneId, bodies: SceneBody[]): SwaleShape[] {
  const key = cacheKey(scene, bodies)
  const hit = shapeCache.get(key)
  if (hit) return hit
  const floorY = swaleFloorY(bodies)
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
    for (let i = 0; i < sorted.length - 1; i += 1) shapes.push(shapeBetween(scene, sorted[i], sorted[i + 1], floorY))
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

const sectionCache = new Map<string, RidgeCorner[] | null>()

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
  const key = `${scene}:${ridge.id}:${Math.round(local.x * 1e4)}`
  let ring = sectionCache.get(key)
  if (ring === undefined) {
    ring = ringAt(stationsFor(scene, ridge), local.x)
    sectionCache.set(key, ring)
  }
  if (!ring) return false
  return ringContains(ring, local.y, local.z)
}
