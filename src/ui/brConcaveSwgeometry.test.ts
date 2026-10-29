import { describe, expect, it } from 'vitest'
import { BR_CONCAVE_SW_BOW, brConcaveSwStations } from '../core/brConcaveSwPlan'
import { brConvexSwStations } from '../core/brConvexSwPlan'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'
import { brConcaveSwGeometry } from './brConcaveSwgeometry'

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
    expect(leftPos.getX(0)).toBeCloseTo(-rightPos.getX(0))
    right.dispose()
    left.dispose()
  })

  it('is a uniform half-height bow, concave toward seaward', () => {
    const index = 3
    const standard = beachRidgeStations('r', index)
    const stations = brConcaveSwStations('r', index)
    const convex = brConvexSwStations('r', index)
    const channel = stations[0]
    const tip = stations[stations.length - 1]
    const mid = stations[Math.floor(stations.length / 2)]
    const radius = Math.abs(tip.x - channel.x) / 2
    const bow = radius / 2

    expect(channel.x).toBeCloseTo(standard[0].x)
    expect(channel.z).toBeCloseTo(standard[0].z)
    expect(tip.x).toBeCloseTo(standard[standard.length - 1].x)
    expect(tip.z).toBeCloseTo(channel.z)
    expect(mid.z).toBeCloseTo(channel.z - bow)
    expect(bow).toBeCloseTo(BR_CONCAVE_SW_BOW)
    expect(mid.z).toBeLessThan(channel.z)
    expect(mid.z - channel.z).toBeCloseTo(-(convex[Math.floor(convex.length / 2)].z - channel.z))

    for (let i = 0; i < stations.length; i += 1) {
      expect(stations[i].x).toBeCloseTo(convex[i].x)
      expect(stations[i].halfWidth).toBeCloseTo(channel.halfWidth)
      expect(stations[i].height).toBeCloseTo(channel.height)
      expect(stations[i].z).toBeLessThanOrEqual(channel.z + 1e-9)
    }
  })
})
