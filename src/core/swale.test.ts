import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { GROUND_THICKNESS, sceneAt as wfSceneAt, waterlineY, type SceneBody } from './wfSchematic'
import { ridgeCrestWorld, swaleShape, swaleShapes, swaleWaterY } from './swale'

function restBodies(sceneAt: (explode: number) => { kind: string; nested: SceneBody['nested'] }[]): SceneBody[] {
  return sceneAt(0)
    .filter((body) => body.kind !== 'swale')
    .map((body) => ({ ...(body as SceneBody), nested: { ...body.nested } }))
}

function worldVertex(shape: ReturnType<typeof swaleShape>, index: number) {
  return {
    x: shape.origin.x + shape.positions[index * 3],
    y: shape.origin.y + shape.positions[index * 3 + 1],
    z: shape.origin.z + shape.positions[index * 3 + 2],
  }
}

describe('swale', () => {
  it('adds one wedge per gap on every beach-ridge set', () => {
    const wf = wfSceneAt(0).filter((body) => body.kind === 'swale')
    const asym = asymSceneAt(0).filter((body) => body.kind === 'swale')
    const tfw = tfwSceneAt(0).filter((body) => body.kind === 'swale')
    expect(wf.map((body) => body.id)).toEqual([
      'e-swale-l-0',
      'e-swale-l-1',
      'e-swale-l-2',
      'e-swale-l-3',
      'e-swale-r-0',
      'e-swale-r-1',
      'e-swale-r-2',
      'e-swale-r-3',
    ])
    expect(asym.map((body) => body.id)).toEqual(wf.map((body) => body.id))
    expect(new Set(wf.filter((body) => body.id.startsWith('e-swale-l-')).map((body) => body.parentId))).toEqual(
      new Set(['es-ridge-l']),
    )
    expect(tfw.map((body) => body.id)).toEqual([
      ...wf.map((body) => body.id),
      'e-swale-hl-0',
      'e-swale-hl-1',
      'e-swale-hl-2',
      'e-swale-hl-3',
    ])
    expect(tfw.find((body) => body.id === 'e-swale-hl-0')?.parentId).toBe('es-ridge-hl')
    expect(tfw.every((body) => body.name === 'Swale')).toBe(true)
  })

  it('follows both crest lines and stops on the water-slab top', () => {
    const bodies = wfSceneAt(0)
    const shape = swaleShape('wf', bodies, 'e-swale-r-1')
    const land = bodies.find((body) => body.id === 'e-ridge-r-1')!
    const sea = bodies.find((body) => body.id === 'e-ridge-r-2')!
    expect(shape.waterY).toBeCloseTo(waterlineY())
    expect(shape.landCrest).toHaveLength(24)
    shape.landCrest.forEach((point, index) => {
      const vertex = worldVertex(shape, index * 4)
      expect(vertex.x).toBeCloseTo(point.x, 5)
      expect(vertex.y).toBeCloseTo(point.y, 5)
      expect(vertex.z).toBeCloseTo(point.z, 5)
      expect(vertex.y).toBeGreaterThan(shape.waterY)
    })
    shape.seaCrest.forEach((point, index) => {
      const vertex = worldVertex(shape, index * 4 + 1)
      expect(vertex.x).toBeCloseTo(point.x, 5)
      expect(vertex.y).toBeCloseTo(point.y, 5)
      expect(vertex.z).toBeCloseTo(point.z, 5)
      const floor = worldVertex(shape, index * 4 + 3)
      expect(floor.x).toBeCloseTo(point.x, 5)
      expect(floor.y).toBeCloseTo(shape.waterY, 5)
      expect(floor.z).toBeCloseTo(point.z, 5)
    })
    const landLine = ridgeCrestWorld('wf', land, 'sea')
    const seaLine = ridgeCrestWorld('wf', sea, 'land')
    expect(shape.landCrest[0].z).toBeCloseTo(landLine[0].z, 5)
    expect(shape.seaCrest[0].z).toBeCloseTo(seaLine[0].z, 5)
    expect(shape.landCrest[0].y).toBeGreaterThan(shape.seaCrest[0].y)
  })

  it('uses the asymmetric crest on the asymmetric flank and the convex crest on Tfw', () => {
    const asym = asymSceneAt(0)
    const wf = wfSceneAt(0)
    const asymSwale = swaleShape('asym', asym, 'e-swale-l-2')
    const wfSwale = swaleShape('wf', wf, 'e-swale-l-2')
    const mid = Math.floor(asymSwale.landCrest.length / 3)
    expect(asymSwale.landCrest[mid].z).not.toBeCloseTo(wfSwale.landCrest[mid].z, 2)

    const tfw = tfwSceneAt(0)
    const convex = swaleShape('tfw', tfw, 'e-swale-l-0')
    const bow = convex.landCrest.reduce((best, point) => (point.z > best.z ? point : best))
    const end = convex.landCrest[0].z
    expect(bow.z).toBeGreaterThan(end + 0.4)
    const hl = swaleShape('tfw', tfw, 'e-swale-hl-0')
    const hlRidge = tfw.find((body) => body.id === 'e-ridge-hl-0')!
    expect(hl.landCrest[0].x).toBeCloseTo(ridgeCrestWorld('tfw', hlRidge, 'sea')[0].x, 4)
    expect(hl.landCrest[0].z).toBeCloseTo(ridgeCrestWorld('tfw', hlRidge, 'sea')[0].z, 4)
  })

  it('lifts the floor when the water slab rises', () => {
    const bodies = restBodies(wfSceneAt)
    const before = swaleShape('wf', bodies, 'e-swale-r-0')
    const lift = 0.05
    const ground = bodies.find((body) => body.id === 'ecs')!
    ground.nested = { ...ground.nested, y: ground.nested.y + lift }
    const after = swaleShapes('wf', bodies).find((shape) => shape.id === 'e-swale-r-0')!
    expect(swaleWaterY(bodies)).toBeCloseTo(before.waterY + lift)
    expect(after.waterY).toBeCloseTo(before.waterY + lift)
    expect(after.seaCrest[0].y).toBeCloseTo(before.seaCrest[0].y, 5)
    expect(after.seaCrest[0].y).toBeGreaterThan(after.waterY)
    const floor = worldVertex(after, 3)
    expect(floor.y).toBeCloseTo(after.waterY, 5)
    ground.nested = { ...ground.nested, y: ground.nested.y + 2 }
    const clamped = swaleShapes('wf', bodies).find((shape) => shape.id === 'e-swale-r-0')!
    expect(clamped.waterY).toBeGreaterThan(clamped.seaCrest[0].y)
    expect(worldVertex(clamped, 3).y).toBeCloseTo(clamped.seaCrest[0].y, 5)
    expect(GROUND_THICKNESS).toBeGreaterThan(0)
  })
})
