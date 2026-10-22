import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
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
    expect(asymmetric.at(-1)!.zCentre).toBeCloseTo(symmetric.at(-1)!.zCentre)
    const mid = Math.floor(symmetric.length / 2)
    expect(asymmetric[mid].zSea).toBeGreaterThan(symmetric[mid].zSea)
    const symStandard = beachRidgeStations('r', index)
    const asymStandard = asymmetricBeachRidgeStations('r', index)
    expect(asymStandard[0].x).toBe(symStandard[0].x)
    expect(asymStandard[0].halfWidth).toBeCloseTo(symStandard[0].halfWidth)
    expect(asymStandard[0].height).toBeCloseTo(symStandard[0].height)
  })
})
