import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

/**
 * Half cylinder along +Z. The flat face is y = 0. The arc hangs to y = −radius.
 * CylinderGeometry leaves the diameter open, so the flat face is a separate quad.
 * The mesh origin is the middle of that flat face.
 */
export function halfChannelGeometry(): THREE.BufferGeometry {
  const radius = CHANNEL_RADIUS
  const half = CHANNEL_LENGTH / 2
  const segments = 24
  const positions: number[] = []
  const indices: number[] = []

  const pushArc = (z: number) => {
    const start = positions.length / 3
    for (let i = 0; i <= segments; i += 1) {
      const theta = -Math.PI / 2 + (i / segments) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    return start
  }
  const land = pushArc(-half)
  const sea = pushArc(half)
  for (let i = 0; i < segments; i += 1) {
    const a = land + i
    const b = land + i + 1
    const c = sea + i + 1
    const d = sea + i
    indices.push(a, b, d, b, c, d)
  }

  const cap = (z: number, outward: 1 | -1) => {
    const start = positions.length / 3
    positions.push(0, 0, z)
    for (let i = 0; i <= segments; i += 1) {
      const theta = -Math.PI / 2 + (i / segments) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    for (let i = 0; i < segments; i += 1) {
      if (outward === 1) indices.push(start, start + i + 1, start + i + 2)
      else indices.push(start, start + i + 2, start + i + 1)
    }
  }
  cap(-half, -1)
  cap(half, 1)

  const flat = positions.length / 3
  positions.push(-radius, 0, -half, radius, 0, -half, radius, 0, half, -radius, 0, half)
  indices.push(flat, flat + 1, flat + 2, flat, flat + 3, flat + 2)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
