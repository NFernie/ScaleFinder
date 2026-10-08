import { describe, expect, it } from 'vitest'
import { sceneAt, WF_ANCHOR } from './wfSchematic'

describe('wfSchematic', () => {
  it('pins Sfântu Gheorghe', () => {
    expect(WF_ANCHOR).toEqual({ lat: 44.878674, lng: 29.515563 })
  })

  it('links every body except the root', () => {
    const bodies = sceneAt(0)
    const ids = new Set(bodies.map((body) => body.id))
    const roots = bodies.filter((body) => body.parentId === null)
    expect(roots).toHaveLength(1)
    expect(roots[0].rank).toBe('element-complex-set')
    for (const body of bodies) {
      if (body.parentId === null) continue
      expect(ids.has(body.parentId)).toBe(true)
    }
    const ranks = new Set(bodies.map((body) => body.rank))
    expect([...ranks].sort()).toEqual([
      'element',
      'element-complex',
      'element-complex-set',
      'element-set',
    ])
  })

  it('fans five mouth bars seaward and sideways', () => {
    const mouths = sceneAt(0)
      .filter((body) => body.kind === 'mouth-bar')
      .sort((a, b) => a.position.z - b.position.z)
    expect(mouths).toHaveLength(5)
    expect(mouths.map((body) => Math.sign(body.position.x))).toEqual([0, 1, -1, 1, -1])
    for (let i = 1; i < mouths.length; i += 1) {
      expect(mouths[i].position.z).toBeGreaterThan(mouths[i - 1].position.z)
      expect(Math.abs(mouths[i].position.x)).toBeGreaterThan(Math.abs(mouths[i - 1].position.x))
    }
    const area = mouths.reduce((sum, body, index) => {
      const next = mouths[(index + 1) % mouths.length]
      return sum + body.position.x * next.position.z - next.position.x * body.position.z
    }, 0)
    expect(Math.abs(area)).toBeGreaterThan(0.1)
    expect(new Set(mouths.map((body) => body.parentId))).toEqual(new Set(['es-mouth']))
  })

  it('steps beach ridges away from the channel on both flanks', () => {
    const nested = sceneAt(0)
    for (const side of ['l', 'r'] as const) {
      const ridges = nested
        .filter((body) => body.id.startsWith(`e-ridge-${side}-`))
        .sort((a, b) => Math.abs(a.position.x) - Math.abs(b.position.x))
      const swales = nested.filter((body) => body.id.startsWith(`e-swale-${side}-`))
      expect(ridges).toHaveLength(4)
      expect(swales).toHaveLength(3)
      for (let i = 1; i < ridges.length; i += 1) {
        expect(Math.abs(ridges[i].position.x)).toBeGreaterThan(Math.abs(ridges[i - 1].position.x))
      }
      expect(new Set(ridges.map((body) => body.parentId))).toEqual(new Set([`es-ridge-${side}`]))
      expect(new Set(swales.map((body) => body.parentId))).toEqual(new Set([`es-ridge-${side}`]))
    }
  })

  it('has one channel, one mouth-bar slab, one lobe, two complexes, and one set root', () => {
    const nested = sceneAt(0)
    expect(nested.filter((body) => body.kind === 'channel')).toHaveLength(1)
    expect(nested.filter((body) => body.kind === 'mouth-slab')).toHaveLength(1)
    expect(nested.filter((body) => body.kind === 'lobe')).toHaveLength(1)
    expect(nested.filter((body) => body.rank === 'element-complex')).toHaveLength(2)
    expect(nested.filter((body) => body.rank === 'element-complex-set')).toHaveLength(1)
    expect(nested.find((body) => body.kind === 'channel')?.parentId).toBe('ec-mouth')
    expect(nested.find((body) => body.kind === 'lobe')?.parentId).toBe('ecs')
    expect(nested.find((body) => body.kind === 'mouth-slab')?.parentId).toBe('ecs')
  })

  it('separates ranks along Y and clamps explode', () => {
    const nested = sceneAt(0)
    const apart = sceneAt(1)
    expect(apart.map((body) => body.id)).toEqual(nested.map((body) => body.id))
    expect(apart.map((body) => body.parentId)).toEqual(nested.map((body) => body.parentId))
    const gap = (rank: string) => {
      const at0 = nested.find((body) => body.rank === rank)!
      const at1 = apart.find((body) => body.id === at0.id)!
      return at1.position.y - at0.position.y
    }
    expect(gap('element-complex-set')).toBe(0)
    expect(gap('element')).toBeGreaterThan(gap('element-set'))
    expect(gap('element-set')).toBeGreaterThan(gap('element-complex'))
    expect(gap('element-complex')).toBeGreaterThan(0)
    expect(sceneAt(-1)).toEqual(sceneAt(0))
    expect(sceneAt(2)).toEqual(sceneAt(1))
  })
})
