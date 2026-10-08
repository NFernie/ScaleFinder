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
  /** Yaw around Y, in radians. Positive swings the seaward end toward +X. */
  yaw?: number
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

/**
 * Mouth-bar diameters. Y is the half-spheroid thickness, 50% more than the
 * previous sheet. Z is the long axis, 50% longer, with the extra length seaward.
 */
export const MOUTH_BAR_SCALE = { x: 0.5, y: 0.084, z: 1.08 } as const

/** How far the seaward rim of a mouth bar sits below its landward base. */
export const MOUTH_BAR_DIP = 0.18

/** Each mouth bar sits this fraction of its thickness below the adjacent landward bar. */
export const MOUTH_BAR_STEP = 0.05

/** Degrees added to the yaw for each step seaward of the channel bar. */
export const MOUTH_BAR_YAW_STEP = 1

/** How far the ridge base (lowest Y) sits seaward of the crest. */
export const RIDGE_BASE_SEAWARD = 0.12

/** Each landward beach ridge sits this fraction of the crest height above the next seaward ridge. */
export const RIDGE_DOWNSTEP = 0.02

/** Thickness of the water-line slab. Its top is the channel base. */
export const GROUND_THICKNESS = 0.05

/** Diagram water line. Opacity is 30%. */
export const WATER_COLOUR = 0x38bdf8
export const WATER_OPACITY = 0.3

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
/** Seaward swing added along the outer half of the centreline. */
const RIDGE_TIP_TURN = 0.7
/** Fore-aft half-width. Half of the previous ridge thickness. */
const RIDGE_HALF_WIDTH = 0.13
const RIDGE_TIP_WIDTH = 0.015
const RIDGE_STATIONS = 10
const CHANNEL_LANDWARD_REACH = 1.55
const CHANNEL_FLAT_Y = 0.32
const RIDGE_NEST_Y = 0.04
/** Crest height the 2% base offset was set against. Bases stay on this spacing. */
const RIDGE_BASE_REF = 0.36
/** How far the tip crest sits above the water line on the lowest ridge. */
const RIDGE_TIP_CLEARANCE = 0.03

/**
 * Plan-view centreline. A landward sweep from the channel, then a sigmoid
 * so the tip turns slightly back toward the sea.
 */
function ridgeCentreZ(t: number): number {
  const landward = RIDGE_BOW * (1 - t * t)
  const start = 0.35
  const u = t <= start ? 0 : (t - start) / (1 - start)
  return landward + RIDGE_TIP_TURN * u * u
}

/**
 * Vertical profile shared by every ridge. The base positions stay put.
 * The thick end of the most seaward ridge meets the channel top. The tip
 * crest stays above the water line.
 */
function ridgeHeights(): { thick: number; tip: number } {
  const lowestBase = RIDGE_NEST_Y - (RIDGE_COUNT - 1) * RIDGE_BASE_REF * RIDGE_DOWNSTEP
  const water = CHANNEL_FLAT_Y - CHANNEL_RADIUS
  return {
    thick: CHANNEL_FLAT_Y - lowestBase,
    tip: water - lowestBase + RIDGE_TIP_CLEARANCE,
  }
}

/**
 * One beach-ridge centreline in ridge-local coordinates.
 * X is alongshore, away from the channel. The centreline is sigmoidal:
 * it swings landward, then the tip turns slightly seaward. The thick end
 * is still seaward of the tip. Height tapers toward the tip, and the whole
 * crest stays above the water line.
 */
export function beachRidgeStations(side: 'l' | 'r'): RidgeStation[] {
  const sign = side === 'r' ? 1 : -1
  const { thick, tip } = ridgeHeights()
  const stations: RidgeStation[] = []
  for (let i = 0; i < RIDGE_STATIONS; i += 1) {
    const t = i / (RIDGE_STATIONS - 1)
    const taper = 1 - t
    stations.push({
      x: sign * (RIDGE_INNER + t * (RIDGE_OUTER - RIDGE_INNER)),
      z: ridgeCentreZ(t),
      halfWidth: RIDGE_HALF_WIDTH * taper + RIDGE_TIP_WIDTH,
      height: tip + (thick - tip) * taper,
    })
  }
  return stations
}

/**
 * Cross-section at one station. The base sits seaward of the crest.
 * The seaward face is a sigmoid: it stays landward of the straight chord
 * through the upper half, then kicks out to the toe.
 */
export function beachRidgeRing(station: RidgeStation): RidgeCorner[] {
  const crown = station.halfWidth * 0.28
  const baseLandZ = station.z - station.halfWidth + RIDGE_BASE_SEAWARD
  const baseSeaZ = station.z + station.halfWidth + RIDGE_BASE_SEAWARD
  const crestSeaZ = station.z + crown
  const crestLandZ = station.z - crown
  const ring: RidgeCorner[] = [
    { x: station.x, y: 0, z: baseLandZ },
    { x: station.x, y: 0, z: baseSeaZ },
  ]
  const steps = 4
  for (let i = 1; i < steps; i += 1) {
    const t = 1 - i / steps
    ring.push({
      x: station.x,
      y: station.height * (1 - t),
      z: crestSeaZ + (baseSeaZ - crestSeaZ) * sigmoid01(t),
    })
  }
  ring.push(
    { x: station.x, y: station.height, z: crestSeaZ },
    { x: station.x, y: station.height, z: crestLandZ },
  )
  return ring
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

/** Base of one mouth bar. The landward rim is 0. The seaward rim is the full dip. */
export function mouthBarBaseOffset(z: number, halfZ: number): number {
  const t = halfZ === 0 ? 0 : (z / halfZ + 1) / 2
  return -MOUTH_BAR_DIP * sigmoid01(Math.min(1, Math.max(0, t)))
}

/** Highest point of a mouth bar above its landward base. */
export function mouthBarCrownY(): number {
  const halfZ = MOUTH_BAR_SCALE.z / 2
  let crown = 0
  const steps = 48
  for (let i = 0; i <= steps; i += 1) {
    const z = -halfZ + (i / steps) * MOUTH_BAR_SCALE.z
    const dome = MOUTH_BAR_SCALE.y * Math.sqrt(Math.max(0, 1 - (z / halfZ) ** 2))
    crown = Math.max(crown, mouthBarBaseOffset(z, halfZ) + dome)
  }
  return crown
}

/** Base of the most seaward beach ridge. The landward mouth bar shares this Y. */
export function seawardRidgeBaseY(): number {
  return RIDGE_NEST_Y - (RIDGE_COUNT - 1) * RIDGE_BASE_REF * RIDGE_DOWNSTEP
}

/**
 * Filled V in front of the channel. The apex is the centre bar.
 * The next row is one left and one right. Each of those then adds an
 * outer bar, a bar back toward the opposite side of the axis, and one
 * more bar along its own arm. The two axis bars overlap.
 */
const MOUTH_FAN: Array<{ x: number; z: number }> = [
  { x: 0, z: 0 },
  { x: -0.32, z: 0.18 },
  { x: 0.32, z: 0.18 },
  { x: -0.64, z: 0.36 },
  { x: 0.16, z: 0.34 },
  { x: -0.48, z: 0.5 },
  { x: 0.64, z: 0.36 },
  { x: -0.16, z: 0.34 },
  { x: 0.48, z: 0.5 },
]

/** Top of the water-line slab. It meets the base of the channel. */
export function waterlineY(): number {
  const span = channelSpan()
  return span.flatY - CHANNEL_RADIUS
}

function layMouthFan(originZ: number, yLand: number): Array<{ x: number; y: number; z: number; yaw: number }> {
  const step = MOUTH_BAR_SCALE.y * MOUTH_BAR_STEP
  const levels = [...new Set(MOUTH_FAN.map((point) => point.z))].sort((a, b) => a - b)
  const rank = new Map(levels.map((level, index) => [level, index]))
  return MOUTH_FAN.map((point) => {
    const seaward = rank.get(point.z) ?? 0
    const degrees = point.x === 0 ? 0 : Math.sign(point.x) * seaward * MOUTH_BAR_YAW_STEP
    return {
      x: point.x,
      y: yLand - seaward * step,
      z: originZ + point.z,
      yaw: (degrees * Math.PI) / 180,
    }
  })
}

function mouthFans(): { seaward: ReturnType<typeof layMouthFan>; proximal: ReturnType<typeof layMouthFan> } {
  const span = channelSpan()
  const halfZ = MOUTH_BAR_SCALE.z / 2
  return {
    seaward: layMouthFan(span.zSea - 0.12 + halfZ, seawardRidgeBaseY()),
    // Landward rim on the channel where the most landward ridge meets it.
    // The crown touches the channel base from below, then the fan progrades seaward.
    proximal: layMouthFan(ridgeWorldZ(0) + halfZ, waterlineY() - mouthBarCrownY()),
  }
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
      nested: {
        x: 0,
        y: RIDGE_NEST_Y - index * RIDGE_BASE_REF * RIDGE_DOWNSTEP,
        z: RIDGE_Z_BASE + index * RIDGE_Z_STEP,
      },
    })
  }
  return bodies
}

const FANS = mouthFans()
const MOUTH_BARS = [...FANS.seaward, ...FANS.proximal]
const MOUTH_FAN_Z = MOUTH_BARS.reduce((sum, bar) => sum + bar.z, 0) / MOUTH_BARS.length
const MOUTH_FAN_Y = MOUTH_BARS.reduce((sum, bar) => sum + bar.y, 0) / MOUTH_BARS.length
const CHANNEL = channelSpan()

const BODIES: SceneBody[] = [
  {
    id: 'ecs',
    name: 'Wf element complex set',
    rank: 'element-complex-set',
    parentId: null,
    kind: 'ground',
    nested: { x: 0, y: waterlineY() - GROUND_THICKNESS / 2, z: 0.4 },
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
  ...FANS.seaward.map((point, index) => ({
    id: `e-mouth-${index}`,
    name: 'Mouth bar',
    rank: 'element' as const,
    parentId: 'es-mouth',
    kind: 'mouth-bar' as const,
    nested: { x: point.x, y: point.y, z: point.z },
    yaw: point.yaw,
  })),
  ...FANS.proximal.map((point, index) => ({
    id: `e-mouth-prox-${index}`,
    name: 'Mouth bar',
    rank: 'element' as const,
    parentId: 'es-mouth',
    kind: 'mouth-bar' as const,
    nested: { x: point.x, y: point.y, z: point.z },
    yaw: point.yaw,
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
