import { describe, expect, it } from 'vitest'
import { cssEaseOut } from './cssEaseOut'
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
  RIDGE_FACE_SLOPE,
  bodyCenter,
  EXPLODE_SPREAD,
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
      const crown = crestSea.z - channelEnd.z
      const steepRun = channelEnd.halfWidth - crown + RIDGE_BASE_SEAWARD
      expect(RIDGE_FACE_SLOPE).toBe(0.25)
      expect(baseSea.z - crestSea.z).toBeCloseTo(steepRun / RIDGE_FACE_SLOPE)
      expect(baseSea.z - base.reduce((land, corner) => (corner.z < land.z ? corner : land)).z).toBeCloseTo(channelEnd.halfWidth * 2)
      expect(baseZ - crestZ).toBeCloseTo(RIDGE_BASE_SEAWARD + steepRun * (1 / RIDGE_FACE_SLOPE - 1))
      expect(upper && upper.z).toBeGreaterThan(chordAt(channelEnd.height * 0.75))
      expect(lower && lower.z).toBeLessThan(chordAt(channelEnd.height * 0.25))
      const mid = ring.find((corner) => Math.abs(corner.y - channelEnd.height * 0.5) < 1e-6)
      expect(mid && mid.z).toBeCloseTo(chordAt(channelEnd.height * 0.5))
      for (const corner of ring) {
        if (corner.y <= 0 || corner.y >= channelEnd.height) continue
        const down = 1 - corner.y / channelEnd.height
        const chord = chordAt(corner.y)
        if (down < 0.5) expect(corner.z).toBeGreaterThan(chord)
        if (down > 0.5) expect(corner.z).toBeLessThan(chord)
      }
      const face = [crestSea, ...ring.filter((corner) => corner.y > 0 && corner.y < channelEnd.height), baseSea].sort(
        (a, b) => b.y - a.y,
      )
      const stepsZ = face.slice(1).map((corner, index) => corner.z - face[index].z)
      const middleStep = stepsZ[Math.floor(stepsZ.length / 2)]
      expect(stepsZ[0]).toBeGreaterThan(middleStep)
      expect(stepsZ[stepsZ.length - 1]).toBeGreaterThan(middleStep)
      expect(stepsZ.every((step) => step > 0)).toBe(true)
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

  it('spreads every centre from the origin and keeps one label per element kind', () => {
    const at = (t: number) => sceneAt(t)
    const byId = (bodies: ReturnType<typeof sceneAt>, id: string) => bodies.find((body) => body.id === id)!
    const length = (point: { x: number; y: number; z: number }) => Math.hypot(point.x, point.y, point.z)
    const spreadAt = (t: number) => 1 + (EXPLODE_SPREAD - 1) * t

    const expectOnRay = (t: number) => {
      const spread = spreadAt(t)
      for (const body of at(t)) {
        const center = bodyCenter(body)
        const travel = spread - 1
        expect(body.position.x).toBeCloseTo(body.nested.x + travel * center.x, 6)
        expect(body.position.y).toBeCloseTo(body.nested.y + travel * center.y, 6)
        expect(body.position.z).toBeCloseTo(body.nested.z + travel * center.z, 6)
        const delta = {
          x: body.position.x - body.nested.x,
          y: body.position.y - body.nested.y,
          z: body.position.z - body.nested.z,
        }
        if (length(center) < 1e-6 || length(delta) < 1e-6) continue
        const cross = length({
          x: delta.y * center.z - delta.z * center.y,
          y: delta.z * center.x - delta.x * center.z,
          z: delta.x * center.y - delta.y * center.x,
        })
        expect(cross).toBeCloseTo(0, 6)
        const dominant = (['x', 'y', 'z'] as const).reduce((best, axis) =>
          Math.abs(center[axis]) > Math.abs(center[best]) ? axis : best,
        )
        expect(Math.sign(delta[dominant])).toBe(Math.sign(center[dominant]))
        for (const axis of ['x', 'y', 'z'] as const) {
          expect(Math.abs(delta[dominant])).toBeGreaterThanOrEqual(Math.abs(delta[axis]) - 1e-9)
        }
      }
    }

    const nested = at(0)
    for (const body of nested) expect(body.position).toEqual(body.nested)
    expect(nested.filter((body) => body.showLabel).map((body) => body.id)).toEqual(['ecs'])
    expectOnRay(0)

    const third = at(1 / 3)
    expectOnRay(1 / 3)
    expect(third.filter((body) => body.rank === 'element-set' && body.showLabel)).toHaveLength(0)
    expect(third.filter((body) => body.rank === 'element-complex' && body.showLabel).map((body) => body.id).sort()).toEqual([
      'ec-lobe',
      'ec-mouth',
    ])

    const twoThirds = at(2 / 3)
    expectOnRay(2 / 3)
    expect(twoThirds.filter((body) => body.rank === 'element' && body.showLabel)).toHaveLength(0)
    expect(twoThirds.filter((body) => body.showLabel && body.rank === 'element-set')).toHaveLength(3)

    const full = at(1)
    expectOnRay(1)
    const centerDistance = (idA: string, idB: string) =>
      length({
        x: bodyCenter(byId(nested, idA)).x - bodyCenter(byId(nested, idB)).x,
        y: bodyCenter(byId(nested, idA)).y - bodyCenter(byId(nested, idB)).y,
        z: bodyCenter(byId(nested, idA)).z - bodyCenter(byId(nested, idB)).z,
      })
    const left = bodyCenter(byId(nested, 'e-ridge-l-0'))
    const right = bodyCenter(byId(nested, 'e-ridge-r-0'))
    expect(left.x).toBeLessThan(0)
    expect(right.x).toBeGreaterThan(0)
    expect(Math.abs(left.x)).toBeGreaterThan(Math.abs(left.y))
    expect(Math.abs(left.x)).toBeGreaterThan(Math.abs(left.z))
    expect(Math.abs(right.x)).toBeGreaterThan(Math.abs(right.y))
    expect(Math.abs(right.x)).toBeGreaterThan(Math.abs(right.z))
    const ridgeGap = centerDistance('e-ridge-l-0', 'e-ridge-r-0')
    const mouthGap = centerDistance('e-mouth-0', 'e-mouth-1')
    const sameSideGap = centerDistance('e-ridge-r-0', 'e-ridge-r-1')
    expect(ridgeGap * EXPLODE_SPREAD).toBeGreaterThan(ridgeGap)
    expect(mouthGap * EXPLODE_SPREAD).toBeGreaterThan(mouthGap + 0.5)
    expect(sameSideGap * EXPLODE_SPREAD).toBeGreaterThan(sameSideGap)
    expect(full.filter((body) => body.rank === 'element' && body.showLabel).map((body) => body.id).sort()).toEqual([
      'e-channel',
      'e-mouth-0',
      'e-ridge-r-0',
    ])
    expect(full.map((body) => body.id)).toEqual(nested.map((body) => body.id))
    expect(full.map((body) => body.parentId)).toEqual(nested.map((body) => body.parentId))
    expect(at(-1)).toEqual(at(0))
    expect(at(2)).toEqual(at(1))
    expect(spreadAt(1)).toBe(EXPLODE_SPREAD)
  })
})

describe('cssEaseOut', () => {
  it('matches CSS ease-out endpoints and midpoint', () => {
    expect(cssEaseOut(0)).toBe(0)
    expect(cssEaseOut(1)).toBe(1)
    expect(cssEaseOut(0.5)).toBeCloseTo(0.68, 1)
  })

  it('never exceeds 1 for sample times', () => {
    for (const t of [0, 0.25, 0.5, 0.8, 1]) {
      expect(cssEaseOut(t)).toBeLessThanOrEqual(1)
      expect(cssEaseOut(t)).toBeGreaterThanOrEqual(0)
    }
  })
})
