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

/** Straight channel. Radius is alongshore and vertical. Length runs seaward (+Z) after the view turns the cylinder. */
export const CHANNEL_RADIUS = 0.2
export const CHANNEL_LENGTH = 3.8

/** Mouth-bar ellipsoid diameters. Y is the full height. Z is the long axis. */
export const MOUTH_BAR_SCALE = { x: 0.62, y: 0.36, z: 1.25 } as const

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
const RIDGE_BOW = 0.72
const RIDGE_HALF_WIDTH = 0.26
const RIDGE_HEIGHT = 0.32
const RIDGE_STATIONS = 10

/**
 * One beach-ridge centreline in ridge-local coordinates.
 * X is alongshore, away from the channel. Z is seaward relative to the
 * channel-end centre: the tip swings seaward, and the arc stays landward
 * of the straight chord, so the ridge is convex away from the sea.
 * Width and height are largest at the channel and smallest at the tip.
 */
export function beachRidgeStations(side: 'l' | 'r'): RidgeStation[] {
  const sign = side === 'r' ? 1 : -1
  const stations: RidgeStation[] = []
  for (let i = 0; i < RIDGE_STATIONS; i += 1) {
    const t = i / (RIDGE_STATIONS - 1)
    const taper = 1 - t
    stations.push({
      x: sign * (RIDGE_INNER + t * (RIDGE_OUTER - RIDGE_INNER)),
      z: RIDGE_BOW * t * t,
      halfWidth: RIDGE_HALF_WIDTH * taper + 0.03,
      height: RIDGE_HEIGHT * taper + 0.04,
    })
  }
  return stations
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
      nested: { x: sign * 1.7, y: 0.5, z: RIDGE_Z_BASE + 1.5 * RIDGE_Z_STEP },
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

const MOUTH_BARS: Array<{ x: number; y: number; z: number }> = [
  { x: 0, y: 0.2, z: 0.35 },
  { x: 0.45, y: 0.34, z: 0.7 },
  { x: -0.75, y: 0.48, z: 1.05 },
  { x: 1.1, y: 0.62, z: 1.4 },
  { x: -1.5, y: 0.76, z: 1.8 },
]

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
    nested: { x: 0, y: 0.62, z: RIDGE_Z_BASE + 2 * RIDGE_Z_STEP },
  },
  {
    id: 'ec-mouth',
    name: 'Wf-Mouth Bar',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'group',
    nested: { x: 0, y: 0.9, z: 1.05 },
  },
  ...ridgeFlank('l'),
  ...ridgeFlank('r'),
  {
    id: 'es-mouth',
    name: 'Mouth-bar set',
    rank: 'element-set',
    parentId: 'ec-mouth',
    kind: 'group',
    nested: { x: 0, y: 1.05, z: 1.05 },
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
    nested: { x: 0, y: CHANNEL_RADIUS, z: 0.35 },
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
