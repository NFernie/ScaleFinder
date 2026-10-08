import { describe, expect, it } from 'vitest'
import {
  beachRidgeRing,
  beachRidgeStations,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  channelSpan,
  MOUTH_BAR_SCALE,
  RIDGE_BASE_SEAWARD,
  sceneAt,
  WF_ANCHOR,
} from './wfSchematic'

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

  it('stacks mouth bars in a seaward sigmoid in front of the channel', () => {
    const mouths = sceneAt(0)
      .filter((body) => body.kind === 'mouth-bar')
      .sort((a, b) => a.position.z - b.position.z)
    const span = channelSpan()
    expect(mouths.length).toBeGreaterThan(5)
    expect(mouths.map((body) => Math.sign(body.position.x))).toEqual([0, 1, -1, 1, -1, 1, -1, 1, -1])
    expect(MOUTH_BAR_SCALE.z).toBeGreaterThan(MOUTH_BAR_SCALE.x)
    const landward = mouths[0]
    expect(landward.position.y + MOUTH_BAR_SCALE.y / 2).toBeLessThan(span.flatY - CHANNEL_RADIUS)
    expect(landward.position.z - MOUTH_BAR_SCALE.z / 2).toBeLessThan(span.zSea)
    expect(landward.position.z + MOUTH_BAR_SCALE.z / 2).toBeGreaterThan(span.zSea)
    for (let i = 1; i < mouths.length; i += 1) {
      const stepZ = mouths[i].position.z - mouths[i - 1].position.z
      const drop = mouths[i - 1].position.y - mouths[i].position.y
      expect(stepZ).toBeGreaterThan(0)
      expect(stepZ).toBeLessThan(MOUTH_BAR_SCALE.z)
      expect(Math.abs(mouths[i].position.x)).toBeGreaterThan(Math.abs(mouths[i - 1].position.x))
      expect(drop).toBeGreaterThan(0)
      expect(drop).toBeLessThan(MOUTH_BAR_SCALE.y)
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
      const ring = beachRidgeRing(channelEnd)
      const baseZ = ring.filter((corner) => corner.y === 0).reduce((sum, corner) => sum + corner.z, 0) / 2
      const crestZ = ring.filter((corner) => corner.y > 0).reduce((sum, corner) => sum + corner.z, 0) / 2
      expect(channelEnd.halfWidth).toBeGreaterThan(tip.halfWidth * 4)
      expect(channelEnd.height).toBeGreaterThan(tip.height * 3)
      expect(tip.z).toBeLessThan(channelEnd.z)
      expect(mid.z).toBeGreaterThan(chordZ)
      expect(baseZ - crestZ).toBeCloseTo(RIDGE_BASE_SEAWARD)
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

  it('trims one half-channel to the seaward beach ridges', () => {
    const nested = sceneAt(0)
    const channel = nested.find((body) => body.kind === 'channel')
    const span = channelSpan()
    const rightRidges = nested
      .filter((body) => body.id.startsWith('e-ridge-r-'))
      .sort((a, b) => a.position.z - b.position.z)
    const seaward = rightRidges[rightRidges.length - 1]
    const thickZ = (seaward?.position.z ?? 0) + beachRidgeStations('r')[0].z
    expect(channel?.position.x).toBe(0)
    expect(channel?.position.y).toBe(span.flatY)
    expect(channel?.position.z).toBeCloseTo(span.centerZ)
    expect(channel?.parentId).toBe('ec-mouth')
    expect(CHANNEL_RADIUS).toBe(0.1)
    expect(span.zSea).toBeCloseTo(thickZ)
    expect(span.centerZ + CHANNEL_LENGTH / 2).toBeCloseTo(span.zSea)
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
