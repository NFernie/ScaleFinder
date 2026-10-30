import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { sceneAt as wfSceneAt, type SceneBody } from './wfSchematic'
import { pointInsideRidge, SWALE_ALONG, SWALE_FACE, swaleShape } from './swale'

function worldVertex(shape: ReturnType<typeof swaleShape>, index: number) {
  return {
    x: shape.origin.x + shape.positions[index * 3],
    y: shape.origin.y + shape.positions[index * 3 + 1],
    z: shape.origin.z + shape.positions[index * 3 + 2],
  }
}

function topAngleDeg(land: { y: number; z: number }, sea: { y: number; z: number }) {
  return (Math.atan2(land.y - sea.y, sea.z - land.z) * 180) / Math.PI
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

  it('joins the facing crests on a slight seaward step and stops where the faces meet', () => {
    const bodies = wfSceneAt(0)
    const shape = swaleShape('wf', bodies, 'e-swale-r-1')
    expect(shape.landCrest).toHaveLength(SWALE_ALONG)
    expect(shape.seaCrest).toHaveLength(SWALE_ALONG)
    const channel = topAngleDeg(shape.landCrest[0], shape.seaCrest[0])
    const tip = topAngleDeg(shape.landCrest[SWALE_ALONG - 1], shape.seaCrest[SWALE_ALONG - 1])
    expect(channel).toBeGreaterThan(2)
    expect(channel).toBeLessThan(3)
    expect(tip).toBeGreaterThan(channel)
    expect(tip).toBeLessThan(5)
    expect(shape.seaCrest[0].y).toBeLessThan(shape.landCrest[0].y)
    expect(shape.seaCrest[0].z).toBeGreaterThan(shape.landCrest[0].z)

    const ring = SWALE_FACE * 2
    const crest = worldVertex(shape, 0)
    const foot = worldVertex(shape, SWALE_FACE - 1)
    expect(Math.hypot(crest.x - shape.landCrest[0].x, crest.y - shape.landCrest[0].y, crest.z - shape.landCrest[0].z)).toBeLessThan(
      0.01,
    )
    expect(foot.y).toBeLessThan(crest.y - 0.1)
    expect(foot.z).toBeGreaterThan(crest.z)
    const seaCrest = worldVertex(shape, ring - 1)
    expect(seaCrest.z).toBeGreaterThan(crest.z)
    expect(seaCrest.y).toBeLessThan(crest.y)
  })

  it('stays out of both neighbouring beach ridges', () => {
    const checks: Array<{ scene: 'wf' | 'asym' | 'tfw'; bodies: SceneBody[]; swale: string; land: string; sea: string }> = [
      { scene: 'wf', bodies: wfSceneAt(0), swale: 'e-swale-r-0', land: 'e-ridge-r-0', sea: 'e-ridge-r-1' },
      { scene: 'wf', bodies: wfSceneAt(0), swale: 'e-swale-l-3', land: 'e-ridge-l-3', sea: 'e-ridge-l-4' },
      { scene: 'asym', bodies: asymSceneAt(0), swale: 'e-swale-l-2', land: 'e-ridge-l-2', sea: 'e-ridge-l-3' },
      { scene: 'tfw', bodies: tfwSceneAt(0), swale: 'e-swale-l-0', land: 'e-ridge-l-0', sea: 'e-ridge-l-1' },
      { scene: 'tfw', bodies: tfwSceneAt(0), swale: 'e-swale-hl-1', land: 'e-ridge-hl-1', sea: 'e-ridge-hl-2' },
    ]
    for (const check of checks) {
      const shape = swaleShape(check.scene, check.bodies, check.swale)
      const land = check.bodies.find((body) => body.id === check.land)!
      const sea = check.bodies.find((body) => body.id === check.sea)!
      const count = shape.positions.length / 3
      for (let i = 0; i < count; i += 1) {
        const point = worldVertex(shape, i)
        if (pointInsideRidge(check.scene, land, point) || pointInsideRidge(check.scene, sea, point)) {
          throw new Error(`${check.swale} vertex ${i} ${JSON.stringify(point)} land=${pointInsideRidge(check.scene, land, point)} sea=${pointInsideRidge(check.scene, sea, point)}`)
        }
      }
    }
  })

  it('uses the asymmetric crest on the asymmetric flank and the convex crest on Tfw', () => {
    const asym = asymSceneAt(0)
    const wf = wfSceneAt(0)
    const asymSwale = swaleShape('asym', asym, 'e-swale-l-2')
    const wfSwale = swaleShape('wf', wf, 'e-swale-l-2')
    const mid = Math.floor(SWALE_ALONG / 3)
    expect(asymSwale.landCrest[mid].z).not.toBeCloseTo(wfSwale.landCrest[mid].z, 2)

    const tfw = tfwSceneAt(0)
    const convex = swaleShape('tfw', tfw, 'e-swale-l-0')
    const bow = convex.landCrest.reduce((best, point) => (point.z > best.z ? point : best))
    expect(bow.z).toBeGreaterThan(convex.landCrest[0].z + 0.4)
    const hl = swaleShape('tfw', tfw, 'e-swale-hl-0')
    const hlRidge = tfw.find((body) => body.id === 'e-ridge-hl-0')!
    const yaw = hlRidge.yaw ?? 0
    const crest = hl.landCrest[0]
    const along =
      (crest.x - hlRidge.nested.x) * Math.sin(yaw) + (crest.z - hlRidge.nested.z) * Math.cos(yaw)
    expect(along).not.toBe(0)
    expect(hl.seaCrest[0].y).toBeLessThan(hl.landCrest[0].y)
  })
})
