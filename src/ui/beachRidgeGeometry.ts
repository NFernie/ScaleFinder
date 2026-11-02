import * as THREE from 'three'
import { beachRidgeRing, beachRidgeStations, type RidgeCorner, type RidgeStation } from '../core/wfSchematic'

interface CapPoint {
  y: number
  z: number
}

/**
 * Lofted beach-ridge element. Stations are the right-flank ring in +X. The left
 * flank mirrors that mesh in X and flips the winding. End caps are ear-clipped
 * so a diagonal stays inside the section. Index 0 is the most landward ridge.
 */
export function loftRidgeGeometry(stations: RidgeStation[], side: 'l' | 'r'): THREE.BufferGeometry {
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
  appendCap(indices, positions, 0, corners, -1)
  appendCap(indices, positions, (stations.length - 1) * corners, corners, 1)
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

/** Right-flank symmetric loft, mirrored for the left flank. */
export function beachRidgeGeometry(side: 'l' | 'r', index: number): THREE.BufferGeometry {
  return loftRidgeGeometry(beachRidgeStations('r', index), side)
}

function appendCap(
  indices: number[],
  positions: number[],
  offset: number,
  corners: number,
  outwardX: number,
) {
  const ring: CapPoint[] = []
  for (let i = 0; i < corners; i += 1) {
    ring.push({ y: positions[(offset + i) * 3 + 1], z: positions[(offset + i) * 3 + 2] })
  }
  for (const [a, b, c] of earClip(ring)) {
    const nx = normalX(ring[a], ring[b], ring[c])
    if (nx * outwardX < 0) indices.push(offset + a, offset + c, offset + b)
    else indices.push(offset + a, offset + b, offset + c)
  }
}

function normalX(a: CapPoint, b: CapPoint, c: CapPoint): number {
  return (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y)
}

function polygonArea(ring: CapPoint[]): number {
  let area = 0
  for (let i = 0; i < ring.length; i += 1) {
    const next = ring[(i + 1) % ring.length]
    area += ring[i].y * next.z - next.y * ring[i].z
  }
  return area / 2
}

/** Strict interior. A point on an edge is not inside, so a neighbouring vertex does not block an ear. */
function pointInTriangle(p: CapPoint, a: CapPoint, b: CapPoint, c: CapPoint): boolean {
  const ab = normalX(a, b, p)
  const bc = normalX(b, c, p)
  const ca = normalX(c, a, p)
  const hasNeg = ab < -1e-12 || bc < -1e-12 || ca < -1e-12
  const hasPos = ab > 1e-12 || bc > 1e-12 || ca > 1e-12
  if (hasNeg && hasPos) return false
  return Math.abs(ab) > 1e-12 && Math.abs(bc) > 1e-12 && Math.abs(ca) > 1e-12
}

/** Triangles for one end cap. Ears stay inside a concave seaward face. */
function earClip(ring: CapPoint[]): Array<[number, number, number]> {
  const ccw = polygonArea(ring) > 0
  const live = ring.map((_, index) => index)
  const triangles: Array<[number, number, number]> = []
  let guard = ring.length * ring.length
  while (live.length > 3 && guard > 0) {
    guard -= 1
    let clipped = false
    for (let i = 0; i < live.length; i += 1) {
      const prev = live[(i + live.length - 1) % live.length]
      const curr = live[i]
      const next = live[(i + 1) % live.length]
      const turn = normalX(ring[prev], ring[curr], ring[next])
      if (ccw ? turn <= 1e-12 : turn >= -1e-12) continue
      let ear = true
      for (const other of live) {
        if (other === prev || other === curr || other === next) continue
        if (pointInTriangle(ring[other], ring[prev], ring[curr], ring[next])) {
          ear = false
          break
        }
      }
      if (!ear) continue
      triangles.push([prev, curr, next])
      live.splice(i, 1)
      clipped = true
      break
    }
    if (!clipped) break
  }
  if (live.length === 3) triangles.push([live[0], live[1], live[2]])
  return triangles
}

export function ridgeCapLeavesSection(ring: RidgeCorner[]): boolean {
  const area = polygonArea(ring)
  const inside = (y: number, z: number) => {
    let count = false
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      const crosses = a.y > y !== b.y > y
      if (crosses && z < a.z + ((b.z - a.z) * (y - a.y)) / (b.y - a.y)) count = !count
    }
    return count
  }
  const triangles = earClip(ring)
  if (triangles.length !== ring.length - 2) return true
  for (const [a, b, c] of triangles) {
    const y = (ring[a].y + ring[b].y + ring[c].y) / 3
    const z = (ring[a].z + ring[b].z + ring[c].z) / 3
    if (!inside(y, z)) return true
    if (area * normalX(ring[a], ring[b], ring[c]) < 0) return true
  }
  return false
}
