import { describe, expect, it } from 'vitest'
import { BR_CONCAVE_SW_BOW } from '../core/brConcaveSwPlan'
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

  it('is a uniform semicircular U, concave toward seaward', () => {
    const index = 3
    const standard = beachRidgeStations('r', index)
    const stations = brConcaveSwStations('r', index)
    const channel = stations[0]
    const tip = stations[stations.length - 1]
    const mid = stations[Math.floor(stations.length / 2)]
    const radius = Math.abs(tip.x - channel.x) / 2
    const midX = (channel.x + tip.x) / 2

    expect(channel.x).toBeCloseTo(standard[0].x)
    expect(channel.z).toBeCloseTo(standard[0].z)
    expect(tip.x).toBeCloseTo(standard[standard.length - 1].x)
    expect(tip.z).toBeCloseTo(channel.z)
    expect(mid.x).toBeCloseTo(midX)
    expect(mid.z).toBeCloseTo(channel.z - radius)
    expect(radius).toBeCloseTo(BR_CONCAVE_SW_BOW)
    expect(mid.z).toBeLessThan(channel.z)

    for (const station of stations) {
      const dx = station.x - midX
      const dz = channel.z - station.z
      expect(dx * dx + dz * dz).toBeCloseTo(radius * radius, 4)
      expect(station.z).toBeLessThanOrEqual(channel.z + 1e-9)
      expect(station.halfWidth).toBeCloseTo(channel.halfWidth)
      expect(station.height).toBeCloseTo(channel.height)
    }

    const quarter = stations[Math.floor(stations.length / 4)]
    const threeQuarter = stations[Math.floor((stations.length * 3) / 4)]
    expect(channel.z - quarter.z).toBeCloseTo(channel.z - threeQuarter.z)
    expect(midX - quarter.x).toBeCloseTo(threeQuarter.x - midX)
    expect(brConcaveSwStations('r', 0)[Math.floor(stations.length / 2)].z).toBeCloseTo(mid.z)
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
