import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'
import { beachRidgeGeometry } from './beachRidgeGeometry'

function faceNormal(geometry: THREE.BufferGeometry, triangle: number): THREE.Vector3 {
  const index = geometry.getIndex()
  const position = geometry.getAttribute('position')
  if (!index) throw new Error('missing index')
  const a = index.getX(triangle * 3)
  const b = index.getX(triangle * 3 + 1)
  const c = index.getX(triangle * 3 + 2)
  const va = new THREE.Vector3().fromBufferAttribute(position, a)
  const vb = new THREE.Vector3().fromBufferAttribute(position, b)
  const vc = new THREE.Vector3().fromBufferAttribute(position, c)
  return vb.clone().sub(va).cross(vc.clone().sub(va)).normalize()
}

describe('beachRidgeGeometry', () => {
  it('lofts the right-flank rings and mirrors that mesh onto the left flank', () => {
    const stations = beachRidgeStations('r', 3)
    const corners = beachRidgeRing(stations[0]).length
    const right = beachRidgeGeometry('r', 3)
    const left = beachRidgeGeometry('l', 3)
    const rightPos = right.getAttribute('position')
    const leftPos = left.getAttribute('position')

    expect(rightPos.count).toBe(stations.length * corners)
    expect(leftPos.count).toBe(rightPos.count)
    expect(rightPos.getX(0)).toBeGreaterThan(0)
    expect(leftPos.getX(0)).toBeLessThan(0)

    for (let s = 0; s < stations.length; s += 1) {
      const ring = beachRidgeRing(stations[s])
      expect(ring).toHaveLength(corners)
      for (let c = 0; c < corners; c += 1) {
        const i = s * corners + c
        expect(rightPos.getX(i)).toBeCloseTo(ring[c].x, 5)
        expect(rightPos.getY(i)).toBeCloseTo(ring[c].y, 5)
        expect(rightPos.getZ(i)).toBeCloseTo(ring[c].z, 5)
        expect(leftPos.getX(i)).toBeCloseTo(-ring[c].x, 5)
        expect(leftPos.getY(i)).toBeCloseTo(ring[c].y, 5)
        expect(leftPos.getZ(i)).toBeCloseTo(ring[c].z, 5)
      }
    }

    const rightIndex = right.getIndex()
    const leftIndex = left.getIndex()
    if (!rightIndex || !leftIndex) throw new Error('missing index')
    expect(leftIndex.count).toBe(rightIndex.count)
    for (let triangle = 0; triangle < rightIndex.count; triangle += 3) {
      expect(leftIndex.getX(triangle)).toBe(rightIndex.getX(triangle))
      expect(leftIndex.getX(triangle + 1)).toBe(rightIndex.getX(triangle + 2))
      expect(leftIndex.getX(triangle + 2)).toBe(rightIndex.getX(triangle + 1))
    }

    const rightNormal = faceNormal(right, 0)
    const leftNormal = faceNormal(left, 0)
    expect(leftNormal.x).toBeCloseTo(-rightNormal.x, 5)
    expect(leftNormal.y).toBeCloseTo(rightNormal.y, 5)
    expect(leftNormal.z).toBeCloseTo(rightNormal.z, 5)

    right.dispose()
    left.dispose()
  })
})
