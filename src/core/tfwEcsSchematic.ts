import { brConvexSwStations } from './brConvexSwPlan'
import { tidalChannelFrameAt, tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  beachRidgeRing,
  beachRidgeStations,
  bodyCenter,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  EXPLODE_SPREAD,
  MOUTH_BAR_SCALE,
  MOUTH_FAN_X_SCALE,
  mouthFanReferenceGap,
  sceneAt as wfSceneAt,
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

/** Extra yaw, in degrees, from the inner off-axis bars out to the outer bars. */
const MOUTH_BAR_SIDE_YAW_INNER_DEG = 2
const MOUTH_BAR_SIDE_YAW_OUTER_DEG = 5

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

/** Fore-aft width of one BRconvexSW mesh. The cross-section is uniform. */
export function tfwConvexSwMeshWidth(): number {
  const ring = beachRidgeRing(brConvexSwStations('l', 0)[0])
  let minZ = Infinity
  let maxZ = -Infinity
  for (const corner of ring) {
    minZ = Math.min(minZ, corner.z)
    maxZ = Math.max(maxZ, corner.z)
  }
  return maxZ - minZ
}

/**
 * Multiplier on the seaward mouth-bar nested X so that fan's inner-pair overlap
 * is half the Wf overlap. The landward (proximal) fan stays at the Wf overlap.
 */
export function tfwMouthBarXSpread(): number {
  const gap = mouthFanReferenceGap() * MOUTH_FAN_X_SCALE
  const overlap = MOUTH_BAR_SCALE.x - gap
  const targetGap = MOUTH_BAR_SCALE.x - overlap * 0.5
  return targetGap / gap
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
  if (
    body.id === 'ec-mouth' ||
    body.id === 'es-mouth' ||
    body.kind === 'mouth-bar' ||
    body.id.startsWith('e-mouth')
  ) {
    const templateX = body.kind === 'mouth-bar' ? body.nested.x / MOUTH_FAN_X_SCALE : 0
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: tfwMouthBarYaw(yaw, templateX) }
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
    const onFan = body.kind === 'mouth-bar' || body.id === 'ec-mouth' || body.id === 'es-mouth'
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
  if (!body.id.startsWith('e-mouth-') || body.id.startsWith('e-mouth-prox-')) return body
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
  const wf = wfSceneAt(0)
  const yawed = alignMouthBarsToChannel(
    wf.map((body) => applyMouthBarXSpread(applyTfwYaw({ ...body, yaw: body.yaw }))),
  )
  const channel = yawed.find((body) => body.id === 'e-channel')
  const margined = channel ? yawed.map((body) => applyMouthBarMargin(body, channel)) : yawed
  return margined.map((body) => shiftedBody(body, margined))
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

function leftMouthId(id: string): string {
  if (id === 'ec-mouth') return 'ec-mouth-l'
  if (id === 'es-mouth') return 'es-mouth-l'
  if (id.startsWith('e-mouth-prox-')) return `e-mouth-l-prox-${id.slice('e-mouth-prox-'.length)}`
  return `e-mouth-l-${id.slice('e-mouth-'.length)}`
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
    .filter((body) => body.id === 'ec-mouth' || body.id === 'es-mouth' || body.kind === 'mouth-bar')
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
        body.id === 'ec-mouth' ? 'Tfw-Mouth Bar left' : body.id === 'es-mouth' ? 'Mouth-bar set left' : body.name
      const parentId = body.id === 'ec-mouth' ? 'ecs' : body.id === 'es-mouth' ? 'ec-mouth-l' : 'es-mouth-l'
      return {
        ...body,
        id: leftMouthId(body.id),
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
 * tip. A mouth-bar complex copied from the Wf offsets sits on the half channel.
 * Mouth-bar positions are swung about the channel so the fan centreline
 * lies on the channel centreline, then each bar's channel-local X is scaled
 * with the local half-width so it keeps the same place between the margins.
 * Beach-ridge channel ends stay on those margins. Yaws follow that axis, plus each fan’s
 * Wf offset, plus up to 5° outward (0 on the axis and proximal bars).
 * The seaward fan is spread to half the Wf alongshore overlap; the
 * landward fan keeps the Wf overlap.
 */
export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const spread = 1 + (EXPLODE_SPREAD - 1) * t
  const wfPlaced = wfSceneAt(t)
  const rested = sceneBodiesAtRest()
  const placed = wfPlaced.map((item) => {
    const body = rested.find((entry) => entry.id === item.id)!
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    return {
      ...body,
      position,
      showLabel: item.showLabel,
    }
  })
  const half = leftHalfChannelBody(rested)
  const extras = [half, leftHalfChannelJoin(half, rested), ...leftMouthComplex(half)]
  for (const body of extras) {
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    const showLabel =
      body.rank === 'element-complex'
        ? t > 0
        : body.rank === 'element-set'
          ? t > 1 / 3
          : t > 2 / 3 && (body.id === 'e-channel-l' || body.id === 'e-channel-l-join' || body.id === 'e-mouth-l-0')
    placed.push({ ...body, position, showLabel })
  }
  return placed
}
