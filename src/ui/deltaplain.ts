import * as THREE from 'three'
import type { DeltaPlainShape } from '../core/deltaplain'

/** Green opaque sheet from {@link deltaPlainShape}. Vertices are already in the body's local frame. */
export function deltaPlainGeometry(shape: DeltaPlainShape): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.positions, 3))
  if (shape.indices.length > 0) geometry.setIndex(shape.indices)
  geometry.computeVertexNormals()
  return geometry
}
