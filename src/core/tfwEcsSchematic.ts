import { tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  beachRidgeStations,
  bodyCenter,
  EXPLODE_SPREAD,
  sceneAt as wfSceneAt,
  type PlacedBody,
  type SceneBody,
} from './wfSchematic'

/** Map pin for the Tfw element-complex set. Latitude −19.984295231442236, longitude 119.165775381814. */
export const TFW_ECS_ANCHOR = { lat: -19.984295231442236, lng: 119.165775381814 } as const

/** Channel and −X (left) beach ridges swing toward +X. */
export const TFW_CHANNEL_YAW_RAD = (15 * Math.PI) / 180

/** Mouth-bar complex bodies get an extra yaw toward −X. */
export const TFW_MOUTH_COMPLEX_YAW_RAD = (-10 * Math.PI) / 180

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

function channelSeawardOuterEdge(body: SceneBody): { x: number; z: number } {
  const { seaZ } = tidalChannelSpan()
  const r = tidalChannelRadiusAt(seaZ)
  const world = worldFromNested(body, { x: r, y: 0, z: seaZ })
  return { x: world.x, z: world.z }
}

function ridgeChannelEndWorld(ridge: SceneBody): { x: number; z: number } {
  const side = ridge.id.includes('-r-') ? 'r' : 'l'
  const index = Number(ridge.id.slice(ridge.id.lastIndexOf('-') + 1))
  const station = beachRidgeStations(side, index)[0]
  const world = worldFromNested(ridge, { x: station.x, y: 0, z: station.z })
  return { x: world.x, z: world.z }
}

function tfwRightFlankLandwardDeltaZ(bodies: SceneBody[]): number {
  const channel = bodies.find((body) => body.id === 'e-channel')
  const ridge = bodies.find((body) => body.id === 'e-ridge-r-3')
  if (!channel || !ridge) return 0
  const edge = channelSeawardOuterEdge(channel)
  const end = ridgeChannelEndWorld(ridge)
  return edge.z - end.z
}

function applyTfwYaw(body: SceneBody): SceneBody {
  const yaw = body.yaw ?? 0
  if (body.id === 'e-channel') {
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: TFW_CHANNEL_YAW_RAD }
  }
  if (body.id.startsWith('e-ridge-l-')) {
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: TFW_CHANNEL_YAW_RAD }
  }
  if (
    body.id === 'ec-mouth' ||
    body.id === 'es-mouth' ||
    body.kind === 'mouth-bar' ||
    body.id.startsWith('e-mouth')
  ) {
    return { ...body, name: NAMES[body.id] ?? body.name, yaw: yaw + TFW_MOUTH_COMPLEX_YAW_RAD }
  }
  if (body.id in NAMES) {
    return { ...body, name: NAMES[body.id] ?? body.name }
  }
  return body
}

function applyRightFlankLandwardZ(body: SceneBody, deltaZ: number): SceneBody {
  if (!body.id.startsWith('e-ridge-r-')) return body
  return { ...body, nested: { ...body.nested, z: body.nested.z + deltaZ } }
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
  const yawed = wf.map((body) => applyTfwYaw({ ...body, yaw: body.yaw }))
  const landwardDelta = tfwRightFlankLandwardDeltaZ(yawed)
  const withLandward = yawed.map((body) => applyRightFlankLandwardZ(body, landwardDelta))
  return withLandward.map((body) => shiftedBody(body, withLandward))
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
 * symmetric Wf scene. The channel is the tidal funnel. Both beach-ridge flanks
 * use the asymmetric loft. The channel and left flank yaw +15° toward +X.
 * The right flank keeps its stack spacing, shifts landward so the seaward
 * ridge meets the channel's seaward +X corner, and each channel end sits
 * on the right wall.
 */
export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const spread = 1 + (EXPLODE_SPREAD - 1) * t
  const wfPlaced = wfSceneAt(t)
  const rested = sceneBodiesAtRest()
  return wfPlaced.map((placed) => {
    const body = rested.find((item) => item.id === placed.id)!
    const position = spread === 1 ? body.nested : explodePosition(body, spread)
    return {
      ...body,
      position,
      showLabel: placed.showLabel,
    }
  })
}
