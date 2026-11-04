import type { SchematicSceneId } from './schematicScene'
import type { PlacedBody, SceneBody } from './wfSchematic'

export const S_EC = 3
export const H = 1.5
export const R_E_RIDGE_SET = 2.4
export const R_E_MOUTH_SET = 0.9

export type CenterOf = (body: SceneBody) => { x: number; y: number; z: number }

type Vec3 = { x: number; y: number; z: number }

export type BodyClassification = 'skip' | 'ecs' | 'standalone' | { ecKey: string; esIndex: number }

const STANDALONE_IDS = new Set(['e-channel', 'e-channel-l', 'e-channel-l-join', 'e-deltaplain'])

const MOUTH_ID_PATTERNS: ReadonlyArray<{ pattern: RegExp; ecKey: string }> = [
  { pattern: /^e-mouth-l-prox-(\d+)$/, ecKey: 'mouth-l-prox' },
  { pattern: /^e-mouth-l-dist-(\d+)$/, ecKey: 'mouth-l-dist' },
  { pattern: /^e-mouth-l-(\d+)$/, ecKey: 'mouth-l' },
  { pattern: /^e-mouth-prox-(\d+)$/, ecKey: 'mouth-prox' },
  { pattern: /^e-mouth-sea-(\d+)$/, ecKey: 'mouth-sea' },
  { pattern: /^e-mouth-dist-(\d+)$/, ecKey: 'mouth-dist' },
  { pattern: /^e-mouth-(\d+)$/, ecKey: 'mouth' },
]

function mouthClassification(id: string): { ecKey: string; esIndex: number } | null {
  for (const { pattern, ecKey } of MOUTH_ID_PATTERNS) {
    const match = id.match(pattern)
    if (match) {
      return { ecKey, esIndex: Math.floor(Number(match[1]) / 3) }
    }
  }
  return null
}

function ridgeFlankClassification(id: string): { ecKey: string; esIndex: number } | null {
  const ridge = id.match(/^e-ridge-(l|r|hl)-(\d+)$/)
  if (ridge) {
    return { ecKey: `ridge-${ridge[1]}`, esIndex: Number(ridge[2]) }
  }
  const swale = id.match(/^e-swale-(l|r|hl)-(\d+)$/)
  if (swale) {
    return { ecKey: `ridge-${swale[1]}`, esIndex: Number(swale[2]) + 1 }
  }
  const shale = id.match(/^e-shale-(l|r|hl)-(\d+)$/)
  if (shale) {
    return { ecKey: `ridge-${shale[1]}`, esIndex: Number(shale[2]) + 1 }
  }
  return null
}

export function classifyBody(body: SceneBody): BodyClassification {
  if (body.kind === 'group' || body.kind === 'ground') {
    return 'skip'
  }
  if (body.id === 'ecs') {
    return 'ecs'
  }
  if (STANDALONE_IDS.has(body.id)) {
    return 'standalone'
  }

  const ridge = ridgeFlankClassification(body.id)
  if (ridge) {
    return ridge
  }

  const mouth = mouthClassification(body.id)
  if (mouth) {
    return mouth
  }

  throw new Error(`Unclassified schematic body id "${body.id}" (kind ${body.kind})`)
}

export function assertAllBodiesClassified(bodies: readonly SceneBody[], scene: SchematicSceneId): void {
  for (const body of bodies) {
    try {
      classifyBody(body)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${message} in scene "${scene}"`)
    }
  }
}

export function countTaxonomy(
  bodies: readonly SceneBody[],
  scene: SchematicSceneId,
): { ec: number; es: number; e: number } {
  assertAllBodiesClassified(bodies, scene)

  const ecKeys = new Set<string>()
  const esKeys = new Set<string>()
  let e = 0

  for (const body of bodies) {
    const classification = classifyBody(body)
    if (classification === 'skip' || classification === 'ecs') {
      continue
    }
    e += 1
    if (classification === 'standalone') {
      continue
    }
    ecKeys.add(classification.ecKey)
    esKeys.add(`${classification.ecKey}\0${classification.esIndex}`)
  }

  return { ec: ecKeys.size, es: esKeys.size, e }
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

export function stageWeights(t: number): { u1: number; u2: number; u3: number } {
  const c = clamp01(t)
  return {
    u1: Math.min(1, Math.max(0, 3 * c)),
    u2: Math.min(1, Math.max(0, 3 * c - 1)),
    u3: Math.min(1, Math.max(0, 3 * c - 2)),
  }
}

function isRisenEs(ecKey: string, esIndex: number): boolean {
  return ecKey.startsWith('ridge') ? esIndex === 2 : esIndex === 1
}

function meanCenter(bodies: readonly SceneBody[], centerOf: CenterOf): Vec3 {
  const points = bodies.map(centerOf)
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p.x
    y += p.y
    z += p.z
  }
  const n = points.length
  return { x: x / n, y: y / n, z: z / n }
}

function circularMean(angles: readonly number[]): number {
  let sinSum = 0
  let cosSum = 0
  for (const a of angles) {
    sinSum += Math.sin(a)
    cosSum += Math.cos(a)
  }
  return Math.atan2(sinSum, cosSum)
}

const SEAWARD_BEARING = Math.PI / 2
const ZERO_XZ_EPS = 1e-9

function stage3Offsets(
  members: readonly SceneBody[],
  cs: Vec3,
  centerOf: CenterOf,
  rE: number,
  u3: number,
): Map<string, Vec3> {
  const offsets = new Map<string, Vec3>()
  if (u3 === 0 || members.length === 0) {
    for (const m of members) {
      offsets.set(m.id, { x: 0, y: 0, z: 0 })
    }
    return offsets
  }

  const n = members.length
  const sorted = [...members].sort((a, b) => {
    const ca = centerOf(a)
    const cb = centerOf(b)
    const ta = Math.atan2(ca.z - cs.z, ca.x - cs.x)
    const tb = Math.atan2(cb.z - cs.z, cb.x - cs.x)
    if (ta !== tb) {
      return ta - tb
    }
    return a.id.localeCompare(b.id)
  })

  const bearings = sorted.map((m) => {
    const c = centerOf(m)
    return Math.atan2(c.z - cs.z, c.x - cs.x)
  })

  const allZeroOffsets = sorted.every((m) => {
    const c = centerOf(m)
    return Math.hypot(c.x - cs.x, c.z - cs.z) < ZERO_XZ_EPS
  })

  const phi0 = allZeroOffsets
    ? SEAWARD_BEARING
    : circularMean(bearings.map((theta, k) => theta - (2 * Math.PI * k) / n))

  sorted.forEach((member, k) => {
    const phi = phi0 + (2 * Math.PI * k) / n
    const targetRelX = rE * Math.cos(phi)
    const targetRelZ = rE * Math.sin(phi)
    const ck = centerOf(member)
    const delta = {
      x: (targetRelX - (ck.x - cs.x)) * u3,
      y: 0,
      z: (targetRelZ - (ck.z - cs.z)) * u3,
    }
    offsets.set(member.id, delta)
  })

  return offsets
}

export function applyExplode(
  bodies: readonly SceneBody[],
  scene: SchematicSceneId,
  t: number,
  centerOf: CenterOf,
): PlacedBody[] {
  assertAllBodiesClassified(bodies, scene)
  const { u1, u2, u3 } = stageWeights(t)

  const ecsBody = bodies.find((b) => b.id === 'ecs')
  const pivot: Vec3 = ecsBody ? centerOf(ecsBody) : { x: 0, y: 0, z: 0 }

  const ecMembers = new Map<string, SceneBody[]>()
  const esMembers = new Map<string, SceneBody[]>()
  const standaloneIds = new Set<string>()

  for (const body of bodies) {
    const classification = classifyBody(body)
    if (classification === 'skip' || classification === 'ecs') {
      continue
    }
    if (classification === 'standalone') {
      standaloneIds.add(body.id)
      continue
    }
    const { ecKey, esIndex } = classification
    if (!ecMembers.has(ecKey)) {
      ecMembers.set(ecKey, [])
    }
    ecMembers.get(ecKey)!.push(body)
    const esKey = `${ecKey}\0${esIndex}`
    if (!esMembers.has(esKey)) {
      esMembers.set(esKey, [])
    }
    esMembers.get(esKey)!.push(body)
  }

  const ecCentres = new Map<string, Vec3>()
  for (const [ecKey, members] of ecMembers) {
    ecCentres.set(ecKey, meanCenter(members, centerOf))
  }

  const delta1ByEc = new Map<string, Vec3>()
  for (const [ecKey, c] of ecCentres) {
    delta1ByEc.set(ecKey, {
      x: (c.x - pivot.x) * (S_EC - 1) * u1,
      y: 0,
      z: (c.z - pivot.z) * (S_EC - 1) * u1,
    })
  }

  const delta1Standalone = new Map<string, Vec3>()
  for (const id of standaloneIds) {
    const body = bodies.find((b) => b.id === id)!
    const c = centerOf(body)
    delta1Standalone.set(id, {
      x: (c.x - pivot.x) * (S_EC - 1) * u1,
      y: 0,
      z: (c.z - pivot.z) * (S_EC - 1) * u1,
    })
  }

  const delta2ByMember = new Map<string, Vec3>()
  const delta3ByMember = new Map<string, Vec3>()

  for (const [esKey, members] of esMembers) {
    const [ecKey, esIndexStr] = esKey.split('\0')
    const esIndex = Number(esIndexStr)
    if (!isRisenEs(ecKey, esIndex)) {
      continue
    }
    for (const m of members) {
      delta2ByMember.set(m.id, { x: 0, y: H * u2, z: 0 })
    }
    const cs = meanCenter(members, centerOf)
    const rE = ecKey.startsWith('ridge') ? R_E_RIDGE_SET : R_E_MOUTH_SET
    const d3 = stage3Offsets(members, cs, centerOf, rE, u3)
    for (const [id, d] of d3) {
      delta3ByMember.set(id, d)
    }
  }

  const zero = { x: 0, y: 0, z: 0 }

  return bodies.map((body) => {
    const classification = classifyBody(body)
    if (classification === 'skip' || classification === 'ecs') {
      return {
        ...body,
        position: { ...body.nested },
        showLabel: false,
      }
    }

    let d1 = zero
    if (classification === 'standalone') {
      d1 = delta1Standalone.get(body.id) ?? zero
    } else {
      d1 = delta1ByEc.get(classification.ecKey) ?? zero
    }

    const d2 = delta2ByMember.get(body.id) ?? zero
    const d3 = delta3ByMember.get(body.id) ?? zero

    return {
      ...body,
      position: {
        x: body.nested.x + d1.x + d2.x + d3.x,
        y: body.nested.y + d1.y + d2.y + d3.y,
        z: body.nested.z + d1.z + d2.z + d3.z,
      },
      showLabel: false,
    }
  })
}
