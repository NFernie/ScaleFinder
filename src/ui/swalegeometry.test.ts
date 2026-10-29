import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { swaleShape } from '../core/swale'
import { sceneAt } from '../core/wfSchematic'
import { swaleGeometry } from './swalegeometry'

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

describe('swaleGeometry', () => {
  it('builds a closed wedge whose top faces up', () => {
    const shape = swaleShape('wf', sceneAt(0), 'e-swale-l-0')
    const geometry = swaleGeometry(shape)
    const position = geometry.getAttribute('position')
    const index = geometry.getIndex()
    expect(position.count).toBe(shape.landCrest.length * 4)
    expect(index?.count).toBe(shape.indices.length)
    expect(faceNormalY(geometry, 0)).toBeGreaterThan(0)
    const normal = geometry.getAttribute('normal')
    expect(normal.count).toBe(position.count)
  })
})
