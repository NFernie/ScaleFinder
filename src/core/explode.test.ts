import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { classifyBody, countTaxonomy } from './explode'
import { sceneAt as wfSceneAt, type PlacedBody, type SceneBody } from './wfSchematic'

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
