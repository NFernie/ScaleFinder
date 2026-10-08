import { describe, expect, it } from 'vitest'
import {
  beachRidgeRing,
  beachRidgeStations,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  channelSpan,
  GROUND_THICKNESS,
  MOUTH_BAR_SCALE,
  RIDGE_BASE_SEAWARD,
  RIDGE_DOWNSTEP,
  sceneAt,
  WATER_OPACITY,
  waterlineY,
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

  it('fills a seaward mouth-bar V under the water line', () => {
    const mouths = sceneAt(0)
      .filter((body) => body.kind === 'mouth-bar')
      .sort((a, b) => a.position.z - b.position.z || a.position.x - b.position.x)
    const span = channelSpan()
    const water = waterlineY()
    expect(mouths).toHaveLength(9)
    expect(MOUTH_BAR_SCALE.y).toBeCloseTo(0.28 * 0.2)
    expect(MOUTH_BAR_SCALE.z).toBeGreaterThan(MOUTH_BAR_SCALE.x)
    const centre = mouths.find((body) => body.position.x === 0)
    expect(centre?.position.z).toBe(Math.min(...mouths.map((body) => body.position.z)))
    expect(mouths.filter((body) => body.position.x < 0).length).toBeGreaterThan(2)
    expect(mouths.filter((body) => body.position.x > 0).length).toBeGreaterThan(2)
    const inner = mouths.filter((body) => Math.abs(body.position.x) > 0.05 && Math.abs(body.position.x) < 0.25)
    expect(inner.some((body) => body.position.x < 0)).toBe(true)
    expect(inner.some((body) => body.position.x > 0)).toBe(true)
    const innerLeft = inner.find((body) => body.position.x < 0)!
    const innerRight = inner.find((body) => body.position.x > 0)!
    expect(Math.abs(innerLeft.position.x - innerRight.position.x)).toBeLessThan(MOUTH_BAR_SCALE.x)
    const widest = Math.max(...mouths.map((body) => Math.abs(body.position.x)))
    expect(mouths.filter((body) => Math.abs(body.position.x) === widest).every((body) => body.position.z > (centre?.position.z ?? 0))).toBe(true)
    expect((centre?.position.y ?? 0) + MOUTH_BAR_SCALE.y / 2).toBeLessThan(water)
    expect(centre && centre.position.z - MOUTH_BAR_SCALE.z / 2).toBeLessThan(span.zSea)
    expect(centre && centre.position.z + MOUTH_BAR_SCALE.z / 2).toBeGreaterThan(span.zSea)
    for (let i = 1; i < mouths.length; i += 1) {
      expect(mouths[i].position.z).toBeGreaterThanOrEqual(mouths[i - 1].position.z)
      expect(mouths[i].position.y).toBeLessThanOrEqual(mouths[i - 1].position.y + 1e-9)
      if (mouths[i].position.z > mouths[i - 1].position.z) {
        expect(mouths[i].position.z - mouths[i - 1].position.z).toBeLessThan(MOUTH_BAR_SCALE.z)
      }
    }
    expect(mouths[mouths.length - 1].position.y).toBeLessThan(mouths[0].position.y)
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
      const ring = beachRidgeRing(channelEnd)
      const base = ring.filter((corner) => corner.y === 0)
      const crest = ring.filter((corner) => corner.y === channelEnd.height)
      const baseSea = base.reduce((best, corner) => (corner.z > best.z ? corner : best))
      const crestSea = crest.reduce((best, corner) => (corner.z > best.z ? corner : best))
      const upper = ring.find((corner) => Math.abs(corner.y - channelEnd.height * 0.75) < 1e-6)
      const lower = ring.find((corner) => Math.abs(corner.y - channelEnd.height * 0.25) < 1e-6)
      const chordAt = (y: number) => {
        const t = 1 - y / channelEnd.height
        return crestSea.z + (baseSea.z - crestSea.z) * t
      }
      const baseZ = base.reduce((sum, corner) => sum + corner.z, 0) / base.length
      const crestZ = crest.reduce((sum, corner) => sum + corner.z, 0) / crest.length
      const lowest = stations.reduce((best, station) => (station.z < best.z ? station : best))
      const water = waterlineY()
      expect(channelEnd.halfWidth).toBeCloseTo(0.145)
      expect(channelEnd.halfWidth).toBeGreaterThan(tip.halfWidth * 4)
      expect(channelEnd.height).toBeGreaterThan(tip.height)
      expect(tip.z).toBeLessThan(channelEnd.z)
      expect(tip.z).toBeGreaterThan(lowest.z)
      expect(tip.z).toBeGreaterThan(stations[stations.length - 2].z)
      expect(stations[stations.length - 2].z).toBeGreaterThan(stations[stations.length - 3].z)
      expect(stations[1].z).toBeLessThan(stations[0].z)
      expect(baseZ - crestZ).toBeCloseTo(RIDGE_BASE_SEAWARD)
      expect(upper && upper.z).toBeLessThan(chordAt(channelEnd.height * 0.75))
      expect(lower && lower.z).toBeGreaterThan(chordAt(channelEnd.height * 0.25))
      expect(Math.abs(tip.x)).toBeGreaterThan(Math.abs(channelEnd.x))
      expect(Math.sign(channelEnd.x)).toBe(side === 'r' ? 1 : -1)
      const seaward = ridges[ridges.length - 1]
      expect((seaward?.position.y ?? 0) + channelEnd.height).toBeCloseTo(channelSpan().flatY)
      for (const ridge of ridges) {
        for (const station of stations) {
          expect(ridge.position.y + station.height).toBeGreaterThan(water)
        }
      }
      for (let i = 1; i < ridges.length; i += 1) {
        const step = ridges[i].position.z - ridges[i - 1].position.z
        expect(step).toBeGreaterThan(0)
        expect(ridges[i].position.x).toBe(0)
        expect((ridges[i - 1].position.y - ridges[i].position.y) / 0.36).toBeCloseTo(RIDGE_DOWNSTEP)
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
    const ground = nested.find((body) => body.kind === 'ground')
    expect(WATER_OPACITY).toBe(0.3)
    expect((ground?.position.y ?? 0) + GROUND_THICKNESS / 2).toBeCloseTo(waterlineY())
    expect(waterlineY()).toBeCloseTo(span.flatY - CHANNEL_RADIUS)
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
