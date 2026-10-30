import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { SWALE_ALONG, SWALE_FACE, swaleShape } from '../core/swale'
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
  it('builds a closed wedge whose crest edge faces up', () => {
    const shape = swaleShape('wf', sceneAt(0), 'e-swale-l-0')
    const geometry = swaleGeometry(shape)
    const position = geometry.getAttribute('position')
    const index = geometry.getIndex()
    const ring = SWALE_FACE * 2
    expect(position.count).toBe(SWALE_ALONG * ring)
    expect(index?.count).toBe(shape.indices.length)
    let top = -1
    for (let triangle = 0; triangle < (index?.count ?? 0) / 3; triangle += 1) {
      const ids = [0, 1, 2].map((offset) => index!.getX(triangle * 3 + offset))
      if (ids.includes(0) && ids.includes(ring - 1)) {
        top = triangle
        break
      }
    }
    expect(top).toBeGreaterThanOrEqual(0)
    expect(faceNormalY(geometry, top)).toBeGreaterThan(0)
    expect(geometry.getAttribute('normal').count).toBe(position.count)
  })
})
