import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { beachRidgeMesh, ridgeFlankSide, type SchematicSceneId } from './schematicScene'
import { pointInsideRidge, swaleFloorY, type SwalePoint } from './swale'
import {
  beachRidgeRing,
  beachRidgeStations,
  type RidgeCorner,
  type RidgeStation,
  type SceneBody,
} from './wfSchematic'

/** Stone, distinct from the gold ridges and the green swale. */
export const SHALE_COLOUR = 0x78716c

/**
 * Horizontal inset off each facing hypotenuse. Matches the swale so the two
 * wedges share an edge and neither enters a beach ridge.
 */
const SHALE_CLEARANCE = 0.012

/** Extra probe past the inset, so a vertex is not left sitting on the ridge surface. */
const SHALE_SURFACE_GAP = 0.002

/** The shale top sits just under the swale floor so the two faces do not flicker. */
const SHALE_UNDER_SWALE = 0.002

/** Sections thinner than this are the closed pinch and are left out. */
const SHALE_MIN_THICKNESS = 0.004

export interface ShaleShape {
  id: string
  parentId: string | null
  /** World centroid. The mesh is stored around this origin so explode can move the solid. */
  origin: SwalePoint
  /** Local positions. World = origin + position. */
  positions: number[]
  indices: number[]
  /** Top against the swale, channel end to tip, after the clearance inset. */
  topLand: SwalePoint[]
  topSea: SwalePoint[]
  /** Bottom of the open gap, channel end to tip, after the clearance inset. */
  footLand: SwalePoint[]
  footSea: SwalePoint[]
}

const shapeCache = new Map<string, ShaleShape[]>()

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

function seawardOf(yaw: number, point: SwalePoint): number {
  return point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
}

function seawardCorners(ring: RidgeCorner[]): RidgeCorner[] {
  const crest = ring.length - 2
  const face: RidgeCorner[] = [ring[crest]]
  for (let i = crest - 1; i >= 1; i -= 1) face.push(ring[i])
  return face
}

function landwardCorners(ring: RidgeCorner[]): RidgeCorner[] {
  return [ring[ring.length - 1], ring[0]]
}

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

/** Polyline is ordered from high Y to low Y. Keep the span from yHigh down to yLow. */
function clipRange(poly: SwalePoint[], yHigh: number, yLow: number): SwalePoint[] {
  const out: SwalePoint[] = [pointAtY(poly, yHigh)]
  for (const point of poly) {
    if (point.y < yHigh - 1e-6 && point.y > yLow + 1e-6) out.push(point)
  }
  const end = pointAtY(poly, yLow)
  const last = out[out.length - 1]
  if (Math.abs(end.y - last.y) > 1e-6 || Math.abs(end.z - last.z) > 1e-6 || Math.abs(end.x - last.x) > 1e-6) {
    out.push(end)
  }
  return out
}

function gapAt(landFace: SwalePoint[], seaFace: SwalePoint[], yaw: number, y: number): number {
  return seawardOf(yaw, pointAtY(seaFace, y)) - seawardOf(yaw, pointAtY(landFace, y))
}

function blocked(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landFace: SwalePoint[],
  seaFace: SwalePoint[],
  yaw: number,
  y: number,
): boolean {
  const probe = SHALE_CLEARANCE + SHALE_SURFACE_GAP
  if (gapAt(landFace, seaFace, yaw, y) <= probe * 2) return true
  const landPoint = nudge(pointAtY(landFace, y), yaw, probe)
  const seaPoint = nudge(pointAtY(seaFace, y), yaw, -probe)
  return pointInsideRidge(scene, seaBody, landPoint) || pointInsideRidge(scene, landBody, seaPoint)
}

/**
 * First Y, walking down from yTop, where the opening can no longer hold the
 * inset. The walk stops at that meeting. It does not continue into a cavity
 * below the pinch.
 */
function firstClosure(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landFace: SwalePoint[],
  seaFace: SwalePoint[],
  yaw: number,
  yTop: number,
  yBase: number,
): number {
  const blockedAt = (y: number) => blocked(scene, landBody, seaBody, landFace, seaFace, yaw, y)
  if (blockedAt(yTop)) return yTop
  const steps = 32
  let prev = yTop
  for (let s = 1; s <= steps; s += 1) {
    const y = yTop + ((yBase - yTop) * s) / steps
    if (blockedAt(y)) {
      let open = prev
      let closed = y
      for (let n = 0; n < 12; n += 1) {
        const mid = (open + closed) / 2
        if (blockedAt(mid)) closed = mid
        else open = mid
      }
      return open
    }
    prev = y
  }
  return yBase
}

/** Same limit the swale uses for its floor: the slab, or higher where the faces already meet. */
function swaleUnderside(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landFace: SwalePoint[],
  seaFace: SwalePoint[],
  yaw: number,
  floorY: number,
): number {
  const hi = Math.min(landFace[0].y, seaFace[0].y)
  const lo = Math.max(landFace[landFace.length - 1].y, seaFace[seaFace.length - 1].y)
  const meet = firstClosure(scene, landBody, seaBody, landFace, seaFace, yaw, hi, lo)
  return Math.max(meet, floorY)
}

interface ShaleSection {
  land: SwalePoint[]
  sea: SwalePoint[]
}

interface FacingPair {
  yaw: number
  landFace: SwalePoint[]
  seaFace: SwalePoint[]
  /** Higher of the two bases. Both hypotenuses still exist at this Y. */
  yBase: number
  /** Just under the swale, where a shale is allowed to stop. */
  yCap: number
}

function facingPair(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  landRing: RidgeCorner[],
  seaRing: RidgeCorner[],
  floorY: number,
): FacingPair {
  const yaw = landBody.yaw ?? 0
  const landFace = seawardCorners(landRing).map((point) => worldFromBody(landBody, point))
  const seaFace = landwardCorners(seaRing).map((point) => worldFromBody(seaBody, point))
  const yBase = Math.max(landFace[landFace.length - 1].y, seaFace[seaFace.length - 1].y)
  const underside = swaleUnderside(scene, landBody, seaBody, landFace, seaFace, yaw, floorY)
  const yCap = Math.min(underside - SHALE_UNDER_SWALE, landFace[0].y, seaFace[0].y)
  return { yaw, landFace, seaFace, yBase, yCap }
}

function emitSection(pair: FacingPair, yTop: number, yFloor: number): ShaleSection | null {
  if (yTop - yFloor < SHALE_MIN_THICKNESS) return null
  const land = clipRange(pair.landFace, yTop, yFloor).map((point) => nudge(point, pair.yaw, SHALE_CLEARANCE))
  const sea = clipRange(pair.seaFace, yTop, yFloor).map((point) => nudge(point, pair.yaw, -SHALE_CLEARANCE))
  if (land.length < 2 || sea.length < 2) return null
  if (seawardOf(pair.yaw, sea[0]) - seawardOf(pair.yaw, land[0]) <= 0) return null
  if (seawardOf(pair.yaw, sea[sea.length - 1]) - seawardOf(pair.yaw, land[land.length - 1]) <= 0) return null
  return { land, sea }
}

/** Open gap directly under the swale, down to the first meeting of the two faces. */
function sectionUnderSwale(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  pair: FacingPair,
): ShaleSection | null {
  if (pair.yCap - pair.yBase < SHALE_MIN_THICKNESS) return null
  const yFloor = firstClosure(scene, landBody, seaBody, pair.landFace, pair.seaFace, pair.yaw, pair.yCap, pair.yBase)
  return emitSection(pair, pair.yCap, yFloor)
}

/** First Y at or above the bases where the inset still fits. */
function firstOpen(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  pair: FacingPair,
): number | null {
  const blockedAt = (y: number) => blocked(scene, landBody, seaBody, pair.landFace, pair.seaFace, pair.yaw, y)
  if (!blockedAt(pair.yBase)) return pair.yBase
  const steps = 24
  for (let s = 1; s <= steps; s += 1) {
    const y = pair.yBase + ((pair.yCap - pair.yBase) * s) / steps
    if (!blockedAt(y)) return y
  }
  return null
}

/** Walking up from an open Y, the last Y that can still hold the inset. */
function closureAbove(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  pair: FacingPair,
  yStart: number,
): number {
  const blockedAt = (y: number) => blocked(scene, landBody, seaBody, pair.landFace, pair.seaFace, pair.yaw, y)
  if (blockedAt(yStart)) return yStart
  const steps = 32
  let prev = yStart
  for (let s = 1; s <= steps; s += 1) {
    const y = yStart + ((pair.yCap - yStart) * s) / steps
    if (blockedAt(y)) {
      let open = prev
      let closed = y
      for (let n = 0; n < 12; n += 1) {
        const mid = (open + closed) / 2
        if (blockedAt(mid)) closed = mid
        else open = mid
      }
      return open
    }
    prev = y
  }
  return pair.yCap
}

/**
 * Open gap above the bases, up to the meeting of the two faces. Used when the
 * band directly under the swale is already closed, as on a uniform convex loft.
 */
function sectionAboveBases(
  scene: SchematicSceneId,
  landBody: SceneBody,
  seaBody: SceneBody,
  pair: FacingPair,
): ShaleSection | null {
  const yStart = firstOpen(scene, landBody, seaBody, pair)
  if (yStart == null) return null
  const yEnd = closureAbove(scene, landBody, seaBody, pair, yStart)
  return emitSection(pair, yEnd, yStart)
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
  sections: ShaleSection[],
): { positions: number[]; indices: number[]; origin: SwalePoint } {
  const positions: number[] = []
  const landIds: number[][] = []
  const seaIds: number[][] = []
  for (const section of sections) {
    landIds.push(
      section.land.map((point) => {
        const id = positions.length / 3
        positions.push(point.x, point.y, point.z)
        return id
      }),
    )
    seaIds.push(
      section.sea.map((point) => {
        const id = positions.length / 3
        positions.push(point.x, point.y, point.z)
        return id
      }),
    )
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
  return {
    positions,
    indices: trimOverlap(scene, landBody, seaBody, positions, indices, origin),
    origin,
  }
}

function shapeBetween(scene: SchematicSceneId, land: SceneBody, sea: SceneBody, floorY: number): ShaleShape | null {
  const landStations = stationsFor(scene, land)
  const seaStations = stationsFor(scene, sea)
  const pairs = parameterSamples(landStations.length, seaStations.length).map((t) =>
    facingPair(scene, land, sea, loftedRing(landStations, t), loftedRing(seaStations, t), floorY),
  )
  let sections = pairs
    .map((pair) => sectionUnderSwale(scene, land, sea, pair))
    .filter((section): section is ShaleSection => section != null)
  if (sections.length < 2) {
    sections = pairs
      .map((pair) => sectionAboveBases(scene, land, sea, pair))
      .filter((section): section is ShaleSection => section != null)
  }
  if (sections.length < 2) return null
  const mesh = buildMesh(scene, land, sea, sections)
  return {
    id: land.id.replace(/^e-ridge-/, 'e-shale-'),
    parentId: land.parentId,
    origin: mesh.origin,
    positions: mesh.positions,
    indices: mesh.indices,
    topLand: sections.map((section) => section.land[0]),
    topSea: sections.map((section) => section.sea[0]),
    footLand: sections.map((section) => section.land[section.land.length - 1]),
    footSea: sections.map((section) => section.sea[section.sea.length - 1]),
  }
}

/**
 * One shale for each gap in a beach-ridge set. The sides follow that pair’s
 * lofts. The wedge fills the open band under the swale, down to the bases or
 * to the first meeting of the facing hypotenuses. Beside the channel that
 * meeting sits near the swale, so the wedge is thin; toward the tip the gap
 * stays open and the wedge runs down to the bases. A uniform convex loft meets
 * along its whole length just under the swale, so that wedge instead fills
 * from the bases up to the meeting.
 */
export function shaleShapes(scene: SchematicSceneId, bodies: SceneBody[]): ShaleShape[] {
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
  const shapes: ShaleShape[] = []
  for (const ridges of groups.values()) {
    const sorted = [...ridges].sort((a, b) => ridgeIndex(a.id) - ridgeIndex(b.id))
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const shape = shapeBetween(scene, sorted[i], sorted[i + 1], floorY)
      if (shape) shapes.push(shape)
    }
  }
  shapeCache.set(key, shapes)
  return shapes
}

export function shaleShape(scene: SchematicSceneId, bodies: SceneBody[], id: string): ShaleShape {
  const shape = shaleShapes(scene, bodies).find((entry) => entry.id === id)
  if (!shape) throw new Error(`Missing shale ${id}`)
  return shape
}

/** Scene elements for the shales in `bodies`. Geometry stays centred on `nested`. */
export function shaleBodies(scene: SchematicSceneId, bodies: SceneBody[]): SceneBody[] {
  return shaleShapes(scene, bodies).map((shape) => ({
    id: shape.id,
    name: 'Shale',
    rank: 'element' as const,
    parentId: shape.parentId,
    kind: 'shale' as const,
    nested: shape.origin,
  }))
}
