import * as THREE from 'three'
import type { SwaleShape } from '../core/swale'

/**
 * Green wedge in the open gap between two beach ridges.
 * Vertices are already in the body’s local frame. One mesh serves every loft;
 * the hypotenuse samples carry the symmetric, asymmetric, or convex-seaward curve.
 */
export function swaleGeometry(shape: SwaleShape): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.positions, 3))
  geometry.setIndex(shape.indices)
  geometry.computeVertexNormals()
  return geometry
}
