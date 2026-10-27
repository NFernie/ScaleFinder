import { describe, expect, it } from 'vitest'
import { beachRidgeMesh, channelMesh } from './schematicScene'
import { tidalChannelRadiusAt, tidalChannelSpan } from './tidalChannel'
import {
  TFW_CHANNEL_YAW_RAD,
  TFW_ECS_ANCHOR,
  TFW_MOUTH_COMPLEX_YAW_RAD,
  sceneAt as tfwSceneAt,
  tfwRidgeShift,
} from './tfwEcsSchematic'
import { beachRidgeStations, sceneAt as wfSceneAt } from './wfSchematic'

describe('tfwEcsSchematic', () => {
  it('keeps the Wf stack, swaps in the tidal channel, and steps both ridge flanks out to the funnel', () => {
    expect(TFW_ECS_ANCHOR).toEqual({ lat: -19.984295231442236, lng: 119.165775381814 })
    const tfw = tfwSceneAt(0)
    const wf = wfSceneAt(0)
    expect(tfw.map((body) => body.id)).toEqual(wf.map((body) => body.id))
    expect(tfw.find((body) => body.id === 'ecs')?.name).toBe('Tfw element complex set')

    const channel = tfw.find((body) => body.id === 'e-channel')!
    expect(channel.yaw).toBeCloseTo(TFW_CHANNEL_YAW_RAD)

    const wfMouth0 = wf.find((body) => body.id === 'e-mouth-0')!
    const tfwMouth0 = tfw.find((body) => body.id === 'e-mouth-0')!
    expect(tfwMouth0.yaw).toBeCloseTo((wfMouth0.yaw ?? 0) + TFW_MOUTH_COMPLEX_YAW_RAD)

    for (const id of ['e-ridge-l-0', 'e-ridge-l-3']) {
      expect(tfw.find((body) => body.id === id)!.yaw).toBeCloseTo(TFW_CHANNEL_YAW_RAD)
    }

    for (const body of tfw) {
      const match = wf.find((item) => item.id === body.id)
      expect(body.parentId).toEqual(match?.parentId)
      expect(body.position.y).toBeCloseTo(match?.position.y ?? 0)
      if (body.kind === 'beach-ridge' && body.id.includes('-r-')) {
        expect(body.position.z).not.toBeCloseTo(match?.position.z ?? 0)
      } else if (body.kind !== 'beach-ridge' && body.id !== 'e-channel') {
        expect(body.position.z).toBeCloseTo(match?.position.z ?? 0)
      }
    }

    const { seaZ } = tidalChannelSpan()
    const edgeR = tidalChannelRadiusAt(seaZ)
    const cos = Math.cos(TFW_CHANNEL_YAW_RAD)
    const sin = Math.sin(TFW_CHANNEL_YAW_RAD)
    const channelEdgeZ = channel.nested.z + (-edgeR * sin + seaZ * cos)
    const rightSea = tfw.find((body) => body.id === 'e-ridge-r-3')!
    const stationSea = beachRidgeStations('r', 3)[0]
    expect(rightSea.nested.z + stationSea.z).toBeCloseTo(channelEdgeZ)

    const rightLand = tfw.find((body) => body.id === 'e-ridge-r-0')!
    const wfLand = wf.find((body) => body.id === 'e-ridge-r-0')!
    const wfSea = wf.find((body) => body.id === 'e-ridge-r-3')!
    const landSeaGap = wfSea.nested.z - wfLand.nested.z
    expect(rightSea.nested.z - rightLand.nested.z).toBeCloseTo(landSeaGap)
    expect(tfw.find((body) => body.id === 'e-ridge-l-3')!.position.x).toBeLessThan(
      tfw.find((body) => body.id === 'e-ridge-l-0')!.position.x,
    )

    for (const id of ['e-ridge-r-0', 'e-ridge-r-3', 'e-ridge-l-3']) {
      const ridge = tfw.find((body) => body.id === id)!
      const side = id.includes('-r-') ? 'r' : 'l'
      const index = Number(id.slice(id.lastIndexOf('-') + 1))
      const station = beachRidgeStations(side, index)[0]
      const localZ = ridge.nested.z + station.z - channel.nested.z
      const sign = side === 'r' ? 1 : -1
      const ridgeYaw = ridge.yaw ?? 0
      const worldX = ridge.nested.x + station.x * Math.cos(ridgeYaw) + station.z * Math.sin(ridgeYaw)
      const wallR = tidalChannelRadiusAt(localZ)
      const channelYaw = channel.yaw ?? 0
      const wallX =
        channel.nested.x +
        sign * wallR * Math.cos(channelYaw) +
        localZ * Math.sin(channelYaw)
      expect(worldX).toBeCloseTo(wallX)
    }

    expect(tfwRidgeShift('e-ridge-r-3')).not.toBeCloseTo(tfwRidgeShift('e-ridge-r-0'))

    expect(channelMesh('tfw')).toBe('tidal')
    expect(channelMesh('wf')).toBe('half')
    expect(beachRidgeMesh('tfw', 'e-ridge-l-2')).toBe('asymmetric')
    expect(beachRidgeMesh('tfw', 'e-ridge-r-2')).toBe('asymmetric')
    expect(beachRidgeMesh('wf', 'e-ridge-r-2')).toBe('symmetric')
    expect(beachRidgeMesh('asym', 'e-ridge-r-2')).toBe('symmetric')
  })
})
