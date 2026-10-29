import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { beachRidgeMesh, ridgeFlankSide, type SchematicSceneId } from './schematicScene'
import {
  beachRidgeRing,
  beachRidgeStations,
  GROUND_THICKNESS,
  waterlineY,
  type SceneBody,
} from './wfSchematic'

/** Samples along each crest. Station counts differ between lofts, so both crests share this parameter. */
const SWALE_SAMPLES = 24

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
  /** World Y of the water-slab top this wedge was built against. */
  waterY: number
  /** World crest samples. Landward ridge’s seaward crest, then the seaward ridge’s landward crest. */
  landCrest: SwalePoint[]
  seaCrest: SwalePoint[]
}

const shapeCache = new Map<string, SwaleShape[]>()

function cacheKey(scene: SchematicSceneId, bodies: SceneBody[]): string {
  const parts: string[] = [scene]
  for (const body of bodies) {
    if (body.kind !== 'beach-ridge' && body.kind !== 'ground') continue
    parts.push(
      [
        body.id,
        body.kind,
        body.parentId ?? '',
        body.nested.x,
        body.nested.y,
        body.nested.z,
        body.yaw ?? 0,
      ].join(','),
    )
  }
  return parts.join('|')
}

function ridgeIndex(id: string): number {
  const index = Number(id.slice(id.lastIndexOf('-') + 1))
  return Number.isFinite(index) ? index : 0
}

function stationsFor(scene: SchematicSceneId, body: SceneBody) {
  const side = ridgeFlankSide(body.id)
  const index = ridgeIndex(body.id)
  const loft = beachRidgeMesh(scene, body.id)
  if (loft === 'convex-sw') return brConvexSwStations(side, index)
  if (loft === 'asymmetric') return asymmetricBeachRidgeStations(side, index)
  return beachRidgeStations(side, index)
}

/** Top of the water slab. A missing ground body falls back to the channel water line. */
export function swaleWaterY(bodies: SceneBody[]): number {
  const ground = bodies.find((body) => body.id === 'ecs') ?? bodies.find((body) => body.kind === 'ground')
  if (!ground) return waterlineY()
  return ground.nested.y + GROUND_THICKNESS / 2
}

function worldFromBody(body: SceneBody, local: SwalePoint): SwalePoint {
  const yaw = body.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: body.nested.x + local.x * cos + local.z * sin,
    y: body.nested.y + local.y,
    z: body.nested.z - local.x * sin + local.z * cos,
  }
}

/**
 * One crest corner in world space. `sea` is the seaward crown edge and `land`
 * is the landward crown edge. Both sit on `station.height`, so the swale meets
 * the top of the ridge rather than its face.
 */
function crestCorner(station: ReturnType<typeof beachRidgeStations>[number], edge: 'land' | 'sea'): SwalePoint {
  let bestZ = edge === 'sea' ? -Infinity : Infinity
  let chosen = { x: station.x, y: station.height, z: station.z }
  for (const corner of beachRidgeRing(station)) {
    if (corner.y !== station.height) continue
    const seaward = edge === 'sea' ? corner.z > bestZ : corner.z < bestZ
    if (!seaward) continue
    bestZ = corner.z
    chosen = { x: corner.x, y: corner.y, z: corner.z }
  }
  return chosen
}

/** Crest polyline of one beach ridge, in world space, channel end to tip. */
export function ridgeCrestWorld(scene: SchematicSceneId, body: SceneBody, edge: 'land' | 'sea'): SwalePoint[] {
  return stationsFor(scene, body).map((station) => worldFromBody(body, crestCorner(station, edge)))
}

function distance(a: SwalePoint, b: SwalePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function lerp(a: SwalePoint, b: SwalePoint, u: number): SwalePoint {
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
  }
}

/** Shared parameter from channel end to tip. Lofts do not share a station count. */
function resample(points: SwalePoint[], count: number): SwalePoint[] {
  if (points.length === 0) return []
  if (count <= 1) return [{ ...points[0] }]
  const lengths = [0]
  for (let i = 1; i < points.length; i += 1) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]))
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

function pushPoint(positions: number[], point: SwalePoint) {
  positions.push(point.x, point.y, point.z)
}

function normalY(positions: number[], a: number, b: number, c: number): number {
  const ax = positions[a * 3]
  const az = positions[a * 3 + 2]
  const bx = positions[b * 3] - ax
  const bz = positions[b * 3 + 2] - az
  const cx = positions[c * 3] - ax
  const cz = positions[c * 3 + 2] - az
  return bz * cx - bx * cz
}

/**
 * Closed wedge. The top is the ruled surface between the two crests. The floor
 * is the water-slab top, and never rises above a crest that already sits lower.
 */
function wedge(land: SwalePoint[], sea: SwalePoint[], waterY: number): { positions: number[]; indices: number[] } {
  const positions: number[] = []
  const indices: number[] = []
  const count = land.length
  for (let i = 0; i < count; i += 1) {
    pushPoint(positions, land[i])
    pushPoint(positions, sea[i])
    pushPoint(positions, { x: land[i].x, y: Math.min(land[i].y, waterY), z: land[i].z })
    pushPoint(positions, { x: sea[i].x, y: Math.min(sea[i].y, waterY), z: sea[i].z })
  }
  const at = (sample: number, slot: number) => sample * 4 + slot
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }
  for (let i = 0; i < count - 1; i += 1) {
    quad(at(i, 0), at(i, 1), at(i + 1, 1), at(i + 1, 0))
    quad(at(i, 0), at(i + 1, 0), at(i + 1, 2), at(i, 2))
    quad(at(i, 1), at(i, 3), at(i + 1, 3), at(i + 1, 1))
    quad(at(i, 2), at(i + 1, 2), at(i + 1, 3), at(i, 3))
  }
  quad(at(0, 0), at(0, 2), at(0, 3), at(0, 1))
  quad(at(count - 1, 0), at(count - 1, 1), at(count - 1, 3), at(count - 1, 2))
  if (normalY(positions, indices[0], indices[1], indices[2]) < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }
  return { positions, indices }
}

function shapeBetween(
  scene: SchematicSceneId,
  land: SceneBody,
  sea: SceneBody,
  waterY: number,
): SwaleShape {
  const landCrest = resample(ridgeCrestWorld(scene, land, 'sea'), SWALE_SAMPLES)
  const seaCrest = resample(ridgeCrestWorld(scene, sea, 'land'), SWALE_SAMPLES)
  const mesh = wedge(landCrest, seaCrest, waterY)
  let sx = 0
  let sy = 0
  let sz = 0
  const count = mesh.positions.length / 3
  for (let i = 0; i < mesh.positions.length; i += 3) {
    sx += mesh.positions[i]
    sy += mesh.positions[i + 1]
    sz += mesh.positions[i + 2]
  }
  const origin = { x: sx / count, y: sy / count, z: sz / count }
  const positions = mesh.positions.slice()
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= origin.x
    positions[i + 1] -= origin.y
    positions[i + 2] -= origin.z
  }
  return {
    id: land.id.replace(/^e-ridge-/, 'e-swale-'),
    parentId: land.parentId,
    origin,
    positions,
    indices: mesh.indices,
    waterY,
    landCrest,
    seaCrest,
  }
}

/**
 * One swale for each gap in a beach-ridge set. The crest follows that ridge’s
 * loft (symmetric, asymmetric, or convex-seaward). The floor follows the water
 * slab in `bodies`.
 */
export function swaleShapes(scene: SchematicSceneId, bodies: SceneBody[]): SwaleShape[] {
  const key = cacheKey(scene, bodies)
  const hit = shapeCache.get(key)
  if (hit) return hit
  const waterY = swaleWaterY(bodies)
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
    for (let i = 0; i < sorted.length - 1; i += 1) {
      shapes.push(shapeBetween(scene, sorted[i], sorted[i + 1], waterY))
    }
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
    rank: 'element',
    parentId: shape.parentId,
    kind: 'swale',
    nested: shape.origin,
  }))
}
