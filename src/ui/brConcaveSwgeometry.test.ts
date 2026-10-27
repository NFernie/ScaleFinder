import { describe, expect, it } from 'vitest'
import {
  BR_CONCAVE_SW_BOW,
  BR_CONCAVE_SW_TIP_WIDTH_SCALE,
} from '../core/brConcaveSwPlan'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'
import { brConcaveSwGeometry, brConcaveSwPlanSamples, brConcaveSwStations } from './brConcaveSwgeometry'

describe('brConcaveSwGeometry', () => {
  it('lofts the right-flank bow and mirrors it onto the left flank', () => {
    const stations = brConcaveSwStations('r', 3)
    const corners = beachRidgeRing(stations[0]).length
    const right = brConcaveSwGeometry('r', 3)
    const left = brConcaveSwGeometry('l', 3)
    const rightPos = right.getAttribute('position')
    const leftPos = left.getAttribute('position')
    expect(rightPos.count).toBe(stations.length * corners)
    expect(leftPos.count).toBe(rightPos.count)
    expect(rightPos.getX(0)).toBeGreaterThan(0)
    expect(leftPos.getX(0)).toBeLessThan(0)
    expect(leftPos.getX(0)).toBeCloseTo(-rightPos.getX(0))
    for (let s = 0; s < stations.length; s += 1) {
      const ring = beachRidgeRing(stations[s])
      for (let c = 0; c < corners; c += 1) {
        const i = s * corners + c
        expect(rightPos.getZ(i)).toBeCloseTo(ring[c].z, 5)
      }
    }
    right.dispose()
    left.dispose()
  })

  it('is a symmetrical landward bow with a slight taper at both tips', () => {
    const index = 3
    const standard = beachRidgeStations('r', index)
    const stations = brConcaveSwStations('r', index)
    const midIndex = (n: number) => Math.floor(brConcaveSwStations('r', n).length / 2)
    const channel = stations[0]
    const tip = stations[stations.length - 1]
    const mid = stations[Math.floor(stations.length / 2)]

    expect(channel.x).toBeCloseTo(standard[0].x)
    expect(channel.z).toBeCloseTo(standard[0].z)
    expect(tip.x).toBeCloseTo(standard[standard.length - 1].x)
    expect(tip.z).toBeCloseTo(channel.z)
    expect(mid.z).toBeCloseTo(channel.z - BR_CONCAVE_SW_BOW)
    expect(mid.z).toBeLessThan(channel.z)
    expect(mid.z).toBeLessThan(tip.z)

    const quarter = stations[Math.floor(stations.length / 4)]
    const threeQuarter = stations[Math.floor((stations.length * 3) / 4)]
    expect(channel.z - quarter.z).toBeCloseTo(channel.z - threeQuarter.z)
    expect(channel.z - quarter.z).toBeLessThan(BR_CONCAVE_SW_BOW)
    expect(channel.z - quarter.z).toBeGreaterThan(0)
    expect(brConcaveSwStations('r', 0)[midIndex(0)].z).toBeCloseTo(mid.z)

    expect(channel.halfWidth).toBeCloseTo(standard[0].halfWidth * BR_CONCAVE_SW_TIP_WIDTH_SCALE)
    expect(tip.halfWidth).toBeCloseTo(channel.halfWidth)
    expect(mid.halfWidth).toBeCloseTo(standard[0].halfWidth)
    expect(mid.halfWidth).toBeGreaterThan(channel.halfWidth)
    expect(channel.height).toBeCloseTo(standard[0].height)
  })

  it('keeps the seaward outline landward of the straight chord through the middle', () => {
    const samples = brConcaveSwPlanSamples('r', 2)
    const channel = samples[0]
    const tip = samples[samples.length - 1]
    const mid = samples[Math.floor(samples.length / 2)]
    const chord = (channel.zSea + tip.zSea) / 2
    expect(mid.zSea).toBeLessThan(chord)
    expect(mid.zCentre).toBeLessThan(channel.zCentre)
  })
})
