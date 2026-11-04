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
  if (body.id === 'ecs') {
    return 'ecs'
  }
  if (body.kind === 'group' || body.kind === 'ground') {
    return 'skip'
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

/** EC scan order for element-kind representatives (spec §6). */
const EC_SCAN_ORDER: readonly string[] = [
  'ridge-r',
  'ridge-l',
  'ridge-hl',
  'mouth',
  'mouth-prox',
  'mouth-sea',
  'mouth-dist',
  'mouth-l',
  'mouth-l-prox',
  'mouth-l-dist',
]

const E_KIND_SCAN_ORDER: readonly SolidKind[] = ['beach-ridge', 'swale', 'shale', 'mouth-bar']

type SolidKind = SceneBody['kind']

function ecKeysInScanOrder(ecKeys: Iterable<string>): string[] {
  const present = new Set(ecKeys)
  return EC_SCAN_ORDER.filter((key) => present.has(key))
}

function ecDisplayName(scene: SchematicSceneId, ecKey: string): string {
  const wfAsym: Record<string, string> = {
    'ridge-l': 'Beach-ridge complex, left',
    'ridge-r': 'Beach-ridge complex, right',
    'mouth-prox': 'Mouth-bar complex, proximal',
    mouth: 'Mouth-bar complex, seaward',
    'mouth-sea': 'Mouth-bar complex, seaward',
    'mouth-dist': 'Mouth-bar complex, distal',
  }
  const tfw: Record<string, string> = {
    'ridge-l': 'Beach-ridge complex, left',
    'ridge-r': 'Beach-ridge complex, right',
    'ridge-hl': 'Beach-ridge complex, half channel',
    'mouth-prox': 'Mouth-bar complex, tidal proximal',
    mouth: 'Mouth-bar complex, tidal seaward',
    'mouth-sea': 'Mouth-bar complex, tidal mid',
    'mouth-l-prox': 'Mouth-bar complex, half-channel proximal',
    'mouth-l': 'Mouth-bar complex, half-channel seaward',
    'mouth-l-dist': 'Mouth-bar complex, half-channel distal',
  }
  const table = scene === 'tfw' ? tfw : wfAsym
  const name = table[ecKey]
  if (!name) {
    throw new Error(`No EC display name for "${ecKey}" in scene "${scene}"`)
  }
  return name
}

function esDisplayName(ecKey: string): string {
  return ecKey.startsWith('ridge') ? 'Beach-ridge set' : 'Mouth-bar set'
}

function showEcsLabel(t: number): boolean {
  return clamp01(t) >= 0
}

function showEcTaxonomyLabel(t: number): boolean {
  return clamp01(t) > 0
}

function showEsTaxonomyLabel(t: number): boolean {
  return clamp01(t) > 1 / 3
}

function showElementLabel(t: number): boolean {
  return clamp01(t) > 2 / 3
}

function findElementRepresentatives(
  ecMembers: Map<string, SceneBody[]>,
  esMembers: Map<string, SceneBody[]>,
): Set<string> {
  const representatives = new Set<string>()
  const kindsFound = new Set<SolidKind>()

  for (const ecKey of EC_SCAN_ORDER) {
    if (!ecMembers.has(ecKey)) {
      continue
    }
    const esIndex = ecKey.startsWith('ridge') ? 2 : 1
    const esKey = `${ecKey}\0${esIndex}`
    const members = esMembers.get(esKey)
    if (!members) {
      continue
    }
    const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id))
    for (const member of sorted) {
      if (!E_KIND_SCAN_ORDER.includes(member.kind as (typeof E_KIND_SCAN_ORDER)[number])) {
        continue
      }
      if (kindsFound.has(member.kind)) {
        continue
      }
      kindsFound.add(member.kind)
      representatives.add(member.id)
    }
  }

  return representatives
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

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
  const c = clamp01(t)
  const elementRepresentatives = findElementRepresentatives(ecMembers, esMembers)
  const orderedEcKeys = ecKeysInScanOrder(ecMembers.keys())

  const esCentres = new Map<string, Vec3>()
  for (const [esKey, members] of esMembers) {
    esCentres.set(esKey, meanCenter(members, centerOf))
  }

  const placedSolids: PlacedBody[] = bodies.map((body) => {
    const classification = classifyBody(body)
    if (classification === 'skip') {
      return {
        ...body,
        position: { ...body.nested },
        showLabel: false,
      }
    }
    if (classification === 'ecs') {
      return {
        ...body,
        position: { ...body.nested },
        showLabel: showEcsLabel(c),
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

    let showLabel = false
    if (classification === 'standalone') {
      showLabel = showElementLabel(c)
    } else if (typeof classification === 'object') {
      showLabel = showElementLabel(c) && elementRepresentatives.has(body.id)
    }

    return {
      ...body,
      position: {
        x: body.nested.x + d1.x + d2.x + d3.x,
        y: body.nested.y + d1.y + d2.y + d3.y,
        z: body.nested.z + d1.z + d2.z + d3.z,
      },
      showLabel,
    }
  })

  const taxonomyLabels: PlacedBody[] = []

  for (const ecKey of orderedEcKeys) {
    const centre = ecCentres.get(ecKey)!
    const d1 = delta1ByEc.get(ecKey) ?? zero
    taxonomyLabels.push({
      id: `tax-label-ec-${ecKey}`,
      name: ecDisplayName(scene, ecKey),
      rank: 'element-complex',
      parentId: 'ecs',
      kind: 'group',
      nested: { ...centre },
      taxonomyLabelOnly: true,
      position: addVec(centre, d1),
      showLabel: showEcTaxonomyLabel(c),
    })
  }

  for (const ecKey of orderedEcKeys) {
    const esIndex = ecKey.startsWith('ridge') ? 2 : 1
    const esKey = `${ecKey}\0${esIndex}`
    const centre = esCentres.get(esKey)
    if (!centre) {
      continue
    }
    const d1 = delta1ByEc.get(ecKey) ?? zero
    const d2 = { x: 0, y: H * u2, z: 0 }
    taxonomyLabels.push({
      id: `tax-label-es-${ecKey}-${esIndex}`,
      name: esDisplayName(ecKey),
      rank: 'element-set',
      parentId: 'ecs',
      kind: 'group',
      nested: { ...centre },
      taxonomyLabelOnly: true,
      position: addVec(addVec(centre, d1), d2),
      showLabel: showEsTaxonomyLabel(c),
    })
  }

  return [...placedSolids, ...taxonomyLabels]
}
