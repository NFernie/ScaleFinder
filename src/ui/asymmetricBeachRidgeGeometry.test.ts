import { describe, expect, it } from 'vitest'
import { ASYM_RIDGE_BOW, ASYM_RIDGE_CREST } from '../core/asymmetricBeachRidgePlan'
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

  it('bows seaward in the channel half, then eases onto the symmetric outer tip', () => {
    const index = 3
    const symmetric = beachRidgeStations('l', index)
    const stations = asymmetricBeachRidgeStations('l', index)
    const channel = stations[0]
    const tip = stations[stations.length - 1]
    const symTip = symmetric[symmetric.length - 1]
    expect(channel.z).toBeCloseTo(symmetric[0].z)
    expect(channel.x).toBeCloseTo(symmetric[0].x)
    expect(tip.x).toBeCloseTo(symTip.x)
    expect(tip.z).toBeCloseTo(symTip.z)
    expect(channel.x).toBeGreaterThan(tip.x)

    const span = channel.x - tip.x
    const along = (station: { x: number }) => (channel.x - station.x) / span
    const chordZ = (t: number) => channel.z + (tip.z - channel.z) * t
    const offset = stations.map((station) => station.z - chordZ(along(station)))
    let crest = 0
    for (let i = 1; i < offset.length; i += 1) {
      if (offset[i] > offset[crest]) crest = i
    }
    const crestT = along(stations[crest])
    expect(crestT).toBeGreaterThan(0.2)
    expect(crestT).toBeLessThan(0.5)
    expect(Math.abs(crestT - ASYM_RIDGE_CREST)).toBeLessThan(0.04)
    expect(offset[crest]).toBeGreaterThan(ASYM_RIDGE_BOW * 0.9)
    expect(stations[crest].z).toBeGreaterThan(channel.z)
    expect(Math.abs(stations[crest].x - channel.x)).toBeLessThan(Math.abs(stations[crest].x - tip.x))

    for (let i = 1; i <= crest; i += 1) expect(offset[i]).toBeGreaterThan(offset[i - 1] - 1e-6)
    for (let i = crest + 1; i < stations.length; i += 1) expect(stations[i].z).toBeLessThan(stations[i - 1].z)

    const symAtTip = symmetric[symmetric.length - 2]
    const nearTip = stations[stations.length - 2]
    const symSlope = (symTip.z - symAtTip.z) / (symTip.x - symAtTip.x)
    const asymSlope = (tip.z - nearTip.z) / (tip.x - nearTip.x)
    expect(asymSlope).toBeCloseTo(symSlope, 1)
  })
})
