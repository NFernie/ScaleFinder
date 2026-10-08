import { describe, expect, it } from 'vitest'
import { beachRidgeStations, MOUTH_BAR_SCALE, sceneAt, WF_ANCHOR } from './wfSchematic'

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

  it('fans five mouth bars seaward and sideways, overlapping in height', () => {
    const mouths = sceneAt(0)
      .filter((body) => body.kind === 'mouth-bar')
      .sort((a, b) => a.position.z - b.position.z)
    expect(mouths).toHaveLength(5)
    expect(mouths.map((body) => Math.sign(body.position.x))).toEqual([0, 1, -1, 1, -1])
    expect(MOUTH_BAR_SCALE.z).toBeGreaterThan(MOUTH_BAR_SCALE.x)
    for (let i = 1; i < mouths.length; i += 1) {
      expect(mouths[i].position.z).toBeGreaterThan(mouths[i - 1].position.z)
      expect(Math.abs(mouths[i].position.x)).toBeGreaterThan(Math.abs(mouths[i - 1].position.x))
      const rise = mouths[i].position.y - mouths[i - 1].position.y
      expect(rise).toBeGreaterThan(0)
      expect(rise).toBeLessThan(MOUTH_BAR_SCALE.y)
    }
    const area = mouths.reduce((sum, body, index) => {
      const next = mouths[(index + 1) % mouths.length]
      return sum + body.position.x * next.position.z - next.position.x * body.position.z
    }, 0)
    expect(Math.abs(area)).toBeGreaterThan(0.1)
    expect(new Set(mouths.map((body) => body.parentId))).toEqual(new Set(['es-mouth']))
  })

  it('overlaps beach ridges seaward of the channel and tapers them off both flanks', () => {
    const nested = sceneAt(0)
    expect(nested.some((body) => body.name === 'Swale')).toBe(false)
    for (const side of ['l', 'r'] as const) {
      const ridges = nested
        .filter((body) => body.id.startsWith(`e-ridge-${side}-`))
        .sort((a, b) => a.position.z - b.position.z)
      expect(ridges).toHaveLength(4)
      expect(new Set(ridges.map((body) => body.parentId))).toEqual(new Set([`es-ridge-${side}`]))
      const stations = beachRidgeStations(side)
      const channelEnd = stations[0]
      const tip = stations[stations.length - 1]
      const mid = stations[Math.floor(stations.length / 2)]
      const midT = Math.floor(stations.length / 2) / (stations.length - 1)
      const chordZ = channelEnd.z + (tip.z - channelEnd.z) * midT
      expect(channelEnd.halfWidth).toBeGreaterThan(tip.halfWidth * 4)
      expect(channelEnd.height).toBeGreaterThan(tip.height * 3)
      expect(tip.z).toBeGreaterThan(channelEnd.z)
      expect(mid.z).toBeLessThan(chordZ)
      expect(Math.abs(tip.x)).toBeGreaterThan(Math.abs(channelEnd.x))
      expect(Math.sign(channelEnd.x)).toBe(side === 'r' ? 1 : -1)
      for (let i = 1; i < ridges.length; i += 1) {
        const step = ridges[i].position.z - ridges[i - 1].position.z
        expect(step).toBeGreaterThan(0)
        expect(step).toBeLessThan(channelEnd.halfWidth * 2)
        expect(ridges[i].position.x).toBe(0)
      }
    }
  })

  it('keeps one straight channel on the axis and no slab or lobe solid', () => {
    const nested = sceneAt(0)
    const channel = nested.find((body) => body.kind === 'channel')
    expect(channel?.position.x).toBe(0)
    expect(channel?.parentId).toBe('ec-mouth')
    expect(nested.filter((body) => body.kind === 'channel')).toHaveLength(1)
    expect(nested.filter((body) => body.kind === 'group' && body.rank === 'element-complex')).toHaveLength(2)
    expect(nested.find((body) => body.id === 'ec-lobe')?.kind).toBe('group')
    expect(nested.find((body) => body.id === 'ec-mouth')?.kind).toBe('group')
    expect(nested.filter((body) => body.rank === 'element-complex-set')).toHaveLength(1)
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
