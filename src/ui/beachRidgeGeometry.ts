import * as THREE from 'three'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'

/**
 * Lofted beach-ridge element for one index in the stack. The right flank follows
 * the core stations in +X. The left flank is that same mesh mirrored in X, with
 * winding flipped. Index 0 is the most landward ridge.
 * Another schematic can import this mesh and place it; this file does not
 * decide where the ridge sits.
 */
export function beachRidgeGeometry(side: 'l' | 'r', index: number): THREE.BufferGeometry {
  const stations = beachRidgeStations('r', index)
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
