import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'
import { halfChannelGeometry } from './halfChannelGeometry'

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

describe('halfChannelGeometry', () => {
  it('is a half cylinder with the flat face on top and the arc below', () => {
    const geometry = halfChannelGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    expect(box.min.y).toBeCloseTo(-CHANNEL_RADIUS, 5)
    expect(box.max.y).toBeCloseTo(0, 5)
    expect(box.min.x).toBeCloseTo(-CHANNEL_RADIUS, 5)
    expect(box.max.x).toBeCloseTo(CHANNEL_RADIUS, 5)
    expect(box.min.z).toBeCloseTo(-CHANNEL_LENGTH / 2, 5)
    expect(box.max.z).toBeCloseTo(CHANNEL_LENGTH / 2, 5)

    const position = geometry.getAttribute('position')
    let bottom = 1
    let topCount = 0
    for (let i = 0; i < position.count; i += 1) {
      bottom = Math.min(bottom, position.getY(i))
      if (Math.abs(position.getY(i)) < 1e-6) topCount += 1
    }
    expect(bottom).toBeCloseTo(-CHANNEL_RADIUS, 5)
    expect(topCount).toBeGreaterThan(4)

    const index = geometry.getIndex()
    if (!index) throw new Error('missing index')
    let arcDown = false
    let flatUp = false
    let sea = false
    let land = false
    for (let triangle = 0; triangle < index.count / 3; triangle += 1) {
      const normal = faceNormal(geometry, triangle)
      const a = index.getX(triangle * 3)
      const center = new THREE.Vector3()
        .fromBufferAttribute(position, a)
        .add(new THREE.Vector3().fromBufferAttribute(position, index.getX(triangle * 3 + 1)))
        .add(new THREE.Vector3().fromBufferAttribute(position, index.getX(triangle * 3 + 2)))
        .multiplyScalar(1 / 3)
      if (center.y < -CHANNEL_RADIUS * 0.8 && normal.y < -0.5) arcDown = true
      if (Math.abs(center.y) < 1e-4 && normal.y > 0.9) flatUp = true
      if (center.z > CHANNEL_LENGTH / 2 - 1e-4 && normal.z > 0.9) sea = true
      if (center.z < -CHANNEL_LENGTH / 2 + 1e-4 && normal.z < -0.9) land = true
    }
    expect(arcDown).toBe(true)
    expect(flatUp).toBe(true)
    expect(sea).toBe(true)
    expect(land).toBe(true)
    geometry.dispose()
  })
})
