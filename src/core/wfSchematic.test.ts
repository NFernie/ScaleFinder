import { describe, expect, it } from 'vitest'
import {
  beachRidgeRing,
  beachRidgeStations,
  CHANNEL_LENGTH,
  CHANNEL_RADIUS,
  channelSpan,
  GROUND_THICKNESS,
  MOUTH_BAR_SCALE,
  MOUTH_BAR_STEP,
  MOUTH_BAR_YAW_STEP,
  mouthBarCrownY,
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
    const placed = sceneAt(0)
    const mouths = placed
      .filter((body) => body.kind === 'mouth-bar' && !body.id.startsWith('e-mouth-prox-'))
      .sort((a, b) => a.position.z - b.position.z || a.position.x - b.position.x)
    const span = channelSpan()
    const water = waterlineY()
    expect(mouths).toHaveLength(9)
    expect(MOUTH_BAR_SCALE.y).toBeCloseTo(0.056 * 1.5)
    expect(MOUTH_BAR_SCALE.z).toBeCloseTo(0.72 * 1.5)
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
    const seawardRidge = placed
      .filter((body) => body.id.startsWith('e-ridge-r-'))
      .sort((a, b) => a.position.z - b.position.z)
    const outerRidge = seawardRidge[seawardRidge.length - 1]
    expect(centre?.position.y).toBeCloseTo(outerRidge?.position.y ?? NaN)
    expect((centre?.position.y ?? 0) + MOUTH_BAR_SCALE.y).toBeLessThan(water)
    expect(centre && centre.position.z - MOUTH_BAR_SCALE.z / 2).toBeCloseTo(span.zSea - 0.12)
    expect(centre && centre.position.z + MOUTH_BAR_SCALE.z / 2).toBeGreaterThan(span.zSea)
    for (let i = 1; i < mouths.length; i += 1) {
      expect(mouths[i].position.z).toBeGreaterThanOrEqual(mouths[i - 1].position.z)
      expect(mouths[i].position.y).toBeLessThanOrEqual(mouths[i - 1].position.y + 1e-9)
      if (mouths[i].position.z > mouths[i - 1].position.z) {
        expect(mouths[i - 1].position.y - mouths[i].position.y).toBeCloseTo(MOUTH_BAR_SCALE.y * MOUTH_BAR_STEP)
        expect(mouths[i].position.z - mouths[i - 1].position.z).toBeLessThan(MOUTH_BAR_SCALE.z)
        expect(Math.abs(mouths[i].yaw ?? 0) - Math.abs(mouths[i - 1].yaw ?? 0)).toBeCloseTo((MOUTH_BAR_YAW_STEP * Math.PI) / 180)
      } else {
        expect(mouths[i].position.y).toBeCloseTo(mouths[i - 1].position.y)
        expect(Math.abs(mouths[i].yaw ?? 0)).toBeCloseTo(Math.abs(mouths[i - 1].yaw ?? 0))
      }
      if (mouths[i].position.x !== 0) {
        expect(Math.sign(mouths[i].yaw ?? 0)).toBe(Math.sign(mouths[i].position.x))
      }
    }
    expect(centre?.yaw ?? 0).toBe(0)
    const seawardZ = Math.max(...mouths.map((body) => body.position.z))
    const ranks = new Set(mouths.map((body) => body.position.z)).size - 1
    for (const body of mouths.filter((bar) => bar.position.z === seawardZ)) {
      expect(Math.abs(body.yaw ?? 0)).toBeCloseTo((ranks * MOUTH_BAR_YAW_STEP * Math.PI) / 180)
    }
    expect(mouths[mouths.length - 1].position.y).toBeLessThan(mouths[0].position.y)
    expect(new Set(mouths.map((body) => body.parentId))).toEqual(new Set(['es-mouth']))
  })

  it('progrades a second mouth-bar fan from the landward ridge under the channel', () => {
    const placed = sceneAt(0)
    const proximal = placed
      .filter((body) => body.id.startsWith('e-mouth-prox-'))
      .sort((a, b) => a.position.z - b.position.z || a.position.x - b.position.x)
    const seaward = placed
      .filter((body) => body.kind === 'mouth-bar' && !body.id.startsWith('e-mouth-prox-'))
      .sort((a, b) => a.position.z - b.position.z)
    const landwardRidge = placed
      .filter((body) => body.id.startsWith('e-ridge-r-'))
      .sort((a, b) => a.position.z - b.position.z)[0]
    const halfZ = MOUTH_BAR_SCALE.z / 2
    const apex = proximal.find((body) => body.position.x === 0)
    const intersectZ = (landwardRidge?.position.z ?? 0) + beachRidgeStations('r')[0].z
    expect(proximal).toHaveLength(9)
    expect(apex?.position.z).toBe(Math.min(...proximal.map((body) => body.position.z)))
    expect(apex && apex.position.z - halfZ).toBeCloseTo(intersectZ)
    expect((apex?.position.y ?? 0) + mouthBarCrownY()).toBeCloseTo(waterlineY())
    expect(apex?.yaw ?? 0).toBe(0)
    for (const body of proximal) {
      expect(body.position.y + mouthBarCrownY()).toBeLessThanOrEqual(waterlineY() + 1e-9)
      expect(body.parentId).toBe('es-mouth')
    }
    for (let i = 1; i < proximal.length; i += 1) {
      if (proximal[i].position.z > proximal[i - 1].position.z) {
        expect(proximal[i - 1].position.y - proximal[i].position.y).toBeCloseTo(MOUTH_BAR_SCALE.y * MOUTH_BAR_STEP)
        expect(Math.abs(proximal[i].yaw ?? 0) - Math.abs(proximal[i - 1].yaw ?? 0)).toBeCloseTo((MOUTH_BAR_YAW_STEP * Math.PI) / 180)
      }
      if (proximal[i].position.x !== 0) {
        expect(Math.sign(proximal[i].yaw ?? 0)).toBe(Math.sign(proximal[i].position.x))
      }
    }
    const existingRim = Math.min(...seaward.map((body) => body.position.z)) - halfZ
    const nose = Math.max(...proximal.map((body) => body.position.z)) + halfZ
    expect(nose).toBeGreaterThan(existingRim)
    expect(apex && apex.position.z).toBeLessThan(Math.min(...seaward.map((body) => body.position.z)))
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

  it('opens ranks on a sphere and accumulates one label per element kind', () => {
    const at = (t: number) => sceneAt(t)
    const byId = (bodies: ReturnType<typeof sceneAt>, id: string) => bodies.find((body) => body.id === id)!
    const length = (point: { x: number; y: number; z: number }) =>
      Math.hypot(point.x, point.y, point.z)
    const delta = (
      bodies: ReturnType<typeof sceneAt>,
      childId: string,
      parentId: string,
    ) => {
      const child = byId(bodies, childId).position
      const parent = byId(bodies, parentId).position
      return {
        x: child.x - parent.x,
        y: child.y - parent.y,
        z: child.z - parent.z,
      }
    }
    const apart = (bodies: ReturnType<typeof sceneAt>, childId: string, parentId: string) =>
      length(delta(bodies, childId, parentId))

    const nested = at(0)
    for (const body of nested) {
      expect(body.position).toEqual(body.nested)
    }
    expect(nested.filter((body) => body.showLabel).map((body) => body.id)).toEqual(['ecs'])

    const third = at(1 / 3)
    const root = byId(third, 'ecs').position
    expect(byId(third, 'ec-lobe').position).toEqual({ x: root.x + 8, y: root.y, z: root.z })
    expect(byId(third, 'ec-mouth').position).toEqual({ x: root.x - 8, y: root.y, z: root.z })
    const nestedSet = delta(nested, 'es-ridge-l', 'ec-lobe')
    const heldSet = delta(third, 'es-ridge-l', 'ec-lobe')
    expect(heldSet.x).toBeCloseTo(nestedSet.x, 6)
    expect(heldSet.y).toBeCloseTo(nestedSet.y, 6)
    expect(heldSet.z).toBeCloseTo(nestedSet.z, 6)
    expect(third.filter((body) => body.rank === 'element-set' && body.showLabel)).toHaveLength(0)
    expect(third.filter((body) => body.rank === 'element-complex' && body.showLabel).map((body) => body.id).sort()).toEqual([
      'ec-lobe',
      'ec-mouth',
    ])

    const twoThirds = at(2 / 3)
    expect(apart(twoThirds, 'es-ridge-l', 'ec-lobe')).toBeCloseTo(6, 6)
    expect(apart(twoThirds, 'es-ridge-r', 'ec-lobe')).toBeCloseTo(6, 6)
    expect(apart(twoThirds, 'es-mouth', 'ec-mouth')).toBeCloseTo(6, 6)
    const nestedRidge = delta(nested, 'e-ridge-r-0', 'es-ridge-r')
    const heldRidge = delta(twoThirds, 'e-ridge-r-0', 'es-ridge-r')
    expect(heldRidge.x).toBeCloseTo(nestedRidge.x, 6)
    expect(heldRidge.y).toBeCloseTo(nestedRidge.y, 6)
    expect(heldRidge.z).toBeCloseTo(nestedRidge.z, 6)
    expect(twoThirds.filter((body) => body.rank === 'element' && body.showLabel)).toHaveLength(0)
    expect(twoThirds.filter((body) => body.showLabel && body.rank === 'element-set')).toHaveLength(3)

    const full = at(1)
    for (const body of full.filter((item) => item.rank === 'element')) {
      expect(apart(full, body.id, body.parentId!)).toBeCloseTo(5, 6)
    }
    expect(apart(full, 'e-channel', 'ec-mouth')).toBeCloseTo(5, 6)
    for (const body of full.filter((item) => item.kind === 'mouth-bar')) {
      expect(apart(full, body.id, 'es-mouth')).toBeCloseTo(5, 6)
    }
    const mouths = full.filter((body) => body.parentId === 'es-mouth')
    const dirs = mouths.map((body) => delta(full, body.id, 'es-mouth'))
    for (const dir of dirs) expect(length(dir)).toBeCloseTo(5, 6)
    const unique = new Set(dirs.map((dir) => `${dir.x.toFixed(4)},${dir.y.toFixed(4)},${dir.z.toFixed(4)}`))
    expect(unique.size).toBe(mouths.length)
    expect(full.filter((body) => body.rank === 'element' && body.showLabel).map((body) => body.id).sort()).toEqual([
      'e-channel',
      'e-mouth-0',
      'e-ridge-r-0',
    ])
    expect(full.map((body) => body.id)).toEqual(nested.map((body) => body.id))
    expect(full.map((body) => body.parentId)).toEqual(nested.map((body) => body.parentId))
    expect(at(-1)).toEqual(at(0))
    expect(at(2)).toEqual(at(1))
  })
})
