import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

/** Cross-section segments. Matches the tidal channel arc. */
const ARC_SEGMENTS = 24

/** Stations along +Z so the deck is a strip of quads, not one span. */
const LENGTH_RINGS = 16

/**
 * Half cylinder along +Z. The flat face is y = 0. The arc hangs to y = −radius.
 * Built the same way as the tidal funnel: an arc ring at each station, outward
 * wall strips, a flat deck strip between each pair of rings, and end caps that
 * share those ring vertices. The mesh origin is the middle of the flat face.
 */
export function halfChannelGeometry(length = CHANNEL_LENGTH): THREE.BufferGeometry {
  const radius = CHANNEL_RADIUS
  const half = length / 2
  const positions: number[] = []
  const indices: number[] = []
  const ringStarts: number[] = []
  const stations: number[] = []
  for (let i = 0; i <= LENGTH_RINGS; i += 1) {
    stations.push(-half + (length * i) / LENGTH_RINGS)
  }

  const pushArc = (z: number) => {
    const start = positions.length / 3
    ringStarts.push(start)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    return start
  }

  for (const z of stations) pushArc(z)

  for (let ring = 0; ring < stations.length - 1; ring += 1) {
    const a = ringStarts[ring]
    const b = ringStarts[ring + 1]
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      const a0 = a + i
      const a1 = a + i + 1
      const b0 = b + i
      const b1 = b + i + 1
      indices.push(a0, a1, b0, a1, b1, b0)
    }
  }

  const cap = (ringStart: number, z: number, outward: 1 | -1) => {
    const center = positions.length / 3
    positions.push(0, 0, z)
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      const a = ringStart + i
      const b = ringStart + i + 1
      if (outward === 1) indices.push(center, a, b)
      else indices.push(center, b, a)
    }
  }
  cap(ringStarts[0], stations[0], -1)
  cap(ringStarts[ringStarts.length - 1], stations[stations.length - 1], 1)

  for (let ring = 0; ring < stations.length - 1; ring += 1) {
    const left = ringStarts[ring]
    const right = ringStarts[ring] + ARC_SEGMENTS
    const nextLeft = ringStarts[ring + 1]
    const nextRight = ringStarts[ring + 1] + ARC_SEGMENTS
    indices.push(left, nextRight, right, left, nextLeft, nextRight)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
