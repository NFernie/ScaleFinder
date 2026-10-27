import { describe, expect, it } from 'vitest'
import { beachRidgeMesh, channelMesh } from './schematicScene'
import { tidalChannelRadiusAt } from './tidalChannel'
import { TFW_ECS_ANCHOR, sceneAt as tfwSceneAt, tfwRidgeShift } from './tfwEcsSchematic'
import { beachRidgeStations, sceneAt as wfSceneAt } from './wfSchematic'

describe('tfwEcsSchematic', () => {
  it('keeps the Wf stack, swaps in the tidal channel, and steps both ridge flanks out to the funnel', () => {
    expect(TFW_ECS_ANCHOR).toEqual({ lat: -19.984295231442236, lng: 119.165775381814 })
    const tfw = tfwSceneAt(0)
    const wf = wfSceneAt(0)
    expect(tfw.map((body) => body.id)).toEqual(wf.map((body) => body.id))
    expect(tfw.find((body) => body.id === 'ecs')?.name).toBe('Tfw element complex set')

    for (const body of tfw) {
      const match = wf.find((item) => item.id === body.id)
      expect(body.yaw).toEqual(match?.yaw)
      expect(body.parentId).toEqual(match?.parentId)
      expect(body.position.y).toBeCloseTo(match?.position.y ?? 0)
      expect(body.position.z).toBeCloseTo(match?.position.z ?? 0)
      if (body.kind === 'beach-ridge') {
        expect(body.position.x).toBeCloseTo((match?.position.x ?? 0) + tfwRidgeShift(body.id))
      } else {
        expect(body.position.x).toBeCloseTo(match?.position.x ?? 0)
      }
    }

    const channel = tfw.find((body) => body.id === 'e-channel')!
    for (const id of ['e-ridge-r-0', 'e-ridge-r-3', 'e-ridge-l-3']) {
      const ridge = tfw.find((body) => body.id === id)!
      const side = id.includes('-r-') ? 'r' : 'l'
      const index = Number(id.slice(id.lastIndexOf('-') + 1))
      const station = beachRidgeStations(side, index)[0]
      const localZ = ridge.nested.z + station.z - channel.nested.z
      const sign = side === 'r' ? 1 : -1
      expect(ridge.position.x + station.x).toBeCloseTo(sign * tidalChannelRadiusAt(localZ))
    }

    const rightLand = tfw.find((body) => body.id === 'e-ridge-r-0')!
    const rightSea = tfw.find((body) => body.id === 'e-ridge-r-3')!
    expect(rightSea.position.x).toBeGreaterThan(rightLand.position.x)
    expect(tfw.find((body) => body.id === 'e-ridge-l-3')!.position.x).toBeLessThan(
      tfw.find((body) => body.id === 'e-ridge-l-0')!.position.x,
    )

    expect(channelMesh('tfw')).toBe('tidal')
    expect(channelMesh('wf')).toBe('half')
    expect(beachRidgeMesh('tfw', 'e-ridge-l-2')).toBe('asymmetric')
    expect(beachRidgeMesh('tfw', 'e-ridge-r-2')).toBe('asymmetric')
    expect(beachRidgeMesh('wf', 'e-ridge-r-2')).toBe('symmetric')
    expect(beachRidgeMesh('asym', 'e-ridge-r-2')).toBe('symmetric')
  })
})
