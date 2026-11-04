import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import {
  applyExplode,
  classifyBody,
  countTaxonomy,
  H,
  R_E_MOUTH_SET,
  R_E_RIDGE_SET,
  S_EC,
  stageWeights,
} from './explode'
import { bodyCenter, sceneAt as wfSceneAt, type PlacedBody, type SceneBody } from './wfSchematic'

type Vec3 = { x: number; y: number; z: number }

function centroid(points: Vec3[]): Vec3 {
  const n = points.length
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p.x
    y += p.y
    z += p.z
  }
  return { x: x / n, y: y / n, z: z / n }
}

function xzDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function restWf(): SceneBody[] {
  return wfSceneAt(0).map(({ position: _p, showLabel: _s, ...body }) => body)
}

function isRisenEs(ecKey: string, esIndex: number): boolean {
  return ecKey.startsWith('ridge') ? esIndex === 2 : esIndex === 1
}

function ecKeyOf(body: SceneBody): string | null {
  const c = classifyBody(body)
  if (typeof c === 'object' && 'ecKey' in c) {
    return c.ecKey
  }
  return null
}

function esIndexOf(body: SceneBody): number | null {
  const c = classifyBody(body)
  if (typeof c === 'object' && 'esIndex' in c) {
    return c.esIndex
  }
  return null
}

function placedCenter(body: SceneBody, position: Vec3): Vec3 {
  const rest = bodyCenter(body)
  return {
    x: position.x + (rest.x - body.nested.x),
    y: position.y + (rest.y - body.nested.y),
    z: position.z + (rest.z - body.nested.z),
  }
}

function restBodiesFor(scene: 'wf' | 'asym' | 'tfw'): SceneBody[] {
  const placed: PlacedBody[] =
    scene === 'wf' ? wfSceneAt(0) : scene === 'asym' ? asymSceneAt(0) : tfwSceneAt(0)
  return placed.map(({ position: _p, showLabel: _s, ...body }) => body)
}

describe('explode classification', () => {
  it('classifies every wf body or marks skip', () => {
    expect(countTaxonomy(restBodiesFor('wf'), 'wf')).toEqual({ ec: 5, es: 19, e: 54 })
  })

  it('classifies every asym body', () => {
    expect(countTaxonomy(restBodiesFor('asym'), 'asym')).toEqual({ ec: 5, es: 19, e: 54 })
  })

  it('classifies every tfw body', () => {
    expect(countTaxonomy(restBodiesFor('tfw'), 'tfw')).toEqual({ ec: 9, es: 33, e: 97 })
  })

  it('maps ridge and mouth ids', () => {
    expect(
      classifyBody({
        id: 'e-ridge-l-2',
        kind: 'beach-ridge',
        rank: 'element',
        parentId: 'x',
        name: 'x',
        nested: { x: 0, y: 0, z: 0 },
      }),
    ).toEqual({
      ecKey: 'ridge-l',
      esIndex: 2,
    })
    expect(
      classifyBody({
        id: 'e-mouth-4',
        kind: 'mouth-bar',
        rank: 'element',
        parentId: 'x',
        name: 'x',
        nested: { x: 0, y: 0, z: 0 },
      }),
    ).toEqual({
      ecKey: 'mouth',
      esIndex: 1,
    })
    expect(
      classifyBody({
        id: 'e-channel',
        kind: 'channel',
        rank: 'element',
        parentId: 'x',
        name: 'x',
        nested: { x: 0, y: 0, z: 0 },
      }),
    ).toBe('standalone')
    expect(
      classifyBody({
        id: 'ec-lobe',
        kind: 'group',
        rank: 'element-complex',
        parentId: 'ecs',
        name: 'x',
        nested: { x: 0, y: 0, z: 0 },
      }),
    ).toBe('skip')
  })
})

describe('stageWeights', () => {
  it('splits the slider into three equal stages', () => {
    expect(stageWeights(0)).toEqual({ u1: 0, u2: 0, u3: 0 })
    expect(stageWeights(1 / 3)).toEqual({ u1: 1, u2: 0, u3: 0 })
    expect(stageWeights(2 / 3)).toEqual({ u1: 1, u2: 1, u3: 0 })
    expect(stageWeights(1)).toEqual({ u1: 1, u2: 1, u3: 1 })
  })
})

describe('explode stages', () => {
  it('returns nested at t=0', () => {
    const rest = restWf()
    const placed = applyExplode(rest, 'wf', 0, bodyCenter)
    for (const body of placed) {
      if (body.taxonomyLabelOnly) continue
      expect(body.position).toEqual(body.nested)
      if (body.id === 'ecs') {
        expect(body.showLabel).toBe(true)
      } else {
        expect(body.showLabel).toBe(false)
      }
    }
  })

  it('scales EC centres in XZ at t=1/3', () => {
    const rest = restWf()
    const pivot = bodyCenter(rest.find((b) => b.id === 'ecs')!)
    const atThird = applyExplode(rest, 'wf', 1 / 3, bodyCenter)
    const ecKey = 'mouth-dist'
    const members = rest.filter((b) => ecKeyOf(b) === ecKey)
    const restC = centroid(members.map(bodyCenter))
    const placedC = centroid(members.map((b) => atThird.find((p) => p.id === b.id)!.position))
    const restDist = xzDist(restC, pivot)
    const placedDist = xzDist(placedC, pivot)
    expect(placedDist).toBeCloseTo(S_EC * restDist, 4)
  })

  it('rises only the risen element set at t=2/3', () => {
    const rest = restWf()
    const atThird = applyExplode(rest, 'wf', 1 / 3, bodyCenter)
    const atTwoThirds = applyExplode(rest, 'wf', 2 / 3, bodyCenter)

    for (const body of rest) {
      const c = classifyBody(body)
      if (c === 'skip' || c === 'ecs') continue
      const placed = atTwoThirds.find((p) => p.id === body.id)!
      const prev = atThird.find((p) => p.id === body.id)!
      if (typeof c === 'object') {
        if (isRisenEs(c.ecKey, c.esIndex)) {
          expect(placed.position.y).toBeCloseTo(body.nested.y + H, 5)
        } else {
          expect(placed.position).toEqual(prev.position)
        }
      } else {
        expect(placed.position).toEqual(prev.position)
      }
    }
  })

  it('places risen set elements on a ring at t=1', () => {
    const rest = restWf()
    const atFull = applyExplode(rest, 'wf', 1, bodyCenter)
    const ecKey = 'ridge-r'
    const esIndex = 2
    const members = rest.filter(
      (b) => ecKeyOf(b) === ecKey && esIndexOf(b) === esIndex,
    )
    const placedCenters = members.map((b) => {
      const placed = atFull.find((p) => p.id === b.id)!
      return placedCenter(b, placed.position)
    })
    const cs = centroid(placedCenters)
    const rExpected = R_E_RIDGE_SET
    for (const center of placedCenters) {
      expect(xzDist(center, cs)).toBeCloseTo(rExpected, 3)
    }
  })

  it('uses mouth-bar ring radius for fan risen sets at t=1', () => {
    const rest = restWf()
    const atFull = applyExplode(rest, 'wf', 1, bodyCenter)
    const members = rest.filter((b) => ecKeyOf(b) === 'mouth' && esIndexOf(b) === 1)
    const placedCenters = members.map((b) => {
      const placed = atFull.find((p) => p.id === b.id)!
      return placedCenter(b, placed.position)
    })
    const cs = centroid(placedCenters)
    for (const center of placedCenters) {
      expect(xzDist(center, cs)).toBeCloseTo(R_E_MOUTH_SET, 3)
    }
  })

  it('keeps Y unchanged during stage 1 and stage 3', () => {
    const rest = restWf()
    const atThird = applyExplode(rest, 'wf', 1 / 3, bodyCenter)
    const atTwoThirds = applyExplode(rest, 'wf', 2 / 3, bodyCenter)
    const atFull = applyExplode(rest, 'wf', 1, bodyCenter)

    for (const body of rest) {
      const c = classifyBody(body)
      if (c === 'skip') continue
      const nestedY = body.nested.y
      expect(atThird.find((p) => p.id === body.id)!.position.y).toBeCloseTo(nestedY, 5)

      if (typeof c === 'object' && isRisenEs(c.ecKey, c.esIndex)) {
        const yRisen = atTwoThirds.find((p) => p.id === body.id)!.position.y
        expect(atFull.find((p) => p.id === body.id)!.position.y).toBeCloseTo(yRisen, 5)
      }
    }
  })

  it('is linear within each stage for a sample EC member', () => {
    const rest = restWf()
    const id = 'e-mouth-dist-0'
    const atSixth = applyExplode(rest, 'wf', 1 / 6, bodyCenter)
    const atThird = applyExplode(rest, 'wf', 1 / 3, bodyCenter)
    const body = rest.find((b) => b.id === id)!
    const p6 = atSixth.find((p) => p.id === id)!.position
    const p3 = atThird.find((p) => p.id === id)!.position
    expect(p6.x - body.nested.x).toBeCloseTo((p3.x - body.nested.x) / 2, 5)
    expect(p6.z - body.nested.z).toBeCloseTo((p3.z - body.nested.z) / 2, 5)

    const atHalf = applyExplode(rest, 'wf', 0.5, bodyCenter)
    const atTwoThirds = applyExplode(rest, 'wf', 2 / 3, bodyCenter)
    const ridgeBody = rest.find((b) => b.id === 'e-ridge-r-2')!
    const yHalf = atHalf.find((p) => p.id === 'e-ridge-r-2')!.position.y
    const yTwoThirds = atTwoThirds.find((p) => p.id === 'e-ridge-r-2')!.position.y
    expect(yHalf - ridgeBody.nested.y).toBeCloseTo((yTwoThirds - ridgeBody.nested.y) / 2, 5)

    const atFiveSixths = applyExplode(rest, 'wf', 5 / 6, bodyCenter)
    const atFull = applyExplode(rest, 'wf', 1, bodyCenter)
    const ringMember = 'e-ridge-r-2'
    const p23 = atTwoThirds.find((p) => p.id === ringMember)!.position
    const p56 = atFiveSixths.find((p) => p.id === ringMember)!.position
    const p1 = atFull.find((p) => p.id === ringMember)!.position
    expect(p56.x - p23.x).toBeCloseTo((p1.x - p23.x) / 2, 5)
    expect(p56.z - p23.z).toBeCloseTo((p1.z - p23.z) / 2, 5)
    expect(p56.y).toBeCloseTo(p1.y, 5)
  })
})

describe('explode taxonomy labels', () => {
  it('shows taxonomy labels at thresholds on wf', () => {
    const rest = restWf()
    const at0 = applyExplode(rest, 'wf', 0, bodyCenter)
    expect(at0.filter((b) => b.showLabel && !b.taxonomyLabelOnly).map((b) => b.id)).toEqual(['ecs'])
    const above0 = applyExplode(rest, 'wf', 0.01, bodyCenter)
    expect(above0.filter((b) => b.showLabel && b.taxonomyLabelOnly && b.rank === 'element-complex')).toHaveLength(5)
    const aboveThird = applyExplode(rest, 'wf', 1 / 3 + 0.01, bodyCenter)
    expect(aboveThird.filter((b) => b.showLabel && b.taxonomyLabelOnly && b.rank === 'element-set')).toHaveLength(5)
  })

  it('shows element representatives and standalone labels above 2/3 on wf', () => {
    const rest = restWf()
    const aboveTwoThirds = applyExplode(rest, 'wf', 2 / 3 + 0.01, bodyCenter)
    const elementLabels = aboveTwoThirds.filter(
      (b) => b.showLabel && b.rank === 'element' && !b.taxonomyLabelOnly,
    )
    expect(elementLabels.length).toBeGreaterThanOrEqual(4)
    expect(elementLabels.some((b) => b.id === 'e-channel')).toBe(true)
    const kinds = new Set(elementLabels.map((b) => b.kind))
    expect(kinds.has('beach-ridge')).toBe(true)
    expect(kinds.has('mouth-bar')).toBe(true)
  })

  it('returns the same body ids for every explode value', () => {
    const rest = restWf()
    const samples = [0, 0.01, 1 / 3, 1 / 3 + 0.01, 2 / 3, 2 / 3 + 0.01, 1]
    const idSets = samples.map((t) =>
      applyExplode(rest, 'wf', t, bodyCenter)
        .map((b) => b.id)
        .sort(),
    )
    for (let i = 1; i < idSets.length; i++) {
      expect(idSets[i]).toEqual(idSets[0])
    }
    expect(idSets[0].some((id) => id.startsWith('tax-label-ec-'))).toBe(true)
    expect(idSets[0].some((id) => id.startsWith('tax-label-es-'))).toBe(true)
  })

  it('keeps scene-graph groups at nested pose with labels off', () => {
    const rest = restWf()
    const atFull = applyExplode(rest, 'wf', 1, bodyCenter)
    for (const id of ['ec-lobe', 'ec-mouth', 'es-ridge-r']) {
      const body = atFull.find((b) => b.id === id)!
      expect(body.position).toEqual(body.nested)
      expect(body.showLabel).toBe(false)
    }
  })

  it('emits nine EC taxonomy labels on tfw above zero', () => {
    const rest = restBodiesFor('tfw')
    const above0 = applyExplode(rest, 'tfw', 0.01, bodyCenter)
    expect(above0.filter((b) => b.showLabel && b.taxonomyLabelOnly && b.rank === 'element-complex')).toHaveLength(9)
  })
})
