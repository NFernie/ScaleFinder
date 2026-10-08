import * as THREE from 'three'
import { MOUTH_BAR_SCALE, mouthBarBaseOffset } from '../core/wfSchematic'

/**
 * Half spheroid. The flat base follows an exaggerated sigmoid along +Z, so
 * the seaward rim is the low end. The dome sits on that base, curve upward.
 * Local Y is 0 on the landward rim of the base.
 */
export function mouthBarGeometry(): THREE.BufferGeometry {
  const rx = MOUTH_BAR_SCALE.x / 2
  const rz = MOUTH_BAR_SCALE.z / 2
  const height = MOUTH_BAR_SCALE.y
  const rings = 8
  const segments = 32
  const positions: number[] = []
  const indices: number[] = []
  const add = (x: number, y: number, z: number) => {
    positions.push(x, y, z)
    return positions.length / 3 - 1
  }

  const ringPoint = (ring: number, step: number, dome: boolean) => {
    const v = ring / rings
    const radius = Math.sin((v * Math.PI) / 2)
    const theta = ring === 0 ? 0 : (step / segments) * Math.PI * 2
    const x = radius * rx * Math.cos(theta)
    const z = radius * rz * Math.sin(theta)
    const lift = dome ? Math.cos((v * Math.PI) / 2) * height : 0
    return add(x, mouthBarBaseOffset(z, rz) + lift, z)
  }

  const top: number[][] = []
  const bottom: number[][] = []
  for (let ring = 0; ring <= rings; ring += 1) {
    const count = ring === 0 ? 1 : segments
    top[ring] = []
    bottom[ring] = []
    for (let step = 0; step < count; step += 1) {
      top[ring][step] = ringPoint(ring, step, true)
      bottom[ring][step] = ringPoint(ring, step, false)
    }
  }

  for (let step = 0; step < segments; step += 1) {
    const next = (step + 1) % segments
    indices.push(top[0][0], top[1][next], top[1][step])
    indices.push(bottom[0][0], bottom[1][step], bottom[1][next])
  }
  for (let ring = 1; ring < rings; ring += 1) {
    for (let step = 0; step < segments; step += 1) {
      const next = (step + 1) % segments
      indices.push(top[ring][step], top[ring][next], top[ring + 1][next])
      indices.push(top[ring][step], top[ring + 1][next], top[ring + 1][step])
      indices.push(bottom[ring][step], bottom[ring + 1][next], bottom[ring][next])
      indices.push(bottom[ring][step], bottom[ring + 1][step], bottom[ring + 1][next])
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
