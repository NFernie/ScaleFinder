import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { shaleShape } from '../core/shale'
import { sceneAt } from '../core/wfSchematic'
import { brShaleGeometry } from './BRShaleGeometry'

function faceNormalY(geometry: THREE.BufferGeometry, triangle: number): number {
  const index = geometry.getIndex()
  const position = geometry.getAttribute('position')
  if (!index) throw new Error('missing index')
  const a = index.getX(triangle * 3)
  const b = index.getX(triangle * 3 + 1)
  const c = index.getX(triangle * 3 + 2)
  const va = new THREE.Vector3().fromBufferAttribute(position, a)
  const vb = new THREE.Vector3().fromBufferAttribute(position, b)
  const vc = new THREE.Vector3().fromBufferAttribute(position, c)
  return vb.clone().sub(va).cross(vc.clone().sub(va)).y
}

describe('BRShaleGeometry', () => {
  it('builds a closed wedge whose top edge faces up', () => {
    const shape = shaleShape('wf', sceneAt(0), 'e-shale-l-0')
    const geometry = brShaleGeometry(shape)
    const position = geometry.getAttribute('position')
    const index = geometry.getIndex()
    expect(position.count).toBe(shape.positions.length / 3)
    expect(index?.count).toBe(shape.indices.length)
    let top = 0
    let topY = -Infinity
    for (let triangle = 0; triangle < (index?.count ?? 0) / 3; triangle += 1) {
      const ids = [0, 1, 2].map((offset) => index!.getX(triangle * 3 + offset))
      const average = ids.reduce((sum, id) => sum + position.getY(id), 0) / 3
      if (average > topY) {
        topY = average
        top = triangle
      }
    }
    expect(faceNormalY(geometry, top)).toBeGreaterThan(0)
    expect(geometry.getAttribute('normal').count).toBe(position.count)
  })
})
