import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'
import { brConcaveSwStations } from './brConcaveSwPlan'
import { brConvexSwStations } from './brConvexSwPlan'
import { DELTA_PLAIN_THICKNESS, deltaPlainShape } from './deltaplain'
import { ridgeFlankSide } from './schematicScene'
import { tidalChannelFrameAt, tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  beachRidgeRing,
  beachRidgeStations,
  RIDGE_FACE_LENGTH_SCALE,
  bodyCenter,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  EXPLODE_SPREAD,
  isDistalMouthId,
  MOUTH_BAR_SCALE,
  MOUTH_FAN_X_SCALE,
  mouthFanReferenceGap,
  RIDGE_Z_STEP,
  sceneAt as wfSceneAt,
  WATER_SLAB_DEPTH,
  WATER_SLAB_WIDTH,
  type PlacedBody,
  type SceneBody,
} from './wfSchematic'

/** Map pin for the Tfw element-complex set. Latitude −19.984295231442236, longitude 119.165775381814. */
export const TFW_ECS_ANCHOR = { lat: -19.984295231442236, lng: 119.165775381814 } as const

/** Channel and −X (left) beach ridges swing toward +X. */
export const TFW_CHANNEL_YAW_RAD = (15 * Math.PI) / 180

/** Template |X| at or inside this stays on the channel axis: no extra side yaw. */
const MOUTH_BAR_PROXIMAL_TEMPLATE_X = 0.16

/** First fan station outside that band, and the outermost station. */
const MOUTH_BAR_SIDE_YAW_INNER_X = 0.32
const MOUTH_BAR_SIDE_YAW_OUTER_X = 0.64

/** Extra yaw, in degrees, from the inner off-axis bars out to the outer bars (doubled on Tfw). */
const MOUTH_BAR_SIDE_YAW_INNER_DEG = 4
const MOUTH_BAR_SIDE_YAW_OUTER_DEG = 10

/**
 * Extra yaw for one mouth bar from how far it sits off the channel.
 * Centre and proximal bars stay at 0. Left bars yaw toward −X and right bars
 * toward +X, from {@link MOUTH_BAR_SIDE_YAW_INNER_DEG} to
 * {@link MOUTH_BAR_SIDE_YAW_OUTER_DEG} at the outer tips.
 */
export function tfwMouthBarSideYawRad(templateX: number): number {
  const abs = Math.abs(templateX)
  if (abs < (MOUTH_BAR_PROXIMAL_TEMPLATE_X + MOUTH_BAR_SIDE_YAW_INNER_X) / 2) return 0
  const span = MOUTH_BAR_SIDE_YAW_OUTER_X - MOUTH_BAR_SIDE_YAW_INNER_X
  const t = span === 0 ? 1 : Math.min(1, Math.max(0, (abs - MOUTH_BAR_SIDE_YAW_INNER_X) / span))
  const degrees = MOUTH_BAR_SIDE_YAW_INNER_DEG + (MOUTH_BAR_SIDE_YAW_OUTER_DEG - MOUTH_BAR_SIDE_YAW_INNER_DEG) * t
  const sign = templateX < 0 ? -1 : 1
  return (sign * degrees * Math.PI) / 180
}

/** Channel yaw, plus the Wf fan offset, plus the side yaw from `templateX`. */
export function tfwMouthBarYaw(wfFanYaw: number, templateX = 0): number {
  return TFW_CHANNEL_YAW_RAD + wfFanYaw + tfwMouthBarSideYawRad(templateX)
}

/**
 * How far a BRconvexSW channel end sits inside the left wall, as a fraction
 * of the local tidal-channel width (both walls).
 */
export const TFW_CONVEX_CHANNEL_OVERLAP = 0.1

/**
 * Fore-aft width of one BRconvexSW mesh used to tuck the set landward.
 * The doubled seaward face sticks out past the crest; that extra toe is not
 * part of this width, so the crest stays where it was.
 */
export function tfwConvexSwMeshWidth(): number {
  const station = brConvexSwStations('l', 0)[0]
  const ring = beachRidgeRing(station)
  let minZ = Infinity
  let maxZ = -Infinity
  let baseSeaZ = -Infinity
  let crestSeaZ = -Infinity
  for (const corner of ring) {
    minZ = Math.min(minZ, corner.z)
    maxZ = Math.max(maxZ, corner.z)
    if (corner.y === station.height) crestSeaZ = Math.max(crestSeaZ, corner.z)
    if (corner.y < station.height) baseSeaZ = Math.max(baseSeaZ, corner.z)
  }
  const faceRun = baseSeaZ - crestSeaZ
  const extension = faceRun * (1 - 1 / RIDGE_FACE_LENGTH_SCALE)
  return maxZ - minZ - extension
}

/**
 * Fraction by which the middle fan's inner-pair centre gap shrinks relative to
 * the half-Wf gap (half overlap). {@link tfwMouthBarXSpread} applies this after
 * halving, so overlap lands at roughly **0.276** when Wf inner overlap is **0.36**.
 */
export const TFW_MOUTH_SEAWARD_OVERLAP_TIGHTEN = 0.3

/**
 * Landward shift along the channel for each seaward tidal mouth complex.
 * The fifth beach ridge moved the channel tip, and the seaward fan with it,
 * by one {@link RIDGE_Z_STEP}. That opened a gap between mouth complexes.
 * Each complex moves back by this much relative to the one landward of it,
 * so the overlap matches the Wf fans before that ridge.
 */
export const TFW_MOUTH_COMPLEX_Z_PULL = RIDGE_Z_STEP

export function tfwMouthBarXSpread(): number {
  const gap = mouthFanReferenceGap() * MOUTH_FAN_X_SCALE
  const overlap = MOUTH_BAR_SCALE.x - gap
  const halfGap = MOUTH_BAR_SCALE.x - overlap * 0.5
  const tightenedGap = halfGap * (1 - TFW_MOUTH_SEAWARD_OVERLAP_TIGHTEN)
  return tightenedGap / gap
}

/**
 * Half-width the mouth-bar fan was seated against: flare from the half
 * channel's landward end to 5× width. The live funnel is wider and starts
 * further landward; {@link tfwMouthBarMarginScale} keeps each bar the same
 * fraction of the way from the centreline to the wall.
 */
function mouthBarReferenceRadius(channelLocalZ: number): number {
  const seaZ = CHANNEL_LENGTH / 2
  const taperZ = -CHANNEL_LENGTH / 2
  const land = CHANNEL_RADIUS
  const sea = land * 5
  if (channelLocalZ <= taperZ || seaZ === taperZ) return land
  const u = Math.min(1, Math.max(0, (channelLocalZ - taperZ) / (seaZ - taperZ)))
  return land + (sea - land) * u * u
}

/** Scale on channel-local X so a mouth bar keeps its place between the margins. */
export function tfwMouthBarMarginScale(channelLocalZ: number): number {
  const previous = mouthBarReferenceRadius(channelLocalZ)
  if (previous === 0) return 1
  return tidalChannelRadiusAt(channelLocalZ) / previous
}

const NAMES: Record<string, string> = {
  ecs: 'Tfw element complex set',
  'ec-lobe': 'Tfw-Lobe',
  'ec-mouth': 'Tfw-Mouth Bar',
  'ec-mouth-prox': 'Tfw-Mouth Bar proximal',
  'ec-mouth-sea': 'Tfw-Mouth Bar seaward',
}

const TFW_MOUTH_COMPLEX_IDS = new Set([
  'ec-mouth',
  'ec-mouth-prox',
  'ec-mouth-sea',
  'es-mouth',
  'es-mouth-prox',
  'es-mouth-sea',
])

function isTidalSeawardMouthId(id: string): boolean {
  return /^e-mouth-\d+$/.test(id)
}

function isTfwMouthBody(body: SceneBody): boolean {
  return (
    body.kind === 'mouth-bar' ||
    TFW_MOUTH_COMPLEX_IDS.has(body.id) ||
    body.id.startsWith('e-mouth-')
  )
}

/** Landward-to-seaward step between Wf mouth-bar complexes (proximal → seaward fan). */
function mouthComplexLandSeaStep(): { localDz: number; dy: number } {
  const wf = wfSceneAt(0)
  const prox = wf.find((body) => body.id === 'e-mouth-prox-0')!
  const sea = wf.find((body) => body.id === 'e-mouth-0')!
  return { localDz: sea.nested.z - prox.nested.z, dy: prox.nested.y - sea.nested.y }
}

function mouthSetNested(bars: SceneBody[]): { x: number; y: number; z: number } {
  const sum = bars.reduce(
    (total, bar) => ({
      x: total.x + bar.nested.x,
      y: total.y + bar.nested.y,
      z: total.z + bar.nested.z,
    }),
    { x: 0, y: 0, z: 0 },
  )
  const count = bars.length || 1
  return { x: sum.x / count, y: sum.y / count + 0.2, z: sum.z / count }
}

function advanceMouthBarAlongChannel(
  body: SceneBody,
  channel: SceneBody,
  localDz: number,
  dy: number,
): SceneBody {
  const yaw = channel.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const dx = body.nested.x - channel.nested.x
  const dz = body.nested.z - channel.nested.z
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos
  const rotated = rotateYaw({ x: localX, y: 0, z: localZ + localDz }, yaw)
  return {
    ...body,
    nested: {
      x: channel.nested.x + rotated.x,
      y: body.nested.y - dy,
      z: channel.nested.z + rotated.z,
    },
  }
}

/**
 * Three tidal mouth-bar element complexes: proximal, middle seaward (tightened
 * overlap), and a third seaward copy of the middle fan with the same land→sea
 * Y and Z step as the Wf proximal→seaward pair.
 */
function splitTfwMouthComplexes(bodies: SceneBody[]): SceneBody[] {
  const channel = bodies.find((body) => body.id === 'e-channel')
  const ecMouth = bodies.find((body) => body.id === 'ec-mouth')
  const esMouth = bodies.find((body) => body.id === 'es-mouth')
  if (!channel || !ecMouth || !esMouth) return bodies

  const proxBars = bodies.filter((body) => body.id.startsWith('e-mouth-prox-'))
  const midBars = bodies
    .filter((body) => isTidalSeawardMouthId(body.id))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  if (proxBars.length === 0 || midBars.length === 0) return bodies

  const step = mouthComplexLandSeaStep()
  const pull = TFW_MOUTH_COMPLEX_Z_PULL
  const proxComplex: SceneBody = {
    ...ecMouth,
    id: 'ec-mouth-prox',
    name: NAMES['ec-mouth-prox'],
    parentId: 'ecs',
    nested: mouthSetNested(proxBars),
  }
  const proxSet: SceneBody = {
    id: 'es-mouth-prox',
    name: 'Mouth-bar set proximal',
    rank: 'element-set',
    parentId: 'ec-mouth-prox',
    kind: 'group',
    nested: mouthSetNested(proxBars),
  }
  const proxReparented = proxBars.map((bar) => ({ ...bar, parentId: 'es-mouth-prox' }))

  const midReparented = midBars.map((bar) =>
    advanceMouthBarAlongChannel({ ...bar, parentId: 'es-mouth' }, channel, -pull, 0),
  )
  const midSet: SceneBody = { ...esMouth, nested: mouthSetNested(midReparented) }
  const midComplex: SceneBody = { ...ecMouth, name: NAMES['ec-mouth'], nested: mouthSetNested(midReparented) }

  const seaBars = midReparented.map((bar, index) =>
    advanceMouthBarAlongChannel(
      { ...bar, id: `e-mouth-sea-${index}`, parentId: 'es-mouth-sea' },
      channel,
      step.localDz - pull,
      step.dy,
    ),
  )
  const seaComplex: SceneBody = {
    ...ecMouth,
    id: 'ec-mouth-sea',
    name: NAMES['ec-mouth-sea'],
    parentId: 'ecs',
    nested: mouthSetNested(seaBars),
  }
  const seaSet: SceneBody = {
    id: 'es-mouth-sea',
    name: 'Mouth-bar set seaward',
    rank: 'element-set',
    parentId: 'ec-mouth-sea',
    kind: 'group',
    nested: mouthSetNested(seaBars),
  }

  const skip = new Set([
    ...proxBars.map((bar) => bar.id),
    ...midBars.map((bar) => bar.id),
    'ec-mouth',
    'es-mouth',
  ])
  const rest = bodies.filter((body) => !skip.has(body.id))
  return [
    ...rest,
    proxComplex,
    proxSet,
    ...proxReparented,
    midComplex,
    midSet,
    ...midReparented,
    seaComplex,
    seaSet,
    ...seaBars,
  ]
}

function rotateYaw(point: { x: number; y: number; z: number }, yaw: number): { x: number; y: number; z: number } {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  }
}

function worldFromNested(body: SceneBody, local: { x: number; y: number; z: number }) {
  const rotated = rotateYaw(local, body.yaw ?? 0)
  return {
    x: body.nested.x + rotated.x,
    y: body.nested.y + rotated.y,
    z: body.nested.z + rotated.z,
  }
}

function funnelWallPointWorld(
  channel: SceneBody,
  localZ: number,
  side: 'l' | 'r',
): { x: number; z: number } {
  const sign = side === 'r' ? 1 : -1
  const r = tidalChannelRadiusAt(localZ)
  return worldFromNested(channel, { x: sign * r, y: 0, z: localZ })
}

/**
 * Channel-local Z whose wall has this world Z. World Z increases along the
 * funnel, so the search is a binary chop. Targets outside the span clamp to
 * the nearer tip.
 */
function wallLocalZAtWorldZ(channel: SceneBody, side: 'l' | 'r', worldZ: number): number {
  const { landZ, seaZ } = tidalChannelSpan()
  const zAt = (localZ: number) => funnelWallPointWorld(channel, localZ, side).z
  if (worldZ <= zAt(landZ)) return landZ
  if (worldZ >= zAt(seaZ)) return seaZ
  let lo = landZ
  let hi = seaZ
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2
    if (zAt(mid) < worldZ) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Nested X delta for one beach ridge so its channel-end centreline sits on the
 * tidal-channel wall at the same world Z (channel yaw included).
 */
export function tfwRidgeShift(bodyId: string, bodies?: SceneBody[]): number {
  const rested = bodies ?? sceneBodiesAtRest()
  const ridge = rested.find((body) => body.id === bodyId)
  const channel = rested.find((body) => body.id === 'e-channel')
  if (!ridge || ridge.kind !== 'beach-ridge' || !channel) return 0
  const side = bodyId.includes('-r-') ? 'r' : 'l'
  const index = Number(bodyId.slice(bodyId.lastIndexOf('-') + 1))
  const station = beachRidgeStations(side, Number.isFinite(index) ? index : 0)[0]
  const end = ridgeChannelEndWorld(ridge)
  const wall = funnelWallPointWorld(channel, wallLocalZAtWorldZ(channel, side, end.z), side)
  const yaw = ridge.yaw ?? 0
  const targetNestedX = wall.x - (station.x * Math.cos(yaw) + station.z * Math.sin(yaw))
  const base = wfSceneAt(0).find((body) => body.id === bodyId)!
  return targetNestedX - base.nested.x
}

function ridgeChannelEndWorld(ridge: SceneBody): { x: number; z: number } {
  const side = ridge.id.includes('-r-') ? 'r' : 'l'
  const index = Number(ridge.id.slice(ridge.id.lastIndexOf('-') + 1))
  const station = beachRidgeStations(side, index)[0]
  const world = worldFromNested(ridge, { x: station.x, y: 0, z: station.z })
  return { x: world.x, z: world.z }
}

function applyTfwYaw(body: SceneBody): SceneBody {
  const yaw = body.yaw ?? 0
  if (body.id === 'e-channel') {
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: TFW_CHANNEL_YAW_RAD }
  }
  if (TFW_MOUTH_COMPLEX_IDS.has(body.id) || body.kind === 'mouth-bar' || body.id.startsWith('e-mouth-')) {
    const templateX = body.kind === 'mouth-bar' ? body.nested.x / MOUTH_FAN_X_SCALE : 0
    const fanYaw = body.kind === 'mouth-bar' ? yaw * 2 : yaw
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: tfwMouthBarYaw(fanYaw, templateX) }
  }
  if (body.id in NAMES) {
    return { ...body, name: NAMES[body.id] ?? body.name }
  }
  return body
}

/** Swing mouth-bar positions about the channel origin so the fan centreline is the channel centreline. */
function alignMouthBarsToChannel(bodies: SceneBody[]): SceneBody[] {
  const channel = bodies.find((body) => body.id === 'e-channel')
  if (!channel) return bodies
  return bodies.map((body) => {
    const onFan = isTfwMouthBody(body)
    if (!onFan) return body
    const rotated = rotateYaw(
      { x: body.nested.x - channel.nested.x, y: 0, z: body.nested.z - channel.nested.z },
      TFW_CHANNEL_YAW_RAD,
    )
    return {
      ...body,
      nested: {
        ...body.nested,
        x: channel.nested.x + rotated.x,
        z: channel.nested.z + rotated.z,
      },
    }
  })
}

function applyMouthBarXSpread(body: SceneBody): SceneBody {
  if (!isTidalSeawardMouthId(body.id)) return body
  const spread = tfwMouthBarXSpread()
  return { ...body, nested: { ...body.nested, x: body.nested.x * spread } }
}

function applyMouthBarMargin(body: SceneBody, channel: SceneBody): SceneBody {
  if (body.kind !== 'mouth-bar') return body
  const yaw = channel.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const dx = body.nested.x - channel.nested.x
  const dz = body.nested.z - channel.nested.z
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos
  const rotated = rotateYaw({ x: localX * tfwMouthBarMarginScale(localZ), y: 0, z: localZ }, yaw)
  return {
    ...body,
    nested: {
      ...body.nested,
      x: channel.nested.x + rotated.x,
      z: channel.nested.z + rotated.z,
    },
  }
}

function ridgeIndex(id: string): number {
  const index = Number(id.slice(id.lastIndexOf('-') + 1))
  return Number.isFinite(index) ? index : 0
}

/**
 * Left-flank pose. The whole complex moves landward by half one mesh width.
 * Each channel end then overlaps the left wall by {@link TFW_CONVEX_CHANNEL_OVERLAP}
 * of the local tidal-channel width.
 */
function convexSwNested(body: SceneBody, channel: SceneBody): { x: number; z: number } {
  const landward = tfwConvexSwMeshWidth() / 2
  if (body.kind !== 'beach-ridge') {
    return { x: body.nested.x, z: body.nested.z - landward }
  }
  const station = beachRidgeStations('l', ridgeIndex(body.id))[0]
  const yaw = body.yaw ?? 0
  const shifted = worldFromNested(
    { ...body, nested: { ...body.nested, z: body.nested.z - landward } },
    { x: station.x, y: 0, z: station.z },
  )
  let probeZ = shifted.z
  let target = { x: shifted.x, z: shifted.z }
  for (let step = 0; step < 8; step += 1) {
    const localZ = wallLocalZAtWorldZ(channel, 'l', probeZ)
    const radius = tidalChannelRadiusAt(localZ)
    const overlap = TFW_CONVEX_CHANNEL_OVERLAP * 2 * radius
    const wall = worldFromNested(channel, { x: -radius, y: 0, z: localZ })
    const centre = worldFromNested(channel, { x: 0, y: 0, z: localZ })
    const dx = centre.x - wall.x
    const dz = centre.z - wall.z
    const span = Math.hypot(dx, dz) || 1
    target = {
      x: wall.x + (dx / span) * overlap,
      z: wall.z + (dz / span) * overlap,
    }
    probeZ = target.z
  }
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: target.x - (station.x * cos + station.z * sin),
    z: target.z - (-station.x * sin + station.z * cos),
  }
}

function shiftedBody(body: SceneBody, bodiesForShift: SceneBody[]): SceneBody {
  const channel = bodiesForShift.find((entry) => entry.id === 'e-channel')
  if (channel && (body.id === 'es-ridge-l' || body.id.startsWith('e-ridge-l-'))) {
    const nested = convexSwNested(body, channel)
    return { ...body, nested: { ...body.nested, x: nested.x, z: nested.z } }
  }
  const shift = body.kind === 'beach-ridge' ? tfwRidgeShift(body.id, bodiesForShift) : 0
  return {
    ...body,
    nested: shift === 0 ? body.nested : { ...body.nested, x: body.nested.x + shift },
  }
}

function sceneBodiesAtRest(): SceneBody[] {
  const wf = wfSceneAt(0).filter((body) => !isDistalMouthId(body.id))
  const yawed = alignMouthBarsToChannel(
    wf.map((body) => applyMouthBarXSpread(applyTfwYaw({ ...body, yaw: body.yaw }))),
  )
  const channel = yawed.find((body) => body.id === 'e-channel')
  const margined = channel ? yawed.map((body) => applyMouthBarMargin(body, channel)) : yawed
  return splitTfwMouthComplexes(margined.map((body) => shiftedBody(body, margined)))
}

function convexOuterTip(body: SceneBody): { x: number; z: number } {
  let tip = { x: Infinity, z: 0 }
  for (const station of brConvexSwStations('l', ridgeIndex(body.id))) {
    const world = worldFromNested(body, { x: station.x, y: 0, z: station.z })
    if (world.x < tip.x) tip = { x: world.x, z: world.z }
  }
  return tip
}

function straightChannel(
  id: string,
  name: string,
  sea: { x: number; z: number },
  land: { x: number; z: number },
  y: number,
): SceneBody {
  const dx = sea.x - land.x
  const dz = sea.z - land.z
  return {
    id,
    name,
    rank: 'element',
    parentId: 'es-ridge-l',
    kind: 'channel',
    nested: {
      x: (sea.x + land.x) / 2,
      y,
      z: (sea.z + land.z) / 2,
    },
    yaw: Math.atan2(dx, dz),
    channelLength: Math.hypot(dx, dz),
  }
}

/** World XZ of one end of a straight channel. `+1` is the seaward end. */
function channelEndXZ(body: SceneBody, sign: 1 | -1): { x: number; z: number } {
  const length = body.channelLength ?? 0
  const yaw = body.yaw ?? 0
  return {
    x: body.nested.x + sign * (length / 2) * Math.sin(yaw),
    z: body.nested.z + sign * (length / 2) * Math.cos(yaw),
  }
}

/** Landward tip of the tidal-channel centreline, in world XZ. */
function tidalLandwardTip(channel: SceneBody): { x: number; z: number } {
  const frame = tidalChannelFrameAt(tidalChannelSpan().landZ)
  return worldFromNested(channel, { x: frame.x, y: 0, z: frame.z })
}

/**
 * Half channel along the outer edge of the convex left-flank set.
 * The seaward end lines up with the most seaward ridge's outer tip. The run
 * keeps that heading and is twice the tip-to-tip length, the extra length
 * landward. The centreline sits one radius outside the edge.
 */
function leftHalfChannelBody(bodies: SceneBody[]): SceneBody {
  const channel = bodies.find((body) => body.id === 'e-channel')!
  const ridges = bodies.filter((body) => body.id.startsWith('e-ridge-l-'))
  const landRidge = ridges.reduce((best, body) => (ridgeIndex(body.id) < ridgeIndex(best.id) ? body : best))
  const seaRidge = ridges.reduce((best, body) => (ridgeIndex(body.id) > ridgeIndex(best.id) ? body : best))
  const landTip = convexOuterTip(landRidge)
  const seaTip = convexOuterTip(seaRidge)
  const edgeX = seaTip.x - landTip.x
  const edgeZ = seaTip.z - landTip.z
  const edge = Math.hypot(edgeX, edgeZ) || 1
  const outX = -edgeZ / edge
  const outZ = edgeX / edge
  const sea = { x: seaTip.x + outX * CHANNEL_RADIUS, z: seaTip.z + outZ * CHANNEL_RADIUS }
  const edgeLand = { x: landTip.x + outX * CHANNEL_RADIUS, z: landTip.z + outZ * CHANNEL_RADIUS }
  const land = {
    x: sea.x + (edgeLand.x - sea.x) * 2,
    z: sea.z + (edgeLand.z - sea.z) * 2,
  }
  return straightChannel('e-channel-l', 'Half channel', sea, land, channel.nested.y)
}

/**
 * Second half channel. Its seaward end meets the extended half channel's
 * landward end. Its landward end is the tidal channel's landward tip, so the
 * yaw is the heading between those two points.
 */
function leftHalfChannelJoin(half: SceneBody, bodies: SceneBody[]): SceneBody {
  const channel = bodies.find((body) => body.id === 'e-channel')!
  return straightChannel(
    'e-channel-l-join',
    'Half channel join',
    channelEndXZ(half, -1),
    tidalLandwardTip(channel),
    half.nested.y,
  )
}

function leftRidgeId(id: string): string {
  if (id === 'ec-lobe') return 'ec-ridge-hl'
  if (id === 'es-ridge-l') return 'es-ridge-hl'
  return `e-ridge-hl-${id.slice('e-ridge-l-'.length)}`
}

/**
 * Symmetric beach-ridge complex on the left of the half channel. Offsets and
 * yaw match the Wf left flank relative to the Wf channel, then rotate with
 * the half channel so the mesh hangs to its left.
 */
function leftRidgeComplex(half: SceneBody): SceneBody[] {
  const wf = wfSceneAt(0)
  const wfChannel = wf.find((body) => body.id === 'e-channel')!
  const yaw = half.yaw ?? 0
  return wf
    .filter((body) => body.id === 'ec-lobe' || body.id === 'es-ridge-l' || body.id.startsWith('e-ridge-l-'))
    .map((body) => {
      const rotated = rotateYaw(
        {
          x: body.nested.x - wfChannel.nested.x,
          y: body.nested.y - wfChannel.nested.y,
          z: body.nested.z - wfChannel.nested.z,
        },
        yaw,
      )
      const name =
        body.id === 'ec-lobe'
          ? 'Symmetric beach-ridge complex'
          : body.id === 'es-ridge-l'
            ? 'Beach-ridge set left'
            : body.name
      const parentId = body.id === 'ec-lobe' ? 'ecs' : body.id === 'es-ridge-l' ? 'ec-ridge-hl' : 'es-ridge-hl'
      return {
        ...body,
        id: leftRidgeId(body.id),
        name,
        parentId,
        nested: {
          x: half.nested.x + rotated.x,
          y: half.nested.y + rotated.y,
          z: half.nested.z + rotated.z,
        },
        yaw: (body.yaw ?? 0) + yaw,
      }
    })
}

/**
 * Alongshore overlap of the concave inspection complex with the asymmetric
 * right flank, as a fraction of that flank's world X span.
 */
export const TFW_CONCAVE_RIDGE_OVERLAP = 0.05

function ridgeCornerXs(body: SceneBody, stations: { x: number; z: number; halfWidth: number; height: number }[]): number[] {
  const xs: number[] = []
  for (const station of stations) {
    for (const corner of beachRidgeRing(station)) xs.push(worldFromNested(body, corner).x)
  }
  return xs
}

function centreWorld(body: SceneBody, station: { x: number; z: number }) {
  return worldFromNested(body, { x: station.x, y: 0, z: station.z })
}

/**
 * Landward Z nudge so this concave ridge's channel-end centreline meets the
 * asymmetric ridge's outer-tip centreline. Those are the ends nearest each
 * other in X. The seaward ridge needs a larger nudge because its tip shears
 * further landward.
 */
function concaveLandwardNudge(asym: SceneBody, index: number, xShift: number): number {
  const posed: SceneBody = { ...asym, nested: { ...asym.nested, x: asym.nested.x + xShift } }
  const asymStations = asymmetricBeachRidgeStations('r', index)
  const concaveStations = brConcaveSwStations('r', index)
  let tip = asymStations[0]
  let tipX = -Infinity
  for (const station of asymStations) {
    const x = centreWorld(asym, station).x
    if (x > tipX) {
      tipX = x
      tip = station
    }
  }
  let near = concaveStations[0]
  let nearX = Infinity
  for (const station of concaveStations) {
    const x = centreWorld(posed, station).x
    if (x < nearX) {
      nearX = x
      near = station
    }
  }
  return centreWorld(asym, tip).z - centreWorld(posed, near).z
}

/**
 * Concave-seaward beach-ridge complex for inspection. Five ridges copy the
 * asymmetric right flank's Y and yaw. The whole complex sits to +X, overlapping
 * that flank by {@link TFW_CONCAVE_RIDGE_OVERLAP} of the flank's alongshore span.
 * Each ridge then shifts landward in Z so its channel end, the end proximal in
 * X to that flank, meets the flank's outer-tip centreline.
 */
function rightConcaveComplex(bodies: SceneBody[]): SceneBody[] {
  const ridges = bodies
    .filter((body) => /^e-ridge-r-\d+$/.test(body.id))
    .sort((a, b) => ridgeIndex(a.id) - ridgeIndex(b.id))
  const set = bodies.find((body) => body.id === 'es-ridge-r')
  if (!set || ridges.length === 0) return []

  let asymMin = Infinity
  let asymMax = -Infinity
  let concaveMin = Infinity
  for (const ridge of ridges) {
    const index = ridgeIndex(ridge.id)
    for (const x of ridgeCornerXs(ridge, asymmetricBeachRidgeStations('r', index))) {
      asymMin = Math.min(asymMin, x)
      asymMax = Math.max(asymMax, x)
    }
    for (const x of ridgeCornerXs(ridge, brConcaveSwStations('r', index))) {
      concaveMin = Math.min(concaveMin, x)
    }
  }
  const shift = asymMax - TFW_CONCAVE_RIDGE_OVERLAP * (asymMax - asymMin) - concaveMin
  const nudges = ridges.map((ridge) => concaveLandwardNudge(ridge, ridgeIndex(ridge.id), shift))
  const elements: SceneBody[] = ridges.map((ridge, index) => ({
    ...ridge,
    id: `e-ridge-cr-${ridgeIndex(ridge.id)}`,
    name: 'Beach ridge',
    parentId: 'es-ridge-cr',
    nested: {
      ...ridge.nested,
      x: ridge.nested.x + shift,
      z: ridge.nested.z + nudges[index],
    },
  }))
  const meanNudge = nudges.reduce((total, nudge) => total + nudge, 0) / nudges.length
  const centre = elements.reduce(
    (total, ridge) => ({
      x: total.x + ridge.nested.x,
      y: total.y + ridge.nested.y,
      z: total.z + ridge.nested.z,
    }),
    { x: 0, y: 0, z: 0 },
  )
  const count = elements.length
  const nested = { x: centre.x / count, y: centre.y / count, z: centre.z / count }
  return [
    {
      id: 'ec-ridge-cr',
      name: 'Concave beach-ridge complex',
      rank: 'element-complex',
      parentId: 'ecs',
      kind: 'group',
      nested,
    },
    {
      id: 'es-ridge-cr',
      name: 'Beach-ridge set concave',
      rank: 'element-set',
      parentId: 'ec-ridge-cr',
      kind: 'group',
      nested: { ...set.nested, x: set.nested.x + shift, z: set.nested.z + meanNudge },
    },
    ...elements,
  ]
}

/** Margin past the union so meshes are not flush with the water edge. */
const WATER_SLAB_PAD = 0.4

function footprintXZ(body: SceneBody): { x: number; z: number }[] {
  const world = (x: number, z: number) => {
    const point = worldFromNested(body, { x, y: 0, z })
    return { x: point.x, z: point.z }
  }
  if (body.kind === 'channel') {
    const half = (body.channelLength ?? CHANNEL_LENGTH) / 2
    const radius = CHANNEL_RADIUS
    return [
      world(-radius, -half),
      world(radius, -half),
      world(-radius, half),
      world(radius, half),
    ]
  }
  if (body.kind === 'beach-ridge') {
    const side = ridgeFlankSide(body.id)
    const index = ridgeIndex(body.id)
    const stations = body.id.startsWith('e-ridge-cr-')
      ? brConcaveSwStations(side, index)
      : beachRidgeStations(side, index)
    const points: { x: number; z: number }[] = []
    for (const station of stations) {
      for (const corner of beachRidgeRing(station)) {
        const point = worldFromNested(body, corner)
        points.push({ x: point.x, z: point.z })
      }
    }
    return points
  }
  if (body.kind === 'mouth-bar') {
    const rx = MOUTH_BAR_SCALE.x / 2
    const rz = MOUTH_BAR_SCALE.z / 2
    return [world(-rx, -rz), world(rx, -rz), world(-rx, rz), world(rx, rz)]
  }
  return []
}

/**
 * Grow the Tfw water slab so it still covers the default 8×6 rectangle and
 * also the half-channel extension. Y stays put, so the top remains the waterline.
 */
function extendWaterSlab(ecs: SceneBody, extras: SceneBody[]): SceneBody {
  let minX = ecs.nested.x - WATER_SLAB_WIDTH / 2
  let maxX = ecs.nested.x + WATER_SLAB_WIDTH / 2
  let minZ = ecs.nested.z - WATER_SLAB_DEPTH / 2
  let maxZ = ecs.nested.z + WATER_SLAB_DEPTH / 2
  for (const body of extras) {
    for (const corner of footprintXZ(body)) {
      minX = Math.min(minX, corner.x)
      maxX = Math.max(maxX, corner.x)
      minZ = Math.min(minZ, corner.z)
      maxZ = Math.max(maxZ, corner.z)
    }
  }
  minX -= WATER_SLAB_PAD
  maxX += WATER_SLAB_PAD
  minZ -= WATER_SLAB_PAD
  maxZ += WATER_SLAB_PAD
  return {
    ...ecs,
    nested: {
      x: (minX + maxX) / 2,
      y: ecs.nested.y,
      z: (minZ + maxZ) / 2,
    },
    groundSpan: { width: maxX - minX, depth: maxZ - minZ },
  }
}

function leftMouthId(id: string): string {
  if (id === 'ec-mouth') return 'ec-mouth-l'
  if (id === 'es-mouth') return 'es-mouth-l'
  if (id === 'ec-mouth-dist') return 'ec-mouth-l-dist'
  if (id === 'es-mouth-dist') return 'es-mouth-l-dist'
  if (id.startsWith('e-mouth-dist-')) return `e-mouth-l-dist-${id.slice('e-mouth-dist-'.length)}`
  if (id.startsWith('e-mouth-prox-')) return `e-mouth-l-prox-${id.slice('e-mouth-prox-'.length)}`
  return `e-mouth-l-${id.slice('e-mouth-'.length)}`
}

function leftMouthParent(id: string): string {
  if (id === 'ec-mouth' || id === 'ec-mouth-dist') return 'ecs'
  if (id === 'es-mouth') return 'ec-mouth-l'
  if (id === 'es-mouth-dist') return 'ec-mouth-l-dist'
  if (id.startsWith('e-mouth-dist-')) return 'es-mouth-l-dist'
  return 'es-mouth-l'
}

function leftMouthName(id: string, fallback: string): string {
  if (id === 'ec-mouth') return 'Tfw-Mouth Bar left'
  if (id === 'ec-mouth-dist') return 'Tfw-Mouth Bar left seaward'
  if (id === 'es-mouth') return 'Mouth-bar set left'
  if (id === 'es-mouth-dist') return 'Mouth-bar set left seaward'
  return fallback
}

/**
 * A second mouth-bar complex. Each body's offset from the Wf channel, and its
 * yaw relative to that channel, is copied onto the left half channel.
 */
function leftMouthComplex(half: SceneBody): SceneBody[] {
  const wf = wfSceneAt(0)
  const wfChannel = wf.find((body) => body.id === 'e-channel')!
  const yaw = half.yaw ?? 0
  return wf
    .filter(
      (body) =>
        body.id === 'ec-mouth' ||
        body.id === 'es-mouth' ||
        isDistalMouthId(body.id) ||
        body.kind === 'mouth-bar',
    )
    .map((body) => {
      const rotated = rotateYaw(
        {
          x: body.nested.x - wfChannel.nested.x,
          y: body.nested.y - wfChannel.nested.y,
          z: body.nested.z - wfChannel.nested.z,
        },
        yaw,
      )
      return {
        ...body,
        id: leftMouthId(body.id),
        name: leftMouthName(body.id, body.name),
        parentId: leftMouthParent(body.id),
        nested: {
          x: half.nested.x + rotated.x,
          y: half.nested.y + rotated.y,
          z: half.nested.z + rotated.z,
        },
        yaw: (body.yaw ?? 0) + yaw,
      }
    })
}

function explodePosition(body: SceneBody, spread: number): { x: number; y: number; z: number } {
  const center = bodyCenter(body)
  const pivot = bodyCenter({ ...body, nested: { x: 0, y: 0, z: 0 } })
  return {
    x: center.x * spread - pivot.x,
    y: center.y * spread - pivot.y,
    z: center.z * spread - pivot.z,
  }
}

/**
 * Tfw element complex set. Same ranks, mouth-bar fans, and ridge stack as the
 * symmetric Wf scene. The channel is the tidal funnel and yaws +15° toward +X.
 * From its landward tip to the flare start the centreline turns 45° toward −X.
 * The right flank uses the asymmetric loft. The left flank uses the
 * convex-seaward bow, moved landward by half one mesh width, with each channel
 * end overlapping the left wall by 10% of the local channel width. A half
 * channel is twice the tip-to-tip length, the extra length landward, and a
 * second section runs from that landward end to the tidal channel's landward
 * tip. A mouth-bar complex copied from the Wf offsets sits on the half channel,
 * plus the wider seaward complex copied from the Wf distal fan.
 * A symmetric beach-ridge complex sits on the left of that half channel with
 * the same offsets. A concave-seaward complex sits to the right of the
 * asymmetric flank, overlapping it by 5% of that flank's alongshore span.
 * Each concave ridge shifts landward so its channel-end centreline meets the
 * outer tip of the asymmetric ridge beside it. The water slab grows to cover that extension. A delta
 * plain's top aligns with the crest of the most landward beach ridge, follows the
 * landward toe of each ridge set, stops at the channels, and runs to the
 * water slab's landward edge.
 * Mouth-bar positions are swung about the channel so the fan centreline
 * lies on the channel centreline, then each bar's channel-local X is scaled
 * with the local half-width so it keeps the same place between the margins.
 * Beach-ridge channel ends stay on those margins. Yaws follow that axis, plus each fan’s
 * Wf offset (doubled on each bar), plus up to 10° outward (0 on the axis).
 * Three mouth-bar element complexes on the tidal channel: proximal, middle
 * seaward (half the Wf overlap, then the inner-pair centre gap shrinks 30%), and a third seaward
 * fan copied from the middle. `ec-mouth` and `ec-mouth-sea` each sit one beach-ridge
 * step further landward than the Wf seaward fan, so they overlap the complex
 * landward of them by the amount the Wf fans had before the fifth ridge.
 * The landward fan keeps the Wf overlap. The Wf distal complex is not drawn on
 * this channel; the half channel carries that wider third complex instead.
 */
export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const spread = 1 + (EXPLODE_SPREAD - 1) * t
  const wfPlaced = wfSceneAt(t).filter((item) => !isDistalMouthId(item.id))
  const rested = sceneBodiesAtRest()
  const half = leftHalfChannelBody(rested)
  const extras = [
    half,
    leftHalfChannelJoin(half, rested),
    ...leftMouthComplex(half),
    ...leftRidgeComplex(half),
    ...rightConcaveComplex(rested),
  ]
  const ground = extendWaterSlab(rested.find((body) => body.id === 'ecs')!, extras)
  const wfIds = new Set(wfSceneAt(0).map((body) => body.id))
  const mouthExtras = rested.filter((body) => !wfIds.has(body.id))
  const placed = wfPlaced.map((item) => {
    const body = item.id === 'ecs' ? ground : rested.find((entry) => entry.id === item.id)!
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    return {
      ...body,
      position,
      showLabel: item.showLabel,
    }
  })
  for (const body of mouthExtras) {
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    const showLabel =
      body.rank === 'element-complex'
        ? t > 0
        : body.rank === 'element-set'
          ? t > 1 / 3
          : t > 2 / 3 && body.id === 'e-mouth-sea-0'
    placed.push({ ...body, position, showLabel })
  }
  for (const body of extras) {
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    const showLabel =
      body.rank === 'element-complex'
        ? t > 0
        : body.rank === 'element-set'
          ? t > 1 / 3
          : t > 2 / 3 &&
            (body.id === 'e-channel-l' ||
              body.id === 'e-channel-l-join' ||
              body.id === 'e-mouth-l-0' ||
              body.id === 'e-mouth-l-dist-0' ||
              body.id === 'e-ridge-hl-0' ||
              body.id === 'e-ridge-cr-0')
    placed.push({ ...body, position, showLabel })
  }
  const shape = deltaPlainShape('tfw', [ground, ...rested.filter((body) => body.kind !== 'ground'), ...extras])
  const plain: SceneBody = {
    id: 'e-deltaplain',
    name: 'Delta plain',
    rank: 'element',
    parentId: 'ecs',
    kind: 'delta-plain',
    nested: {
      x: shape.origin.x,
      y: shape.y - DELTA_PLAIN_THICKNESS / 2,
      z: shape.origin.z,
    },
  }
  placed.push({
    ...plain,
    position: spread === 1 ? plain.nested : explodePosition(plain, spread),
    showLabel: t > 2 / 3,
  })
  return placed
}
