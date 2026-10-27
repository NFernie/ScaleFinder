import { brConvexSwStations } from './brConvexSwPlan'
import { tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  beachRidgeStations,
  bodyCenter,
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
 * Multiplier on the seaward mouth-bar nested X so that fan's inner-pair overlap
 * is half the Wf overlap. The landward (proximal) fan stays at the Wf overlap.
 */
export function tfwMouthBarXSpread(): number {
  const gap = mouthFanReferenceGap() * MOUTH_FAN_X_SCALE
  const overlap = MOUTH_BAR_SCALE.x - gap
  const targetGap = MOUTH_BAR_SCALE.x - overlap * 0.5
  return targetGap / gap
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

function shiftedBody(body: SceneBody, bodiesForShift: SceneBody[]): SceneBody {
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
  return yawed.map((body) => shiftedBody(body, yawed))
}

/**
 * Half channel on the −X side of the convex left-flank set.
 * Its seaward end sits one radius left of the outermost ridge tip. Its
 * landward end is the tidal channel's landward left wall, so the length is
 * the straight run that just meets the funnel.
 */
function leftHalfChannelBody(bodies: SceneBody[]): SceneBody {
  const channel = bodies.find((body) => body.id === 'e-channel')!
  const land = funnelWallPointWorld(channel, tidalChannelSpan().landZ, 'l')
  let tip = { x: Infinity, z: 0 }
  for (const body of bodies) {
    if (!body.id.startsWith('e-ridge-l-')) continue
    const index = Number(body.id.slice(body.id.lastIndexOf('-') + 1))
    for (const station of brConvexSwStations('l', Number.isFinite(index) ? index : 0)) {
      const world = worldFromNested(body, { x: station.x, y: 0, z: station.z })
      if (world.x < tip.x) tip = { x: world.x, z: world.z }
    }
  }
  const sea = { x: tip.x - CHANNEL_RADIUS, z: tip.z }
  const dx = sea.x - land.x
  const dz = sea.z - land.z
  const length = Math.hypot(dx, dz)
  return {
    id: 'e-channel-l',
    name: 'Half channel',
    rank: 'element',
    parentId: 'es-ridge-l',
    kind: 'channel',
    nested: {
      x: (sea.x + land.x) / 2,
      y: channel.nested.y,
      z: (sea.z + land.z) / 2,
    },
    yaw: Math.atan2(dx, dz),
    channelLength: length,
  }
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
 * The right flank uses the asymmetric loft. The left flank uses the
 * convex-seaward bow in the same Z stack and yaw as the right flank, with
 * each channel end on the opposite (left) wall. A half channel sits on the
 * −X side of that left set and runs landward until it meets the tidal channel.
 * Mouth-bar positions are swung about the channel so the fan centreline
 * lies on the channel centreline. Yaws follow that axis, plus each fan’s
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
  const position = spread === 1 ? half.nested : explodePosition(half, spread)
  placed.push({ ...half, position, showLabel: t > 2 / 3 })
  return placed
}
