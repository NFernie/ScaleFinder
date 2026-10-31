import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { SHALE_COLOUR, shaleShape } from './shale'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { pointInsideRidge, swaleFloorY, swaleShape } from './swale'
import { sceneAt as wfSceneAt, type SceneBody } from './wfSchematic'

function worldVertex(shape: { origin: { x: number; y: number; z: number }; positions: number[] }, index: number) {
  return {
    x: shape.origin.x + shape.positions[index * 3],
    y: shape.origin.y + shape.positions[index * 3 + 1],
    z: shape.origin.z + shape.positions[index * 3 + 2],
  }
}

function span(top: { y: number }, foot: { y: number }) {
  return top.y - foot.y
}

describe('shale', () => {
  it('adds one wedge per gap on every beach-ridge set', () => {
    const wf = wfSceneAt(0).filter((body) => body.kind === 'shale')
    const asym = asymSceneAt(0).filter((body) => body.kind === 'shale')
    const tfw = tfwSceneAt(0).filter((body) => body.kind === 'shale')
    expect(wf.map((body) => body.id)).toEqual([
      'e-shale-l-0',
      'e-shale-l-1',
      'e-shale-l-2',
      'e-shale-l-3',
      'e-shale-r-0',
      'e-shale-r-1',
      'e-shale-r-2',
      'e-shale-r-3',
    ])
    expect(asym.map((body) => body.id)).toEqual(wf.map((body) => body.id))
    expect(new Set(wf.filter((body) => body.id.startsWith('e-shale-l-')).map((body) => body.parentId))).toEqual(
      new Set(['es-ridge-l']),
    )
    expect(tfw.map((body) => body.id)).toEqual([
      ...wf.map((body) => body.id),
      'e-shale-hl-0',
      'e-shale-hl-1',
      'e-shale-hl-2',
      'e-shale-hl-3',
    ])
    expect(tfw.find((body) => body.id === 'e-shale-hl-0')?.parentId).toBe('es-ridge-hl')
    expect(tfw.every((body) => body.name === 'Shale')).toBe(true)
    expect(SHALE_COLOUR).toBe(0x78716c)
  })

  it('is thin beside the channel and thick at the tip, under the swale', () => {
    const bodies = wfSceneAt(0)
    const shape = shaleShape('wf', bodies, 'e-shale-r-0')
    const floor = swaleFloorY(bodies)
    expect(shape.topLand.length).toBe(shape.footLand.length)
    expect(shape.topLand.length).toBeGreaterThan(2)
    const proximal = span(shape.topLand[0], shape.footLand[0])
    const distal = span(shape.topLand[shape.topLand.length - 1], shape.footLand[shape.footLand.length - 1])
    expect(proximal).toBeLessThan(0.2)
    expect(distal).toBeGreaterThan(proximal + 0.2)
    expect(shape.footLand[0].y).toBeGreaterThan(0)
    expect(shape.footLand[shape.footLand.length - 1].y).toBeLessThan(0)
    const count = shape.positions.length / 3
    let highest = -Infinity
    let lowest = Infinity
    for (let i = 0; i < count; i += 1) {
      const y = worldVertex(shape, i).y
      highest = Math.max(highest, y)
      lowest = Math.min(lowest, y)
    }
    expect(highest).toBeLessThan(floor)
    expect(lowest).toBeLessThan(floor - 0.2)
    const swale = swaleShape('wf', bodies, 'e-swale-r-0')
    expect(shape.topLand[shape.topLand.length - 1].y).toBeLessThan(swale.origin.y)
    expect(shape.topSea[shape.topSea.length - 1].z).toBeGreaterThan(shape.topLand[shape.topLand.length - 1].z)
  })

  it('stays out of both neighbouring beach ridges', () => {
    const checks: Array<{ scene: 'wf' | 'asym' | 'tfw'; bodies: SceneBody[]; shale: string; land: string; sea: string }> = [
      { scene: 'wf', bodies: wfSceneAt(0), shale: 'e-shale-r-0', land: 'e-ridge-r-0', sea: 'e-ridge-r-1' },
      { scene: 'wf', bodies: wfSceneAt(0), shale: 'e-shale-l-3', land: 'e-ridge-l-3', sea: 'e-ridge-l-4' },
      { scene: 'asym', bodies: asymSceneAt(0), shale: 'e-shale-l-2', land: 'e-ridge-l-2', sea: 'e-ridge-l-3' },
      { scene: 'tfw', bodies: tfwSceneAt(0), shale: 'e-shale-l-0', land: 'e-ridge-l-0', sea: 'e-ridge-l-1' },
      { scene: 'tfw', bodies: tfwSceneAt(0), shale: 'e-shale-hl-1', land: 'e-ridge-hl-1', sea: 'e-ridge-hl-2' },
    ]
    for (const check of checks) {
      const shape = shaleShape(check.scene, check.bodies, check.shale)
      const land = check.bodies.find((body) => body.id === check.land)!
      const sea = check.bodies.find((body) => body.id === check.sea)!
      const floor = swaleFloorY(check.bodies)
      const count = shape.positions.length / 3
      const samples: Array<{ label: string; point: { x: number; y: number; z: number } }> = []
      for (let i = 0; i < count; i += 1) samples.push({ label: `vertex ${i}`, point: worldVertex(shape, i) })
      for (let t = 0; t < shape.indices.length; t += 3) {
        const tri = [0, 1, 2].map((offset) => worldVertex(shape, shape.indices[t + offset]))
        const mid = (a: (typeof tri)[number], b: (typeof tri)[number]) => ({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          z: (a.z + b.z) / 2,
        })
        samples.push({ label: `edge ${t}`, point: mid(tri[0], tri[1]) })
        samples.push({ label: `edge ${t + 1}`, point: mid(tri[1], tri[2]) })
        samples.push({ label: `edge ${t + 2}`, point: mid(tri[2], tri[0]) })
        samples.push({
          label: `centroid ${t}`,
          point: {
            x: (tri[0].x + tri[1].x + tri[2].x) / 3,
            y: (tri[0].y + tri[1].y + tri[2].y) / 3,
            z: (tri[0].z + tri[1].z + tri[2].z) / 3,
          },
        })
      }
      for (const sample of samples) {
        expect(sample.point.y).toBeLessThan(floor)
        const insideLand = pointInsideRidge(check.scene, land, sample.point)
        const insideSea = pointInsideRidge(check.scene, sea, sample.point)
        if (insideLand || insideSea) {
          throw new Error(
            `${check.shale} ${sample.label} ${JSON.stringify(sample.point)} land=${insideLand} sea=${insideSea}`,
          )
        }
      }
    }
  })

  it('follows the asymmetric flank and the convex bow', () => {
    const asym = asymSceneAt(0)
    const wf = wfSceneAt(0)
    const asymShale = shaleShape('asym', asym, 'e-shale-l-2')
    const wfShale = shaleShape('wf', wf, 'e-shale-l-2')
    const mid = Math.floor(Math.min(asymShale.topLand.length, wfShale.topLand.length) / 2)
    expect(asymShale.topLand[mid].z).not.toBeCloseTo(wfShale.topLand[mid].z, 2)

    const tfw = tfwSceneAt(0)
    const convex = shaleShape('tfw', tfw, 'e-shale-l-0')
    const bow = convex.topLand.reduce((best, point) => (point.z > best.z ? point : best))
    expect(bow.z).toBeGreaterThan(convex.topLand[0].z + 0.2)
    const hl = shaleShape('tfw', tfw, 'e-shale-hl-0')
    expect(hl.footLand[hl.footLand.length - 1].y).toBeLessThan(hl.topLand[hl.topLand.length - 1].y - 0.2)
  })
})
