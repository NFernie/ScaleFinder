import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { TIDAL_CHANNEL_TAPER_LENGTH_SCALE, tidalChannelDepthAt, tidalChannelShallowDepth } from '../core/tidalChannel'
import { CHANNEL_LENGTH, CHANNEL_RADIUS, channelSpan, landwardMouthBarBaseY } from '../core/wfSchematic'
import {
  TIDAL_CHANNEL_LENGTH_SCALE,
  TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO,
  tidalChannelGeometry,
  tidalChannelPlanSamples,
  tidalChannelRadiusAt,
  tidalChannelSpan,
} from './tidalChannelGeometry'

function faceNormal(geometry: THREE.BufferGeometry, triangle: number): THREE.Vector3 {
  const index = geometry.getIndex()
  const position = geometry.getAttribute('position')
  if (!index) throw new Error('missing index')
  const a = index.getX(triangle * 3)
  const b = index.getX(triangle * 3 + 1)
  const c = index.getX(triangle * 3 + 2)
  const va = new THREE.Vector3().fromBufferAttribute(position, a)
  const vb = new THREE.Vector3().fromBufferAttribute(position, b)
  const vc = new THREE.Vector3().fromBufferAttribute(position, c)
  return vb.clone().sub(va).cross(vc.clone().sub(va)).normalize()
}

describe('tidalChannelGeometry', () => {
  it('holds landward width, then flares earlier and concave to ten times the width', () => {
    const { landZ, seaZ, taperZ, length } = tidalChannelSpan()
    const landRadius = CHANNEL_RADIUS
    const seaRadius = landRadius * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO

    expect(length).toBeCloseTo(CHANNEL_LENGTH * TIDAL_CHANNEL_LENGTH_SCALE)
    expect(seaZ).toBeCloseTo(CHANNEL_LENGTH / 2)
    expect(landZ).toBeLessThan(taperZ)
    expect(taperZ).toBeCloseTo(seaZ - CHANNEL_LENGTH * TIDAL_CHANNEL_TAPER_LENGTH_SCALE)
    expect(taperZ).toBeLessThan(-CHANNEL_LENGTH / 2)

    expect(tidalChannelRadiusAt(landZ)).toBeCloseTo(landRadius)
    expect(tidalChannelRadiusAt(taperZ)).toBeCloseTo(landRadius)
    expect(tidalChannelRadiusAt(seaZ)).toBeCloseTo(seaRadius)

    const midFlare = (taperZ + seaZ) / 2
    const linear = landRadius + (seaRadius - landRadius) * 0.5
    expect(tidalChannelRadiusAt(midFlare)).toBeLessThan(linear)

    const geometry = tidalChannelGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    expect(box.min.z).toBeCloseTo(landZ, 4)
    expect(box.max.z).toBeCloseTo(seaZ, 4)
    expect(box.max.y).toBeCloseTo(0, 4)
    expect(box.min.x).toBeCloseTo(-seaRadius, 3)
    expect(box.max.x).toBeCloseTo(seaRadius, 3)

    const plan = tidalChannelPlanSamples()
    expect(plan[0].z).toBeCloseTo(landZ)
    expect(plan[plan.length - 1].z).toBeCloseTo(seaZ)
    expect(plan[0].xRight - plan[0].xLeft).toBeCloseTo(2 * landRadius, 5)
    const atTaper = plan.find((ring) => Math.abs(ring.z - taperZ) < 1e-8)
    expect(atTaper).toBeDefined()
    expect(atTaper!.xRight - atTaper!.xLeft).toBeCloseTo(2 * landRadius, 5)
    expect(plan[plan.length - 1].xRight - plan[plan.length - 1].xLeft).toBeCloseTo(2 * seaRadius, 5)

    geometry.dispose()
  })

  it('holds a shallow curved base from the flare start to the seaward tip', () => {
    const { landZ, seaZ, taperZ } = tidalChannelSpan()
    const depth = tidalChannelShallowDepth()
    const floorY = landwardMouthBarBaseY() - channelSpan().flatY

    expect(depth).toBeGreaterThan(0)
    expect(depth).toBeLessThan(tidalChannelRadiusAt(seaZ))
    expect(floorY).toBeCloseTo(-depth)
    expect(tidalChannelDepthAt(landZ)).toBeCloseTo(CHANNEL_RADIUS)
    expect(tidalChannelDepthAt(taperZ - 1e-6)).toBeCloseTo(CHANNEL_RADIUS)
    expect(tidalChannelDepthAt(taperZ)).toBeCloseTo(depth)
    expect(tidalChannelDepthAt((taperZ + seaZ) / 2)).toBeCloseTo(depth)
    expect(tidalChannelDepthAt(seaZ)).toBeCloseTo(depth)

    const geometry = tidalChannelGeometry()
    const position = geometry.getAttribute('position')
    const bottomAt = (z: number) => {
      let bottom = 0
      for (let i = 0; i < position.count; i += 1) {
        if (Math.abs(position.getZ(i) - z) > 1e-6) continue
        if (Math.abs(position.getX(i)) > 1e-4) continue
        bottom = Math.min(bottom, position.getY(i))
      }
      return bottom
    }
    const ringZ = new Set<number>()
    for (let i = 0; i < position.count; i += 1) ringZ.add(position.getZ(i))
    const midRing = [...ringZ].filter((z) => z > taperZ && z < seaZ).sort((a, b) => a - b)
    expect(midRing.length).toBeGreaterThan(0)
    expect(bottomAt(landZ)).toBeCloseTo(-CHANNEL_RADIUS, 4)
    expect(bottomAt(taperZ)).toBeCloseTo(floorY, 4)
    expect(bottomAt(midRing[Math.floor(midRing.length / 2)])).toBeCloseTo(floorY, 4)
    expect(bottomAt(seaZ)).toBeCloseTo(floorY, 4)
    geometry.dispose()
  })

  it('winds the orange shell outward across the full length and seaward width', () => {
    const { landZ, seaZ } = tidalChannelSpan()
    const seaRadius = CHANNEL_RADIUS * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
    const geometry = tidalChannelGeometry()
    const index = geometry.getIndex()
    const position = geometry.getAttribute('position')
    if (!index) throw new Error('missing index')
    let flatUp = false
    let arcOut = false
    let seaCap = false
    let landCap = false
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (let i = 0; i < position.count; i += 1) {
      minX = Math.min(minX, position.getX(i))
      maxX = Math.max(maxX, position.getX(i))
      minZ = Math.min(minZ, position.getZ(i))
      maxZ = Math.max(maxZ, position.getZ(i))
    }
    expect(minX).toBeCloseTo(-seaRadius, 4)
    expect(maxX).toBeCloseTo(seaRadius, 4)
    expect(minZ).toBeCloseTo(landZ, 4)
    expect(maxZ).toBeCloseTo(seaZ, 4)
    for (let triangle = 0; triangle < index.count / 3; triangle += 1) {
      const normal = faceNormal(geometry, triangle)
      const center = new THREE.Vector3()
      for (let k = 0; k < 3; k += 1) {
        center.add(new THREE.Vector3().fromBufferAttribute(position, index.getX(triangle * 3 + k)))
      }
      center.multiplyScalar(1 / 3)
      if (Math.abs(center.y) < 1e-4 && normal.y > 0.9) flatUp = true
      if (center.y < -CHANNEL_RADIUS * 0.8 && normal.y < -0.5) arcOut = true
      if (center.z > seaZ - 1e-3 && normal.z > 0.9) seaCap = true
      if (center.z < landZ + 1e-3 && normal.z < -0.9) landCap = true
    }
    expect(flatUp).toBe(true)
    expect(arcOut).toBe(true)
    expect(seaCap).toBe(true)
    expect(landCap).toBe(true)
    geometry.dispose()
  })

  it('keeps a flat top along y = 0 on the centreline', () => {
    const geometry = tidalChannelGeometry()
    const position = geometry.getAttribute('position')
    let flatCount = 0
    for (let i = 0; i < position.count; i += 1) {
      if (Math.abs(position.getY(i)) < 1e-5 && Math.abs(position.getX(i)) < 1e-5) flatCount += 1
    }
    expect(flatCount).toBeGreaterThan(0)
    geometry.dispose()
  })
})
