import { describe, expect, it } from 'vitest'
import {
  ASYM_RIDGE_CHANNEL_SEAWARD_DEG,
  ASYM_RIDGE_SEAWARD_RUN,
} from '../core/asymmetricBeachRidgePlan'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'
import {
  asymmetricBeachRidgeGeometry,
  asymmetricBeachRidgePlanSamples,
  asymmetricBeachRidgeStations,
  symmetricBeachRidgePlanSamples,
} from './asymmetricBeachRidgeGeometry'

describe('asymmetricBeachRidgeGeometry', () => {
  it('lofts asymmetric stations with the same ring layout as the symmetric ridge', () => {
    const index = 3
    const stations = asymmetricBeachRidgeStations('r', index)
    const corners = beachRidgeRing(stations[0]).length
    const geometry = asymmetricBeachRidgeGeometry('r', index)
    const position = geometry.getAttribute('position')
    expect(position.count).toBe(stations.length * corners)
    for (let s = 0; s < stations.length; s += 1) {
      const ring = beachRidgeRing(stations[s])
      for (let c = 0; c < corners; c += 1) {
        const i = s * corners + c
        expect(position.getX(i)).toBeCloseTo(ring[c].x, 5)
        expect(position.getY(i)).toBeCloseTo(ring[c].y, 5)
        expect(position.getZ(i)).toBeCloseTo(ring[c].z, 5)
      }
    }
    geometry.dispose()
  })

  it('keeps channel and tip Z on the centreline but bulges the seaward edge convex', () => {
    const index = 3
    const symmetric = symmetricBeachRidgePlanSamples('r', index)
    const asymmetric = asymmetricBeachRidgePlanSamples('r', index)
    expect(asymmetric[0].zCentre).toBeCloseTo(symmetric[0].zCentre)
    expect(asymmetric[asymmetric.length - 1].zCentre).toBeCloseTo(symmetric[symmetric.length - 1].zCentre)
    const mid = symmetric[Math.floor(symmetric.length / 2)]
    const asymMid = asymmetric.reduce((best, sample) =>
      Math.abs(sample.x - mid.x) < Math.abs(best.x - mid.x) ? sample : best,
    )
    expect(asymMid.zSea).toBeGreaterThan(mid.zSea)
    const symStandard = beachRidgeStations('r', index)
    const asymStandard = asymmetricBeachRidgeStations('r', index)
    expect(asymStandard[0].x).toBe(symStandard[0].x)
    expect(asymStandard[0].halfWidth).toBeCloseTo(symStandard[0].halfWidth)
    expect(asymStandard[0].height).toBeCloseTo(symStandard[0].height)
  })

  it('heads 5° seaward from the channel end, then turns landward to the same outer tip', () => {
    const index = 3
    const symmetric = beachRidgeStations('l', index)
    const stations = asymmetricBeachRidgeStations('l', index)
    const channel = stations[0]
    const tip = stations[stations.length - 1]
    const symTip = symmetric[symmetric.length - 1]
    expect(channel.z).toBeCloseTo(symmetric[0].z)
    expect(tip.x).toBeCloseTo(symTip.x)
    expect(tip.z).toBeCloseTo(symTip.z)
    expect(channel.x).toBeGreaterThan(tip.x)

    const span = Math.abs(tip.x - channel.x)
    const bendAlong = ASYM_RIDGE_SEAWARD_RUN * span
    const bend = stations.find((station) => Math.abs(Math.abs(station.x - channel.x) - bendAlong) < 1e-8)
    expect(bend).toBeDefined()
    const seaward = Math.tan((ASYM_RIDGE_CHANNEL_SEAWARD_DEG * Math.PI) / 180)
    expect(bend!.z).toBeCloseTo(channel.z + bendAlong * seaward)
    expect(bend!.z).toBeGreaterThan(channel.z)

    const early = stations[1]
    const earlyAlong = Math.abs(early.x - channel.x)
    expect(earlyAlong).toBeLessThan(bendAlong)
    const earlyDeg = (Math.atan2(early.z - channel.z, earlyAlong) * 180) / Math.PI
    expect(earlyDeg).toBeCloseTo(ASYM_RIDGE_CHANNEL_SEAWARD_DEG, 5)

    const after = stations[stations.indexOf(bend!) + 1]
    const afterAlong = Math.abs(after.x - channel.x)
    const landwardDeg = (Math.atan2(after.z - bend!.z, afterAlong - bendAlong) * 180) / Math.PI
    expect(landwardDeg).toBeLessThan(0)
    expect(tip.z).toBeLessThan(bend!.z)
  })
})
