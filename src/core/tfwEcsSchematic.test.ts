import { describe, expect, it } from 'vitest'
import { beachRidgeMesh, channelMesh } from './schematicScene'
import { tidalChannelFrameAt, tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import { brConvexSwStations } from './brConvexSwPlan'
import {
  TFW_CHANNEL_YAW_RAD,
  TFW_ECS_ANCHOR,
  tfwMouthBarSideYawRad,
  tfwMouthBarYaw,
  sceneAt as tfwSceneAt,
  TFW_CONVEX_CHANNEL_OVERLAP,
  tfwConvexSwMeshWidth,
  tfwMouthBarMarginScale,
  tfwMouthBarXSpread,
  tfwRidgeShift,
} from './tfwEcsSchematic'
import {
  CHANNEL_RADIUS,
  GROUND_THICKNESS,
  MOUTH_BAR_SCALE,
  beachRidgeStations,
  mouthFanReferenceGap,
  MOUTH_FAN_X_SCALE,
  sceneAt as wfSceneAt,
  WATER_SLAB_DEPTH,
  WATER_SLAB_WIDTH,
  waterlineY,
} from './wfSchematic'

describe('tfwEcsSchematic', () => {
  it('keeps the Wf stack, swaps in the tidal channel, and steps both ridge flanks out to the funnel', () => {
    expect(TFW_ECS_ANCHOR).toEqual({ lat: -19.984295231442236, lng: 119.165775381814 })
    const tfw = tfwSceneAt(0)
    const wf = wfSceneAt(0)
    const leftMouthIds = [
      'ec-mouth-l',
      'es-mouth-l',
      ...wf.filter((body) => body.kind === 'mouth-bar').map((body) =>
        body.id.startsWith('e-mouth-prox-')
          ? `e-mouth-l-prox-${body.id.slice('e-mouth-prox-'.length)}`
          : `e-mouth-l-${body.id.slice('e-mouth-'.length)}`,
      ),
    ]
    expect(tfw.map((body) => body.id)).toEqual([
      ...wf.map((body) => body.id),
      'e-channel-l',
      'e-channel-l-join',
      ...leftMouthIds,
      'ec-ridge-hl',
      'es-ridge-hl',
      'e-ridge-hl-0',
      'e-ridge-hl-1',
      'e-ridge-hl-2',
      'e-ridge-hl-3',
      'e-deltaplain',
    ])
    expect(tfw.find((body) => body.id === 'ecs')?.name).toBe('Tfw element complex set')

    const channel = tfw.find((body) => body.id === 'e-channel')!
    expect(channel.yaw).toBeCloseTo(TFW_CHANNEL_YAW_RAD)

    const tfwMouth0 = tfw.find((body) => body.id === 'e-mouth-0')!
    expect(tfwMouth0.yaw).toBeCloseTo(TFW_CHANNEL_YAW_RAD)
    expect(tfwMouthBarSideYawRad(0)).toBe(0)
    expect(tfwMouthBarSideYawRad(0.16)).toBe(0)
    expect(tfwMouthBarSideYawRad(-0.16)).toBe(0)
    expect(tfwMouthBarSideYawRad(0.32) * (180 / Math.PI)).toBeCloseTo(2)
    expect(tfwMouthBarSideYawRad(-0.32) * (180 / Math.PI)).toBeCloseTo(-2)
    expect(tfwMouthBarSideYawRad(0.64) * (180 / Math.PI)).toBeCloseTo(5)
    expect(tfwMouthBarSideYawRad(-0.64) * (180 / Math.PI)).toBeCloseTo(-5)
    const spread = tfwMouthBarXSpread()
    const referenceGap = mouthFanReferenceGap() * MOUTH_FAN_X_SCALE
    expect(MOUTH_BAR_SCALE.x - referenceGap).toBeCloseTo(0.36)
    expect(MOUTH_BAR_SCALE.x - referenceGap * spread).toBeCloseTo(0.18)
    const onChannel = (wfBody: (typeof wf)[number], tfwBody: (typeof tfw)[number], localX: number) => {
      const yaw = TFW_CHANNEL_YAW_RAD
      const dz = wfBody.nested.z - channel.nested.z
      const seatedX = localX * tfwMouthBarMarginScale(dz)
      const cos = Math.cos(yaw)
      const sin = Math.sin(yaw)
      expect(tfwBody.nested.x).toBeCloseTo(channel.nested.x + seatedX * cos + dz * sin)
      expect(tfwBody.nested.z).toBeCloseTo(channel.nested.z - seatedX * sin + dz * cos)
      const templateX = wfBody.nested.x / MOUTH_FAN_X_SCALE
      expect(tfwBody.yaw).toBeCloseTo(tfwMouthBarYaw(wfBody.yaw ?? 0, templateX))
    }
    const wfOffAxis = wf.find((body) => body.id === 'e-mouth-1')!
    const tfwOffAxis = tfw.find((body) => body.id === 'e-mouth-1')!
    onChannel(wfOffAxis, tfwOffAxis, wfOffAxis.nested.x * spread)
    const wfLandward = wf.find((body) => body.id === 'e-mouth-prox-1')!
    const tfwLandward = tfw.find((body) => body.id === 'e-mouth-prox-1')!
    onChannel(wfLandward, tfwLandward, wfLandward.nested.x)
    const tfwProx = tfw.find((body) => body.id === 'e-mouth-prox-0')!
    const axis = { x: Math.sin(TFW_CHANNEL_YAW_RAD), z: Math.cos(TFW_CHANNEL_YAW_RAD) }
    const centreOffset = (body: (typeof tfw)[number]) => ({
      x: body.nested.x - channel.nested.x,
      z: body.nested.z - channel.nested.z,
    })
    for (const body of [tfwMouth0, tfwProx]) {
      const offset = centreOffset(body)
      expect(offset.x * axis.z - offset.z * axis.x).toBeCloseTo(0)
    }

    for (const id of ['e-ridge-l-0', 'e-ridge-l-3', 'e-ridge-r-0', 'e-ridge-r-3']) {
      expect(tfw.find((body) => body.id === id)!.yaw ?? 0).toBe(0)
    }
    for (const id of ['e-ridge-r-0', 'e-ridge-r-3']) {
      expect(tfw.find((body) => body.id === id)!.nested.z).toBeCloseTo(wf.find((body) => body.id === id)!.nested.z)
    }
    const meshWidth = tfwConvexSwMeshWidth()
    expect(meshWidth).toBeGreaterThan(0)
    const leftSet = tfw.find((body) => body.id === 'es-ridge-l')!
    const wfLeftSet = wf.find((body) => body.id === 'es-ridge-l')!
    expect(leftSet.nested.z).toBeCloseTo(wfLeftSet.nested.z - meshWidth / 2)
    expect(leftSet.nested.x).toBeCloseTo(wfLeftSet.nested.x)

    for (const body of tfw) {
      const match = wf.find((item) => item.id === body.id)
      if (!match) continue
      expect(body.parentId).toEqual(match?.parentId)
      expect(body.position.y).toBeCloseTo(match?.position.y ?? 0)
      const leftFlank = body.id === 'es-ridge-l' || body.id.startsWith('e-ridge-l-')
      if (
        !leftFlank &&
        body.id !== 'e-channel' &&
        body.kind !== 'mouth-bar' &&
        body.id !== 'ec-mouth' &&
        body.id !== 'es-mouth'
      ) {
        expect(body.position.z).toBeCloseTo(match?.position.z ?? 0)
      }
    }

    const { seaZ } = tidalChannelSpan()
    expect(TFW_CHANNEL_YAW_RAD).toBeGreaterThan(0)

    const channelEnd = (id: string) => {
      const ridge = tfw.find((body) => body.id === id)!
      const side = id.includes('-r-') ? 'r' : 'l'
      const index = Number(id.slice(id.lastIndexOf('-') + 1))
      const station = beachRidgeStations(side, index)[0]
      const yaw = ridge.yaw ?? 0
      return {
        x: ridge.nested.x + station.x * Math.cos(yaw) + station.z * Math.sin(yaw),
        z: ridge.nested.z - station.x * Math.sin(yaw) + station.z * Math.cos(yaw),
      }
    }
    const { landZ } = tidalChannelSpan()
    const wallAt = (side: 'l' | 'r', worldZ: number) => {
      const sign = side === 'r' ? 1 : -1
      const yaw = channel.yaw ?? 0
      const zOf = (localZ: number) => {
        const radius = tidalChannelRadiusAt(localZ)
        return channel.nested.z + (-sign * radius * Math.sin(yaw) + localZ * Math.cos(yaw))
      }
      let lo = landZ
      let hi = seaZ
      if (worldZ <= zOf(landZ)) lo = hi = landZ
      else if (worldZ >= zOf(seaZ)) lo = hi = seaZ
      else {
        for (let i = 0; i < 48; i += 1) {
          const mid = (lo + hi) / 2
          if (zOf(mid) < worldZ) lo = mid
          else hi = mid
        }
      }
      const localZ = (lo + hi) / 2
      const radius = tidalChannelRadiusAt(localZ)
      return {
        x: channel.nested.x + sign * radius * Math.cos(yaw) + localZ * Math.sin(yaw),
        z: channel.nested.z + (-sign * radius * Math.sin(yaw) + localZ * Math.cos(yaw)),
      }
    }
    const onWall = (side: 'l' | 'r', id: string) => {
      const end = channelEnd(id)
      const wall = wallAt(side, end.z)
      expect(end.x).toBeCloseTo(wall.x)
      const span = tidalChannelSpan()
      const yaw = channel.yaw ?? 0
      const sign = side === 'r' ? 1 : -1
      const zOf = (localZ: number) => {
        const radius = tidalChannelRadiusAt(localZ)
        return channel.nested.z + (-sign * radius * Math.sin(yaw) + localZ * Math.cos(yaw))
      }
      const lo = Math.min(zOf(span.landZ), zOf(span.seaZ))
      const hi = Math.max(zOf(span.landZ), zOf(span.seaZ))
      if (end.z >= lo && end.z <= hi) expect(end.z).toBeCloseTo(wall.z)
    }
    for (const id of ['e-ridge-r-0', 'e-ridge-r-1', 'e-ridge-r-2', 'e-ridge-r-3']) onWall('r', id)
    for (const id of ['e-ridge-l-0', 'e-ridge-l-1', 'e-ridge-l-2', 'e-ridge-l-3']) {
      const end = channelEnd(id)
      const yaw = channel.yaw ?? 0
      const dx = end.x - channel.nested.x
      const dz = end.z - channel.nested.z
      const localX = dx * Math.cos(yaw) - dz * Math.sin(yaw)
      const localZ = dx * Math.sin(yaw) + dz * Math.cos(yaw)
      const radius = tidalChannelRadiusAt(localZ)
      const width = radius * 2
      expect(localX).toBeCloseTo(-radius + TFW_CONVEX_CHANNEL_OVERLAP * width, 4)
      const index = Number(id.slice(id.lastIndexOf('-') + 1))
      const wfRidge = wf.find((body) => body.id === id)!
      const stationZ = beachRidgeStations('l', index)[0].z
      expect(end.z).toBeLessThan(wfRidge.nested.z + stationZ)
    }

    expect(tfwRidgeShift('e-ridge-r-3')).not.toBeCloseTo(tfwRidgeShift('e-ridge-r-0'))

    expect(channelMesh('tfw')).toBe('tidal')
    expect(channelMesh('wf')).toBe('half')
    expect(beachRidgeMesh('tfw', 'e-ridge-hl-2')).toBe('symmetric')
    expect(beachRidgeMesh('tfw', 'e-ridge-l-2')).toBe('convex-sw')
    expect(beachRidgeMesh('tfw', 'e-ridge-r-2')).toBe('asymmetric')
    expect(beachRidgeMesh('wf', 'e-ridge-r-2')).toBe('symmetric')
    expect(beachRidgeMesh('asym', 'e-ridge-r-2')).toBe('symmetric')

    const half = tfw.find((body) => body.id === 'e-channel-l')!
    expect(half.kind).toBe('channel')
    expect(half.parentId).toBe('es-ridge-l')
    expect(half.position.y).toBeCloseTo(channel.position.y)
    const halfLen = half.channelLength ?? 0
    const halfEnd = (sign: 1 | -1) => ({
      x: half.nested.x + sign * (halfLen / 2) * Math.sin(half.yaw ?? 0),
      z: half.nested.z + sign * (halfLen / 2) * Math.cos(half.yaw ?? 0),
    })
    const sea = halfEnd(1)
    const landEnd = halfEnd(-1)
    expect(landEnd.z).toBeLessThan(sea.z)
    const outerTip = (index: number) => {
      const ridge = tfw.find((body) => body.id === `e-ridge-l-${index}`)!
      let tip = { x: Infinity, z: 0 }
      for (const station of brConvexSwStations('l', index)) {
        const x = ridge.nested.x + station.x
        if (x < tip.x) tip = { x, z: ridge.nested.z + station.z }
      }
      return tip
    }
    const landTip = outerTip(0)
    const seaTip = outerTip(3)
    const edgeX = seaTip.x - landTip.x
    const edgeZ = seaTip.z - landTip.z
    const edge = Math.hypot(edgeX, edgeZ)
    const outX = -edgeZ / edge
    const outZ = edgeX / edge
    const edgeSea = { x: seaTip.x + outX * CHANNEL_RADIUS, z: seaTip.z + outZ * CHANNEL_RADIUS }
    const edgeLand = { x: landTip.x + outX * CHANNEL_RADIUS, z: landTip.z + outZ * CHANNEL_RADIUS }
    expect(half.channelLength).toBeCloseTo(edge * 2, 5)
    expect(sea.x).toBeCloseTo(edgeSea.x)
    expect(sea.z).toBeCloseTo(edgeSea.z)
    expect(landEnd.x).toBeCloseTo(edgeSea.x + (edgeLand.x - edgeSea.x) * 2)
    expect(landEnd.z).toBeCloseTo(edgeSea.z + (edgeLand.z - edgeSea.z) * 2)
    expect(sea.x).toBeLessThan(seaTip.x)

    const join = tfw.find((body) => body.id === 'e-channel-l-join')!
    expect(join.kind).toBe('channel')
    expect(join.parentId).toBe('es-ridge-l')
    expect(join.position.y).toBeCloseTo(half.position.y)
    const joinLen = join.channelLength ?? 0
    const joinEnd = (sign: 1 | -1) => ({
      x: join.nested.x + sign * (joinLen / 2) * Math.sin(join.yaw ?? 0),
      z: join.nested.z + sign * (joinLen / 2) * Math.cos(join.yaw ?? 0),
    })
    expect(joinEnd(1).x).toBeCloseTo(landEnd.x)
    expect(joinEnd(1).z).toBeCloseTo(landEnd.z)
    const frame = tidalChannelFrameAt(tidalChannelSpan().landZ)
    const channelYaw = channel.yaw ?? 0
    const tip = {
      x: channel.nested.x + frame.x * Math.cos(channelYaw) + frame.z * Math.sin(channelYaw),
      z: channel.nested.z - frame.x * Math.sin(channelYaw) + frame.z * Math.cos(channelYaw),
    }
    expect(joinEnd(-1).x).toBeCloseTo(tip.x)
    expect(joinEnd(-1).z).toBeCloseTo(tip.z)
    expect(joinLen).toBeGreaterThan(0)

    const wfChannel = wf.find((body) => body.id === 'e-channel')!
    const copied = tfw.find((body) => body.id === 'e-mouth-l-1')!
    const source = wf.find((body) => body.id === 'e-mouth-1')!
    const dx = source.nested.x - wfChannel.nested.x
    const dy = source.nested.y - wfChannel.nested.y
    const dz = source.nested.z - wfChannel.nested.z
    const halfYaw = half.yaw ?? 0
    expect(copied.nested.x).toBeCloseTo(half.nested.x + dx * Math.cos(halfYaw) + dz * Math.sin(halfYaw))
    expect(copied.nested.z).toBeCloseTo(half.nested.z - dx * Math.sin(halfYaw) + dz * Math.cos(halfYaw))
    expect(copied.nested.y).toBeCloseTo(half.nested.y + dy)
    expect(copied.yaw ?? 0).toBeCloseTo((source.yaw ?? 0) + halfYaw)
    expect(copied.parentId).toBe('es-mouth-l')
    expect(tfw.find((body) => body.id === 'ec-mouth-l')?.parentId).toBe('ecs')
    expect(tfw.find((body) => body.id === 'es-mouth-l')?.parentId).toBe('ec-mouth-l')
    expect(tfw.filter((body) => body.id.startsWith('e-mouth-l-')).length).toBe(18)

    const copiedRidge = tfw.find((body) => body.id === 'e-ridge-hl-0')!
    const sourceRidge = wf.find((body) => body.id === 'e-ridge-l-0')!
    const ridgeDx = sourceRidge.nested.x - wfChannel.nested.x
    const ridgeDy = sourceRidge.nested.y - wfChannel.nested.y
    const ridgeDz = sourceRidge.nested.z - wfChannel.nested.z
    expect(copiedRidge.nested.x).toBeCloseTo(half.nested.x + ridgeDx * Math.cos(halfYaw) + ridgeDz * Math.sin(halfYaw))
    expect(copiedRidge.nested.z).toBeCloseTo(half.nested.z - ridgeDx * Math.sin(halfYaw) + ridgeDz * Math.cos(halfYaw))
    expect(copiedRidge.nested.y).toBeCloseTo(half.nested.y + ridgeDy)
    expect(copiedRidge.yaw ?? 0).toBeCloseTo(halfYaw)
    expect(copiedRidge.parentId).toBe('es-ridge-hl')
    expect(copiedRidge.kind).toBe('beach-ridge')
    expect(tfw.find((body) => body.id === 'ec-ridge-hl')?.parentId).toBe('ecs')
    expect(tfw.find((body) => body.id === 'es-ridge-hl')?.parentId).toBe('ec-ridge-hl')

    const ground = tfw.find((body) => body.id === 'ecs')!
    expect(wf.find((body) => body.id === 'ecs')!.groundSpan).toBeUndefined()
    expect(ground.groundSpan!.width).toBeGreaterThan(WATER_SLAB_WIDTH)
    expect(ground.groundSpan!.depth).toBeGreaterThanOrEqual(WATER_SLAB_DEPTH)
    expect(ground.nested.y + GROUND_THICKNESS / 2).toBeCloseTo(waterlineY())
    const inside = (point: { x: number; z: number }) => {
      expect(Math.abs(point.x - ground.nested.x)).toBeLessThanOrEqual(ground.groundSpan!.width / 2)
      expect(Math.abs(point.z - ground.nested.z)).toBeLessThanOrEqual(ground.groundSpan!.depth / 2)
    }
    const wfGround = wf.find((body) => body.id === 'ecs')!
    inside({ x: wfGround.nested.x - WATER_SLAB_WIDTH / 2, z: wfGround.nested.z - WATER_SLAB_DEPTH / 2 })
    inside({ x: wfGround.nested.x + WATER_SLAB_WIDTH / 2, z: wfGround.nested.z + WATER_SLAB_DEPTH / 2 })
    inside(landEnd)
    const onSlab = (body: (typeof tfw)[number], index: number) => {
      const stations = beachRidgeStations('l', index)
      const station = stations[stations.length - 1]
      const yaw = body.yaw ?? 0
      inside({
        x: body.nested.x + station.x * Math.cos(yaw) + station.z * Math.sin(yaw),
        z: body.nested.z - station.x * Math.sin(yaw) + station.z * Math.cos(yaw),
      })
    }
    onSlab(copiedRidge, 0)
    onSlab(tfw.find((body) => body.id === 'e-ridge-hl-3')!, 3)
  })
})
