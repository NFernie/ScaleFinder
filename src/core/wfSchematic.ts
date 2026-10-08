export const WF_ANCHOR = { lat: 44.878674, lng: 29.515563 } as const

export type Rank = 'element' | 'element-set' | 'element-complex' | 'element-complex-set'

export type SolidKind = 'ground' | 'channel' | 'mouth-bar' | 'beach-ridge' | 'group'

export interface SceneBody {
  id: string
  name: string
  rank: Rank
  parentId: string | null
  kind: SolidKind
  nested: { x: number; y: number; z: number }
}

export interface PlacedBody extends SceneBody {
  position: { x: number; y: number; z: number }
}

export interface RidgeStation {
  x: number
  z: number
  halfWidth: number
  height: number
}

export interface RidgeCorner {
  x: number
  y: number
  z: number
}

/** Half-channel radius. Half of the previous full cylinder. */
export const CHANNEL_RADIUS = 0.1

/** Mouth-bar ellipsoid diameters. Y is the full height. Z is the long axis. */
export const MOUTH_BAR_SCALE = { x: 0.5, y: 0.28, z: 0.72 } as const

/** How far the ridge base (lowest Y) sits seaward of the crest. */
export const RIDGE_BASE_SEAWARD = 0.1

const RANK_LIFT: Record<Rank, number> = {
  'element-complex-set': 0,
  'element-complex': 1.2,
  'element-set': 2.4,
  element: 3.6,
}

const RIDGE_COUNT = 4
const RIDGE_INNER = CHANNEL_RADIUS
const RIDGE_OUTER = 3.45
const RIDGE_Z_BASE = -0.55
const RIDGE_Z_STEP = 0.34
const RIDGE_BOW = 0.85
const RIDGE_HALF_WIDTH = 0.26
const RIDGE_HEIGHT = 0.32
const RIDGE_STATIONS = 10
const CHANNEL_LANDWARD_REACH = 1.55
const CHANNEL_FLAT_Y = 0.32
const MOUTH_COUNT = 9
const MOUTH_Z_STEP = 0.2

/**
 * One beach-ridge centreline in ridge-local coordinates.
 * X is alongshore, away from the channel. The thick end, against the
 * channel, is seaward of the thin tip. The arc stays seaward of the
 * straight chord, so the two flanks read as one lobe convex toward the sea.
 */
export function beachRidgeStations(side: 'l' | 'r'): RidgeStation[] {
  const sign = side === 'r' ? 1 : -1
  const stations: RidgeStation[] = []
  for (let i = 0; i < RIDGE_STATIONS; i += 1) {
    const t = i / (RIDGE_STATIONS - 1)
    const taper = 1 - t
    stations.push({
      x: sign * (RIDGE_INNER + t * (RIDGE_OUTER - RIDGE_INNER)),
      z: RIDGE_BOW * (1 - t * t),
      halfWidth: RIDGE_HALF_WIDTH * taper + 0.03,
      height: RIDGE_HEIGHT * taper + 0.04,
    })
  }
  return stations
}

/** Four corners at one station. The two base corners are shifted seaward. */
export function beachRidgeRing(station: RidgeStation): RidgeCorner[] {
  const crown = station.halfWidth * 0.28
  return [
    { x: station.x, y: 0, z: station.z - station.halfWidth + RIDGE_BASE_SEAWARD },
    { x: station.x, y: 0, z: station.z + station.halfWidth + RIDGE_BASE_SEAWARD },
    { x: station.x, y: station.height, z: station.z + crown },
    { x: station.x, y: station.height, z: station.z - crown },
  ]
}

function ridgeWorldZ(index: number): number {
  return RIDGE_Z_BASE + index * RIDGE_Z_STEP + beachRidgeStations('r')[0].z
}

/** Seaward tip of the channel meets the thick end of the most seaward ridge. */
export function channelSpan(): { zLand: number; zSea: number; length: number; centerZ: number; flatY: number } {
  const zSea = ridgeWorldZ(RIDGE_COUNT - 1)
  const zLand = ridgeWorldZ(0) - CHANNEL_LANDWARD_REACH
  return {
    zLand,
    zSea,
    length: zSea - zLand,
    centerZ: (zLand + zSea) / 2,
    flatY: CHANNEL_FLAT_Y,
  }
}

export const CHANNEL_LENGTH = channelSpan().length

function sigmoid01(t: number): number {
  const k = 8
  const raw = (u: number) => 1 / (1 + Math.exp(-k * (u - 0.5)))
  const start = raw(0)
  const end = raw(1)
  return (raw(t) - start) / (end - start)
}

function mouthBars(): Array<{ x: number; y: number; z: number }> {
  const span = channelSpan()
  const halfZ = MOUTH_BAR_SCALE.z / 2
  const halfY = MOUTH_BAR_SCALE.y / 2
  const channelBottom = span.flatY - CHANNEL_RADIUS
  const yLand = channelBottom - halfY - 0.04
  const ySea = yLand - 0.34
  const z0 = span.zSea - 0.18 + halfZ
  const bars = []
  for (let i = 0; i < MOUTH_COUNT; i += 1) {
    const t = i / (MOUTH_COUNT - 1)
    const sign = i === 0 ? 0 : i % 2 === 1 ? 1 : -1
    bars.push({
      x: sign * 0.11 * i,
      y: yLand + (ySea - yLand) * sigmoid01(t),
      z: z0 + i * MOUTH_Z_STEP,
    })
  }
  return bars
}

function ridgeFlank(side: 'l' | 'r'): SceneBody[] {
  const sign = side === 'r' ? 1 : -1
  const parentId = `es-ridge-${side}`
  const bodies: SceneBody[] = [
    {
      id: parentId,
      name: side === 'r' ? 'Beach-ridge set right' : 'Beach-ridge set left',
      rank: 'element-set',
      parentId: 'ec-lobe',
      kind: 'group',
      nested: { x: sign * 1.7, y: 0.5, z: RIDGE_Z_BASE + 1.5 * RIDGE_Z_STEP + RIDGE_BOW * 0.45 },
    },
  ]
  for (let index = 0; index < RIDGE_COUNT; index += 1) {
    bodies.push({
      id: `e-ridge-${side}-${index}`,
      name: 'Beach ridge',
      rank: 'element',
      parentId,
      kind: 'beach-ridge',
      nested: { x: 0, y: 0.04, z: RIDGE_Z_BASE + index * RIDGE_Z_STEP },
    })
  }
  return bodies
}

const MOUTH_BARS = mouthBars()
const MOUTH_FAN_Z = (MOUTH_BARS[0].z + MOUTH_BARS[MOUTH_BARS.length - 1].z) / 2
const MOUTH_FAN_Y = MOUTH_BARS.reduce((sum, bar) => sum + bar.y, 0) / MOUTH_BARS.length
const CHANNEL = channelSpan()

const BODIES: SceneBody[] = [
  {
    id: 'ecs',
    name: 'Wf element complex set',
    rank: 'element-complex-set',
    parentId: null,
    kind: 'ground',
    nested: { x: 0, y: 0, z: 0.4 },
  },
  {
    id: 'ec-lobe',
    name: 'Wf-Lobe',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'group',
    nested: { x: 0, y: 0.62, z: RIDGE_Z_BASE + 2 * RIDGE_Z_STEP + RIDGE_BOW * 0.45 },
  },
  {
    id: 'ec-mouth',
    name: 'Wf-Mouth Bar',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'group',
    nested: { x: 0, y: CHANNEL.flatY + 0.2, z: (CHANNEL.zSea + MOUTH_FAN_Z) / 2 },
  },
  ...ridgeFlank('l'),
  ...ridgeFlank('r'),
  {
    id: 'es-mouth',
    name: 'Mouth-bar set',
    rank: 'element-set',
    parentId: 'ec-mouth',
    kind: 'group',
    nested: { x: 0, y: MOUTH_FAN_Y + 0.2, z: MOUTH_FAN_Z },
  },
  ...MOUTH_BARS.map((point, index) => ({
    id: `e-mouth-${index}`,
    name: 'Mouth bar',
    rank: 'element' as const,
    parentId: 'es-mouth',
    kind: 'mouth-bar' as const,
    nested: { x: point.x, y: point.y, z: point.z },
  })),
  {
    id: 'e-channel',
    name: 'Channel fill',
    rank: 'element',
    parentId: 'ec-mouth',
    kind: 'channel',
    nested: { x: 0, y: CHANNEL.flatY, z: CHANNEL.centerZ },
  },
]

export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  return BODIES.map((body) => ({
    ...body,
    position: {
      x: body.nested.x,
      y: body.nested.y + RANK_LIFT[body.rank] * t,
      z: body.nested.z,
    },
  }))
}
