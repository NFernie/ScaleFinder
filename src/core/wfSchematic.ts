export const WF_ANCHOR = { lat: 44.878674, lng: 29.515563 } as const

export type Rank = 'element' | 'element-set' | 'element-complex' | 'element-complex-set'

export type SolidKind =
  | 'ground'
  | 'lobe'
  | 'mouth-slab'
  | 'channel'
  | 'mouth-bar'
  | 'beach-ridge'
  | 'swale'
  | 'group'

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

const RANK_LIFT: Record<Rank, number> = {
  'element-complex-set': 0,
  'element-complex': 1.2,
  'element-set': 2.4,
  element: 3.6,
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
      nested: { x: sign * 2.15, y: 0.2, z: -0.4 },
    },
  ]
  const along = [1.1, 1.8, 2.5, 3.2]
  along.forEach((distance, index) => {
    bodies.push({
      id: `e-ridge-${side}-${index}`,
      name: 'Beach ridge',
      rank: 'element',
      parentId,
      kind: 'beach-ridge',
      nested: { x: sign * distance, y: 0.2, z: -0.4 },
    })
  })
  ;[1.45, 2.15, 2.85].forEach((distance, index) => {
    bodies.push({
      id: `e-swale-${side}-${index}`,
      name: 'Swale',
      rank: 'element',
      parentId,
      kind: 'swale',
      nested: { x: sign * distance, y: 0.32, z: -0.4 },
    })
  })
  return bodies
}

const MOUTH_BARS: Array<{ x: number; z: number }> = [
  { x: 0, z: 0.35 },
  { x: 0.45, z: 0.7 },
  { x: -0.75, z: 1.05 },
  { x: 1.1, z: 1.4 },
  { x: -1.5, z: 1.8 },
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
    kind: 'lobe',
    nested: { x: 0, y: 0.08, z: 2.3 },
  },
  {
    id: 'ec-mouth',
    name: 'Wf-Mouth Bar',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'mouth-slab',
    nested: { x: 0, y: 0.08, z: 1.05 },
  },
  ...ridgeFlank('l'),
  ...ridgeFlank('r'),
  {
    id: 'es-mouth',
    name: 'Mouth-bar set',
    rank: 'element-set',
    parentId: 'ec-mouth',
    kind: 'group',
    nested: { x: 0, y: 0.24, z: 1.05 },
  },
  ...MOUTH_BARS.map((point, index) => ({
    id: `e-mouth-${index}`,
    name: 'Mouth bar',
    rank: 'element' as const,
    parentId: 'es-mouth',
    kind: 'mouth-bar' as const,
    nested: { x: point.x, y: 0.28, z: point.z },
  })),
  {
    id: 'e-channel',
    name: 'Channel fill',
    rank: 'element',
    parentId: 'ec-mouth',
    kind: 'channel',
    nested: { x: 0, y: 0.18, z: -0.55 },
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
