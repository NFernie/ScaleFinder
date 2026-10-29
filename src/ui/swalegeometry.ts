import * as THREE from 'three'
import type { SwaleShape } from '../core/swale'

/**
 * Green wedge between two beach-ridge crests and the water-slab top.
 * Vertices are already in the body’s local frame. One mesh serves every loft;
 * the crest samples carry the symmetric, asymmetric, or convex-seaward curve.
 */
export function swaleGeometry(shape: SwaleShape): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.positions, 3))
  geometry.setIndex(shape.indices)
  geometry.computeVertexNormals()
  return geometry
}
