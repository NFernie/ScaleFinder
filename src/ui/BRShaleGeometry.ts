import * as THREE from 'three'
import type { ShaleShape } from '../core/shale'

/**
 * Stone wedge under the swale, from the swale underside down the facing
 * hypotenuses to the ridge bases, or higher where those faces meet. Vertices
 * are already in the body’s local frame. One mesh serves every loft.
 */
export function brShaleGeometry(shape: ShaleShape): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.positions, 3))
  geometry.setIndex(shape.indices)
  geometry.computeVertexNormals()
  return geometry
}
