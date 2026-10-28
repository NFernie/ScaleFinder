import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { beachRidgeMesh, channelMesh, type SchematicSceneId } from './schematicScene'
import { tidalChannelFrameAt, tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  beachRidgeRing,
  beachRidgeStations,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  WATER_SLAB_DEPTH,
  WATER_SLAB_WIDTH,
  type SceneBody,
} from './wfSchematic'

/** Solid green. Mouth bars keep their lighter green. */
export const DELTA_PLAIN_COLOUR = 0x15803d

/** Sheet thickness. The top face sits on the source ridge's crest. */
export const DELTA_PLAIN_THICKNESS = 0.02

export interface DeltaPlainPoint {
  x: number
  z: number
}

export interface DeltaPlainShape {
  /** World Y of the top face: the crest of {@link DeltaPlainShape.heightSourceId}. */
  y: number
  /** Beach ridge whose base supplies `y`. */
  heightSourceId: string
  origin: { x: number; z: number }
  /** Local coordinates. The midplane is y = 0. */
  positions: number[]
  indices: number[]
}

const SAMPLE_STEP = 0.04

interface Span {
  z0: number
  z1: number
}

const shapeCache = new Map<string, DeltaPlainShape>()

function cacheKey(scene: SchematicSceneId, bodies: SceneBody[]): string {
  const parts: string[] = [scene]
  for (const body of bodies) {
    if (body.kind !== 'beach-ridge' && body.kind !== 'channel' && body.kind !== 'ground') continue
    parts.push(
      [
        body.id,
        body.nested.x,
        body.nested.y,
        body.nested.z,
        body.yaw ?? 0,
        body.channelLength ?? '',
        body.groundSpan?.width ?? '',
        body.groundSpan?.depth ?? '',
      ].join(','),
    )
  }
  return parts.join('|')
}

function worldXZ(body: SceneBody, x: number, z: number): DeltaPlainPoint {
  const yaw = body.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: body.nested.x + x * cos + z * sin,
    z: body.nested.z - x * sin + z * cos,
  }
}

function ridgeSide(id: string): 'l' | 'r' {
  return id.includes('-r-') ? 'r' : 'l'
}

function ridgeIndexOf(id: string): number {
  const index = Number(id.slice(id.lastIndexOf('-') + 1))
  return Number.isFinite(index) ? index : 0
}

function stationsFor(scene: SchematicSceneId, body: SceneBody) {
  const side = ridgeSide(body.id)
  const index = ridgeIndexOf(body.id)
  const loft = beachRidgeMesh(scene, body.id)
  if (loft === 'convex-sw') return brConvexSwStations(side, index)
  if (loft === 'asymmetric') return asymmetricBeachRidgeStations(side, index)
  return beachRidgeStations(side, index)
}

/** Landward outline of one beach ridge, in world XZ. */
export function landwardContour(scene: SchematicSceneId, body: SceneBody): DeltaPlainPoint[] {
  return stationsFor(scene, body).map((station) => {
    let toeZ = Infinity
    let toeX = station.x
    for (const corner of beachRidgeRing(station)) {
      if (corner.z < toeZ) {
        toeZ = corner.z
        toeX = corner.x
      }
    }
    return worldXZ(body, toeX, toeZ)
  })
}

/**
 * The most landward beach ridge in each element set. That ridge is the one
 * the plain sits against.
 */
function adjacentRidges(scene: SchematicSceneId, ridges: SceneBody[]): SceneBody[] {
  const groups = new Map<string, SceneBody[]>()
  for (const ridge of ridges) {
    const key = ridge.parentId ?? ridge.id
    const group = groups.get(key) ?? []
    group.push(ridge)
    groups.set(key, group)
  }
  const chosen: SceneBody[] = []
  for (const group of groups.values()) {
    let best = group[0]
    let bestZ = Infinity
    for (const ridge of group) {
      const z = Math.min(...landwardContour(scene, ridge).map((point) => point.z))
      if (z < bestZ) {
        best = ridge
        bestZ = z
      }
    }
    chosen.push(best)
  }
  return chosen
}

/** Highest crest of one beach ridge. The cross-section crest is `station.height` above the base. */
export function beachRidgeCrestY(scene: SchematicSceneId, body: SceneBody): number {
  let crest = 0
  for (const station of stationsFor(scene, body)) crest = Math.max(crest, station.height)
  return body.nested.y + crest
}

function mostLandwardRidge(scene: SchematicSceneId, ridges: SceneBody[]): SceneBody {
  let best = ridges[0]
  let bestZ = Infinity
  for (const ridge of ridges) {
    const z = Math.min(...landwardContour(scene, ridge).map((point) => point.z))
    if (z < bestZ) {
      best = ridge
      bestZ = z
    }
  }
  return best
}

function tidalFootprint(body: SceneBody): DeltaPlainPoint[] {
  const { landZ, seaZ } = tidalChannelSpan()
  const steps = 32
  const left: DeltaPlainPoint[] = []
  const right: DeltaPlainPoint[] = []
  for (let i = 0; i <= steps; i += 1) {
    const s = landZ + ((seaZ - landZ) * i) / steps
    const frame = tidalChannelFrameAt(s)
    const radius = tidalChannelRadiusAt(s)
    left.push(worldXZ(body, frame.x - frame.rightX * radius, frame.z - frame.rightZ * radius))
    right.push(worldXZ(body, frame.x + frame.rightX * radius, frame.z + frame.rightZ * radius))
  }
  right.reverse()
  return [...left, ...right]
}

function halfFootprint(body: SceneBody): DeltaPlainPoint[] {
  const half = (body.channelLength ?? CHANNEL_LENGTH) / 2
  const radius = CHANNEL_RADIUS
  return [
    worldXZ(body, -radius, -half),
    worldXZ(body, radius, -half),
    worldXZ(body, radius, half),
    worldXZ(body, -radius, half),
  ]
}

function channelFootprint(scene: SchematicSceneId, body: SceneBody): DeltaPlainPoint[] {
  if (body.channelLength == null && channelMesh(scene) === 'tidal') return tidalFootprint(body)
  return halfFootprint(body)
}

function slabBounds(bodies: SceneBody[]) {
  const ground = bodies.find((body) => body.kind === 'ground')
  const width = ground?.groundSpan?.width ?? WATER_SLAB_WIDTH
  const depth = ground?.groundSpan?.depth ?? WATER_SLAB_DEPTH
  const x = ground?.nested.x ?? 0
  const z = ground?.nested.z ?? 0
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  }
}

function segmentZ(a: DeltaPlainPoint, b: DeltaPlainPoint, x: number): number | null {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  if (x < minX - 1e-9 || x > maxX + 1e-9) return null
  if (Math.abs(b.x - a.x) < 1e-9) return Math.min(a.z, b.z)
  const t = (x - a.x) / (b.x - a.x)
  if (t < -1e-6 || t > 1 + 1e-6) return null
  return a.z + t * (b.z - a.z)
}

/** Seaward limit of the plain at `x`: the landward toes, bridged across gaps. */
function fenceZ(x: number, contours: DeltaPlainPoint[][]): number | null {
  let best = Infinity
  let hit = false
  for (const contour of contours) {
    for (let i = 0; i < contour.length - 1; i += 1) {
      const z = segmentZ(contour[i], contour[i + 1], x)
      if (z != null && z < best) {
        best = z
        hit = true
      }
    }
  }
  if (hit) return best
  const points = contours.flat()
  if (points.length === 0) return null
  const left = points.filter((point) => point.x <= x + 1e-9).sort((a, b) => b.x - a.x)[0]
  const right = points.filter((point) => point.x >= x - 1e-9).sort((a, b) => a.x - b.x)[0]
  if (left && right && Math.abs(right.x - left.x) > 1e-9) {
    const t = (x - left.x) / (right.x - left.x)
    return left.z + t * (right.z - left.z)
  }
  return (left ?? right).z
}

function polygonCrossings(poly: DeltaPlainPoint[], x: number): number[] {
  const zs: number[] = []
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    if (x < minX || x >= maxX) continue
    if (Math.abs(b.x - a.x) < 1e-12) continue
    const t = (x - a.x) / (b.x - a.x)
    zs.push(a.z + t * (b.z - a.z))
  }
  zs.sort((a, b) => a - b)
  return zs
}

function channelSpans(polys: DeltaPlainPoint[][], x: number, z0: number, z1: number): Span[] {
  const cuts: Span[] = []
  for (const poly of polys) {
    const hits = polygonCrossings(poly, x)
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const cut0 = Math.max(z0, hits[i])
      const cut1 = Math.min(z1, hits[i + 1])
      if (cut1 - cut0 > 1e-4) cuts.push({ z0: cut0, z1: cut1 })
    }
  }
  return cuts
}

function subtractSpans(span: Span, cuts: Span[]): Span[] {
  let parts = [span]
  for (const cut of cuts) {
    const next: Span[] = []
    for (const part of parts) {
      if (cut.z1 <= part.z0 + 1e-6 || cut.z0 >= part.z1 - 1e-6) {
        next.push(part)
        continue
      }
      if (cut.z0 > part.z0 + 1e-6) next.push({ z0: part.z0, z1: Math.min(cut.z0, part.z1) })
      if (cut.z1 < part.z1 - 1e-6) next.push({ z0: Math.max(cut.z1, part.z0), z1: part.z1 })
    }
    parts = next.filter((part) => part.z1 - part.z0 > 1e-4)
  }
  return parts
}

function sampleXs(minX: number, maxX: number, extra: number[]): number[] {
  const xs = [minX, maxX, ...extra]
  for (let x = minX; x < maxX; x += SAMPLE_STEP) xs.push(x)
  xs.sort((a, b) => a - b)
  const unique: number[] = []
  for (const x of xs) {
    if (x < minX - 1e-6 || x > maxX + 1e-6) continue
    if (unique.length === 0 || x - unique[unique.length - 1] > 1e-4) unique.push(x)
  }
  return unique
}

function pushVertex(positions: number[], x: number, y: number, z: number): number {
  const index = positions.length / 3
  positions.push(x, y, z)
  return index
}

function addPrism(
  positions: number[],
  indices: number[],
  x0: number,
  z0a: number,
  z1a: number,
  x1: number,
  z0b: number,
  z1b: number,
) {
  if (Math.abs(x1 - x0) < 1e-6) return
  if (z1a - z0a < 1e-4 && z1b - z0b < 1e-4) return
  const thickness = DELTA_PLAIN_THICKNESS / 2
  const top = [
    pushVertex(positions, x0, thickness, z0a),
    pushVertex(positions, x0, thickness, z1a),
    pushVertex(positions, x1, thickness, z1b),
    pushVertex(positions, x1, thickness, z0b),
  ]
  const bottom = [
    pushVertex(positions, x0, -thickness, z0a),
    pushVertex(positions, x0, -thickness, z1a),
    pushVertex(positions, x1, -thickness, z1b),
    pushVertex(positions, x1, -thickness, z0b),
  ]
  indices.push(top[0], top[1], top[2], top[0], top[2], top[3])
  indices.push(bottom[0], bottom[2], bottom[1], bottom[0], bottom[3], bottom[2])
}

function linkColumns(
  positions: number[],
  indices: number[],
  x0: number,
  left: Span[],
  x1: number,
  right: Span[],
) {
  if (left.length === 0 || right.length === 0) return
  const leftMin = Math.min(...left.map((span) => span.z0))
  const leftMax = Math.max(...left.map((span) => span.z1))
  const rightMin = Math.min(...right.map((span) => span.z0))
  const rightMax = Math.max(...right.map((span) => span.z1))
  for (const a of left) {
    for (const b of right) {
      const z0 = Math.max(a.z0, b.z0)
      const z1 = Math.min(a.z1, b.z1)
      if (z1 - z0 <= 1e-4) continue
      const full =
        Math.abs(a.z0 - leftMin) < 1e-4 &&
        Math.abs(a.z1 - leftMax) < 1e-4 &&
        Math.abs(b.z0 - rightMin) < 1e-4 &&
        Math.abs(b.z1 - rightMax) < 1e-4
      if (full) addPrism(positions, indices, x0, a.z0, a.z1, x1, b.z0, b.z1)
      else addPrism(positions, indices, x0, z0, z1, x1, z0, z1)
    }
  }
}

function buildShape(scene: SchematicSceneId, bodies: SceneBody[]): DeltaPlainShape {
  const empty: DeltaPlainShape = {
    y: 0,
    heightSourceId: '',
    origin: { x: 0, z: 0 },
    positions: [],
    indices: [],
  }
  const ridges = bodies.filter((body) => body.kind === 'beach-ridge')
  if (ridges.length === 0) return empty
  const source = mostLandwardRidge(scene, ridges)
  const contours = adjacentRidges(scene, ridges).map((ridge) => landwardContour(scene, ridge))
  const channels = bodies.filter((body) => body.kind === 'channel').map((body) => channelFootprint(scene, body))
  const slab = slabBounds(bodies)
  const extraX = contours.flat().map((point) => point.x)
  for (const poly of channels) for (const point of poly) extraX.push(point.x)
  const xs = sampleXs(slab.minX, slab.maxX, extraX)
  const columns: { x: number; spans: Span[] }[] = []
  for (const x of xs) {
    const fence = fenceZ(x, contours)
    if (fence == null) continue
    const z1 = Math.min(fence, slab.maxZ)
    if (z1 - slab.minZ <= 1e-4) continue
    columns.push({ x, spans: subtractSpans({ z0: slab.minZ, z1 }, channelSpans(channels, x, slab.minZ, z1)) })
  }
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < columns.length - 1; i += 1) {
    linkColumns(positions, indices, columns[i].x, columns[i].spans, columns[i + 1].x, columns[i + 1].spans)
  }
  let sumX = 0
  let sumZ = 0
  let count = 0
  const topY = DELTA_PLAIN_THICKNESS / 2
  for (let i = 1; i < positions.length; i += 3) {
    if (Math.abs(positions[i] - topY) > 1e-6) continue
    sumX += positions[i - 1]
    sumZ += positions[i + 1]
    count += 1
  }
  const originX = count === 0 ? 0 : sumX / count
  const originZ = count === 0 ? 0 : sumZ / count
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= originX
    positions[i + 2] -= originZ
  }
  return {
    y: beachRidgeCrestY(scene, source),
    heightSourceId: source.id,
    origin: { x: originX, z: originZ },
    positions,
    indices,
  }
}

/** Adaptive delta-plain sheet for one scene's beach ridges, channels, and water slab. */
export function deltaPlainShape(scene: SchematicSceneId, bodies: SceneBody[]): DeltaPlainShape {
  const key = cacheKey(scene, bodies)
  const cached = shapeCache.get(key)
  if (cached) return cached
  const shape = buildShape(scene, bodies)
  shapeCache.set(key, shape)
  return shape
}

/** True when world `(x, z)` lies on the plain's top face. */
export function deltaPlainContains(shape: DeltaPlainShape, x: number, z: number): boolean {
  const px = x - shape.origin.x
  const pz = z - shape.origin.z
  const { positions, indices } = shape
  const topY = DELTA_PLAIN_THICKNESS / 2
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3
    const b = indices[i + 1] * 3
    const c = indices[i + 2] * 3
    if (Math.abs(positions[a + 1] - topY) > 1e-6) continue
    if (Math.abs(positions[b + 1] - topY) > 1e-6) continue
    if (Math.abs(positions[c + 1] - topY) > 1e-6) continue
    if (pointInTriangle(px, pz, positions[a], positions[a + 2], positions[b], positions[b + 2], positions[c], positions[c + 2])) {
      return true
    }
  }
  return false
}

function pointInTriangle(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): boolean {
  const v0x = cx - ax
  const v0z = cz - az
  const v1x = bx - ax
  const v1z = bz - az
  const v2x = px - ax
  const v2z = pz - az
  const dot = (ux: number, uz: number, vx: number, vz: number) => ux * vx + uz * vz
  const d00 = dot(v0x, v0z, v0x, v0z)
  const d01 = dot(v0x, v0z, v1x, v1z)
  const d11 = dot(v1x, v1z, v1x, v1z)
  const d20 = dot(v2x, v2z, v0x, v0z)
  const d21 = dot(v2x, v2z, v1x, v1z)
  const denom = d00 * d11 - d01 * d01
  if (Math.abs(denom) < 1e-12) return false
  const v = (d11 * d20 - d01 * d21) / denom
  const w = (d00 * d21 - d01 * d20) / denom
  const u = 1 - v - w
  return u >= -1e-5 && v >= -1e-5 && w >= -1e-5
}
