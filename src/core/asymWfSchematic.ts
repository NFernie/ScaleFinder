/**
 * Asymmetric Wf scene. Copied from `wfSchematic.ts`. Positions, yaw, and the
 * seaward dip stay with that scene. The left beach-ridge mesh is the asymmetric
 * loft; the right flank stays the symmetric loft. The map pin for this scene
 * stays at Sfântu Gheorghe.
 */
import { asymmetricBeachRidgeStations } from './asymmetricBeachRidgePlan'

export const ASYM_WF_ANCHOR = { lat: 44.878674, lng: 29.515563 } as const

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
  showLabel: boolean
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

/** Cross-axis centres in the fan template before alongshore compression. */
const MOUTH_FAN_INNER_X = 0.16

/**
 * Scale on fan X centres. The first pass increased alongshore overlap by 50%
 * (centre gap 0.32 → 0.23). The shipped scale doubles that overlap
 * (centre gap 0.32 → 0.14 for bar width 0.5).
 */
export const MOUTH_FAN_X_SCALE =
  (MOUTH_BAR_SCALE.x - 2 * (MOUTH_BAR_SCALE.x - 2 * MOUTH_FAN_INNER_X)) / (2 * MOUTH_FAN_INNER_X)

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

/**
 * Drop in Y per unit +Z from the landward mouth-bar rank to the seaward rank.
 * Each rank drops `MOUTH_BAR_SCALE.y * MOUTH_BAR_STEP`; the run is that fan's Z span.
 */
export function mouthBarSeawardSlope(): number {
  const levels = [...new Set(MOUTH_FAN.map((point) => point.z))].sort((a, b) => a - b)
  const drop = MOUTH_BAR_SCALE.y * MOUTH_BAR_STEP
  const span = levels[levels.length - 1] - levels[0]
  return ((levels.length - 1) * drop) / span
}

/** How far the ridge base (lowest Y) sits seaward of the crest before the face is flattened. */
export const RIDGE_BASE_SEAWARD = 0.12

/**
 * Seaward-face rise/run as a fraction of the unsheared wedge.
 * 0.25 is another halving of the previous 0.5 slope, so the whole section is 50% flatter again.
 */
export const RIDGE_FACE_SLOPE = 0.25

/**
 * Plan angle, in degrees, added at the channel end of the most seaward beach ridge.
 * Positive swings the alongshore tip landward so the channel stays the seaward apex.
 */
export const RIDGE_SEAWARD_ANGLE_DEG = 20

/**
 * Each ridge landward of the next keeps this fraction less plan angle.
 * 12% leaves a small positive centreline gap at the tips (about 0.07 on the
 * seaward pair) while the channel-end gap stays on RIDGE_Z_STEP.
 */
export const RIDGE_ANGLE_LANDWARD_DROP = 0.12

/** Thickness of the water-line slab. Its top is the channel base. */
export const GROUND_THICKNESS = 0.05

/** Diagram water line. Opacity is 30%. */
export const WATER_COLOUR = 0x38bdf8
export const WATER_OPACITY = 0.3

/**
 * At full explode, each body's centre is this many times farther from the origin.
 * The direction is the centre itself, so the largest coordinate does most of the travel
 * and the smaller ones keep the same proportion.
 */
export const EXPLODE_SPREAD = 5

function labelVisible(body: SceneBody, t: number): boolean {
  if (body.rank === 'element-complex-set') return true
  if (body.rank === 'element-complex') return t > 0
  if (body.rank === 'element-set') return t > 1 / 3
  return t > 2 / 3 && (body.id === 'e-ridge-r-0' || body.id === 'e-mouth-0' || body.id === 'e-channel')
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

/** Left flank of this scene uses the convex seaward bow. Right flank stays concave. */
export function asymLeftBeachRidge(bodyId: string): boolean {
  return bodyId.startsWith('e-ridge-') && !bodyId.includes('-r-')
}

function stationsForRidge(bodyId: string): RidgeStation[] {
  const side = bodyId.includes('-r-') ? 'r' : 'l'
  const index = ridgeIndex(bodyId)
  if (asymLeftBeachRidge(bodyId)) return asymmetricBeachRidgeStations(side, index)
  return beachRidgeStations(side, index)
}

/** Centre of the solid in the body's local frame, before the nested offset. */
function localCenter(body: SceneBody): { x: number; y: number; z: number } {
  if (body.kind === 'beach-ridge') {
    const stations = stationsForRidge(body.id)
    const sum = stations.reduce(
      (total, station) => ({
        x: total.x + station.x,
        y: total.y + station.height / 2,
        z: total.z + station.z,
      }),
      { x: 0, y: 0, z: 0 },
    )
    return { x: sum.x / stations.length, y: sum.y / stations.length, z: sum.z / stations.length }
  }
  if (body.kind === 'mouth-bar') return { x: 0, y: MOUTH_BAR_SCALE.y / 2, z: 0 }
  if (body.kind === 'channel') return { x: 0, y: -CHANNEL_RADIUS / 2, z: 0 }
  return { x: 0, y: 0, z: 0 }
}

/** Where the solid sits in the nested pose, measured from the origin. */
export function bodyCenter(body: SceneBody): { x: number; y: number; z: number } {
  const local = rotateYaw(localCenter(body), body.yaw ?? 0)
  return {
    x: body.nested.x + local.x,
    y: body.nested.y + local.y,
    z: body.nested.z + local.z,
  }
}

const RIDGE_COUNT = 5
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
/** Reference crest the seaward Y step is expressed against. */
const RIDGE_BASE_REF = 0.36

/**
 * Fraction of the reference crest between one beach ridge and the next seaward
 * ridge. The Y drop is the mouth-bar slope times the channel-end Z step.
 * The landward ridge stays at {@link RIDGE_NEST_Y}; each step seaward drops.
 */
export const RIDGE_DOWNSTEP = (mouthBarSeawardSlope() * RIDGE_Z_STEP) / RIDGE_BASE_REF

/** Base of the most seaward beach ridge. */
export function seawardRidgeBaseY(): number {
  return RIDGE_NEST_Y - (RIDGE_COUNT - 1) * RIDGE_BASE_REF * RIDGE_DOWNSTEP
}

/** How far the tip crest sits above the water line on the lowest ridge. */
const RIDGE_TIP_CLEARANCE = 0.03

/**
 * Plan-view centreline before the per-ridge landward angle.
 * A landward sweep from the channel, then a sigmoid so the tip turns slightly back toward the sea.
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
  const lowestBase = seawardRidgeBaseY()
  const water = CHANNEL_FLAT_Y - CHANNEL_RADIUS
  return {
    thick: CHANNEL_FLAT_Y - lowestBase,
    tip: water - lowestBase + RIDGE_TIP_CLEARANCE,
  }
}

/** Index from `e-ridge-r-2`. Groups and other ids fall back to the landward ridge. */
function ridgeIndex(id: string): number {
  const index = Number(id.slice(id.lastIndexOf('-') + 1))
  return Number.isFinite(index) ? index : 0
}

/**
 * Added plan angle for one ridge. Index 0 is the most landward.
 * The most seaward ridge is RIDGE_SEAWARD_ANGLE_DEG. Each step landward
 * multiplies by (1 - RIDGE_ANGLE_LANDWARD_DROP).
 */
export function beachRidgePlanAngleDeg(index: number): number {
  const stepsLandward = RIDGE_COUNT - 1 - index
  return RIDGE_SEAWARD_ANGLE_DEG * (1 - RIDGE_ANGLE_LANDWARD_DROP) ** stepsLandward
}

/**
 * One beach-ridge centreline in ridge-local coordinates.
 * X is alongshore, away from the channel. The channel end keeps the shared
 * fore-aft spacing. Toward the tip the ridge swings landward by
 * beachRidgePlanAngleDeg, so the stack closes up but the centrelines still
 * keep a small Z gap. The channel end stays the seaward apex.
 * Height tapers toward the tip, and the whole crest stays above the water line.
 */
export function beachRidgeStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const sign = side === 'r' ? 1 : -1
  const { thick, tip } = ridgeHeights()
  const landward = Math.tan((beachRidgePlanAngleDeg(index) * Math.PI) / 180)
  const span = RIDGE_OUTER - RIDGE_INNER
  const stations: RidgeStation[] = []
  for (let i = 0; i < RIDGE_STATIONS; i += 1) {
    const t = i / (RIDGE_STATIONS - 1)
    const taper = 1 - t
    stations.push({
      x: sign * (RIDGE_INNER + t * span),
      z: ridgeCentreZ(t) - landward * t * span,
      halfWidth: RIDGE_HALF_WIDTH * taper + RIDGE_TIP_WIDTH,
      height: tip + (thick - tip) * taper,
    })
  }
  return stations
}

/**
 * Cross-section at one station. The crest stays put. The base is sheared seaward
 * so the seaward-face slope is RIDGE_FACE_SLOPE times the unsheared wedge.
 * The face reflects a logistic sigmoid across the chord: seaward of the chord in the
 * upper half (convex toward the sea) and landward of it in the lower half, with the
 * toe running out flat.
 */
export function beachRidgeRing(station: RidgeStation): RidgeCorner[] {
  const crown = station.halfWidth * 0.28
  const crestSeaZ = station.z + crown
  const crestLandZ = station.z - crown
  const baseLand0 = station.z - station.halfWidth + RIDGE_BASE_SEAWARD
  const baseSea0 = station.z + station.halfWidth + RIDGE_BASE_SEAWARD
  const steepRun = baseSea0 - crestSeaZ
  const run = steepRun / RIDGE_FACE_SLOPE
  const shear = run - steepRun
  const baseLandZ = baseLand0 + shear
  const baseSeaZ = crestSeaZ + run
  const ring: RidgeCorner[] = [
    { x: station.x, y: 0, z: baseLandZ },
    { x: station.x, y: 0, z: baseSeaZ },
  ]
  const steps = 16
  for (let i = 1; i < steps; i += 1) {
    const down = 1 - i / steps
    ring.push({
      x: station.x,
      y: station.height * (1 - down),
      z: crestSeaZ + run * ridgeFaceFraction(down),
    })
  }
  ring.push(
    { x: station.x, y: station.height, z: crestSeaZ },
    { x: station.x, y: station.height, z: crestLandZ },
  )
  return ring
}

function ridgeWorldZ(index: number): number {
  return RIDGE_Z_BASE + index * RIDGE_Z_STEP + beachRidgeStations('r', index)[0].z
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

/** Logistic reflected across the chord. Steepness stays low enough that Z keeps increasing seaward. */
function ridgeFaceFraction(down: number): number {
  const k = 6
  const raw = (u: number) => 1 / (1 + Math.exp(-k * (u - 0.5)))
  const start = raw(0)
  const end = raw(1)
  const logistic = (raw(down) - start) / (end - start)
  return 2 * down - logistic
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

/**
 * Uniform Y offset for every mouth bar. The landward apex crown meets the channel centre.
 * Seaward steps and the offset between the two fans stay the same.
 */
export function mouthBarComplexLift(): number {
  const landwardBaseY = waterlineY() - mouthBarCrownY()
  const targetBaseY = channelSpan().flatY - CHANNEL_RADIUS / 2 - mouthBarCrownY()
  return targetBaseY - landwardBaseY
}

/** World Y of the channel half-cylinder centre (flat face at channelSpan().flatY). */
export function channelCenterY(): number {
  return channelSpan().flatY - CHANNEL_RADIUS / 2
}

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
      x: point.x * MOUTH_FAN_X_SCALE,
      y: yLand - seaward * step,
      z: originZ + point.z,
      yaw: (degrees * Math.PI) / 180,
    }
  })
}

function mouthFans(): { seaward: ReturnType<typeof layMouthFan>; proximal: ReturnType<typeof layMouthFan> } {
  const span = channelSpan()
  const halfZ = MOUTH_BAR_SCALE.z / 2
  const lift = mouthBarComplexLift()
  return {
    seaward: layMouthFan(span.zSea - 0.12 + halfZ, seawardRidgeBaseY() + lift),
    // Landward rim on the channel where the most landward ridge meets it, then progrades seaward.
    proximal: layMouthFan(ridgeWorldZ(0) + halfZ, waterlineY() - mouthBarCrownY() + lift),
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
      nested: { x: sign * 1.7, y: 0.5, z: RIDGE_Z_BASE + ((RIDGE_COUNT - 1) / 2) * RIDGE_Z_STEP + RIDGE_BOW * 0.45 },
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
  const spread = 1 + (EXPLODE_SPREAD - 1) * t
  return BODIES.map((body) => {
    if (spread === 1) return { ...body, position: body.nested, showLabel: labelVisible(body, t) }
    const local = rotateYaw(localCenter(body), body.yaw ?? 0)
    const center = bodyCenter(body)
    return {
      ...body,
      position: {
        x: center.x * spread - local.x,
        y: center.y * spread - local.y,
        z: center.z * spread - local.z,
      },
      showLabel: labelVisible(body, t),
    }
  })
}
