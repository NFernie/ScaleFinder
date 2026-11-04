import type { SchematicSceneId } from './schematicScene'
import type { SceneBody } from './wfSchematic'

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
