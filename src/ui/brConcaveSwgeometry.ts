import * as THREE from 'three'
import { BR_CONCAVE_SW_BOW, brConcaveSwStations } from '../core/brConcaveSwPlan'
import { beachRidgeRing } from '../core/wfSchematic'

export { BR_CONCAVE_SW_BOW, brConcaveSwStations }

/**
 * Loft one concave-seaward beach ridge. The right flank follows the core
 * stations in +X. The left flank is that mesh mirrored in X, with winding
 * flipped. The Tfw scene draws a right-flank complex with this loft. The
 * nested pose stays with the scene.
 */
export function brConcaveSwGeometry(side: 'l' | 'r', index: number): THREE.BufferGeometry {
  const stations = brConcaveSwStations('r', index)
  const positions: number[] = []
  const indices: number[] = []
  for (const station of stations) {
    for (const corner of beachRidgeRing(station)) {
      positions.push(corner.x, corner.y, corner.z)
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }
  const corners = beachRidgeRing(stations[0]).length
  for (let s = 0; s < stations.length - 1; s += 1) {
    const a = s * corners
    const b = (s + 1) * corners
    for (let i = 0; i < corners; i += 1) {
      const next = (i + 1) % corners
      quad(a + i, b + i, b + next, a + next)
    }
  }
  for (let i = 1; i < corners - 1; i += 1) indices.push(0, i, i + 1)
  const tip = (stations.length - 1) * corners
  for (let i = corners - 1; i >= 2; i -= 1) indices.push(tip, tip + i, tip + i - 1)
  if (side === 'l') {
    for (let i = 0; i < positions.length; i += 3) positions[i] = -positions[i]
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
