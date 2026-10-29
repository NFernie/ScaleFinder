import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

/**
 * Half cylinder along +Z. The flat face is y = 0. The arc hangs to y = −radius.
 * Arc rings share vertices with the end caps and the flat lid so every face
 * winds outward and stays visible at grazing angles (no duplicate rim).
 * The mesh origin is the middle of that flat face.
 */
export function halfChannelGeometry(length = CHANNEL_LENGTH): THREE.BufferGeometry {
  const radius = CHANNEL_RADIUS
  const half = length / 2
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
    const a0 = land + i
    const a1 = land + i + 1
    const b0 = sea + i
    const b1 = sea + i + 1
    indices.push(a0, a1, b0, a1, b1, b0)
  }

  const leftLand = land
  const rightLand = land + segments
  const leftSea = sea
  const rightSea = sea + segments
  indices.push(leftLand, rightLand, rightSea, leftLand, leftSea, rightSea)

  const cap = (ringStart: number, z: number, outward: 1 | -1) => {
    const center = positions.length / 3
    positions.push(0, 0, z)
    for (let i = 0; i < segments; i += 1) {
      const a = ringStart + i
      const b = ringStart + i + 1
      if (outward === 1) indices.push(center, a, b)
      else indices.push(center, b, a)
    }
  }
  cap(land, -half, -1)
  cap(sea, half, 1)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
