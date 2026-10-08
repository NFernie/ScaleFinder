import * as THREE from 'three'
import { MOUTH_BAR_SCALE } from '../core/wfSchematic'

function sigmoid01(t: number): number {
  const k = 8
  const raw = (u: number) => 1 / (1 + Math.exp(-k * (u - 0.5)))
  const start = raw(0)
  const end = raw(1)
  return (raw(t) - start) / (end - start)
}

/**
 * Flat oval in plan. Along +Z the sheet follows a sigmoid, so the seaward
 * rim is the lowest part of the bar. Local origin is the middle of the oval.
 */
export function mouthBarGeometry(): THREE.BufferGeometry {
  const rx = MOUTH_BAR_SCALE.x / 2
  const rz = MOUTH_BAR_SCALE.z / 2
  const height = MOUTH_BAR_SCALE.y
  const skin = height * 0.22
  const amplitude = height / 2 - skin
  const rings = 5
  const segments = 24
  const positions: number[] = []
  const indices: number[] = []

  const yCenter = (z: number) => amplitude * (1 - 2 * sigmoid01((z / rz + 1) / 2))
  const push = (x: number, y: number, z: number) => {
    positions.push(x, y, z)
    return positions.length / 3 - 1
  }

  const top: number[][] = []
  const bottom: number[][] = []
  for (let ring = 0; ring <= rings; ring += 1) {
    const radius = ring / rings
    const count = ring === 0 ? 1 : segments
    top[ring] = []
    bottom[ring] = []
    for (let step = 0; step < count; step += 1) {
      const theta = (step / segments) * Math.PI * 2
      const x = radius * rx * Math.cos(theta)
      const z = radius * rz * Math.sin(theta)
      const center = yCenter(z)
      top[ring][step] = push(x, center + skin, z)
      bottom[ring][step] = push(x, center - skin, z)
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
      indices.push(top[ring][step], top[ring][next], top[ring + 1][next], top[ring][step], top[ring + 1][next], top[ring + 1][step])
      indices.push(
        bottom[ring][step],
        bottom[ring + 1][next],
        bottom[ring][next],
        bottom[ring][step],
        bottom[ring + 1][step],
        bottom[ring + 1][next],
      )
    }
  }
  const outer = rings
  for (let step = 0; step < segments; step += 1) {
    const next = (step + 1) % segments
    indices.push(top[outer][step], bottom[outer][step], bottom[outer][next], top[outer][step], bottom[outer][next], top[outer][next])
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
