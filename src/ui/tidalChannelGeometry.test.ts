import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  TIDAL_CHANNEL_DIP_ANGLE_SCALE,
  TIDAL_CHANNEL_LANDWARD_TURN_RAD,
  TIDAL_CHANNEL_OPACITY,
  TIDAL_CHANNEL_TAPER_LENGTH_SCALE,
  tidalChannelDepthAt,
  tidalChannelFrameAt,
  tidalChannelReferenceDepth,
} from '../core/tidalChannel'
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

    const tip = tidalChannelFrameAt(landZ)
    const joint = tidalChannelFrameAt(taperZ)
    const run = Math.hypot(tip.x - joint.x, tip.z - joint.z)
    expect(run).toBeCloseTo(taperZ - landZ, 6)
    expect((tip.x - joint.x) / run).toBeCloseTo(-Math.sin(TIDAL_CHANNEL_LANDWARD_TURN_RAD), 6)
    expect((tip.z - joint.z) / run).toBeCloseTo(-Math.cos(TIDAL_CHANNEL_LANDWARD_TURN_RAD), 6)
    expect(tidalChannelFrameAt((taperZ + seaZ) / 2).x).toBeCloseTo(0, 6)

    const geometry = tidalChannelGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    const landRightZ = tip.z + landRadius * tip.rightZ
    expect(box.min.z).toBeCloseTo(landRightZ, 4)
    expect(box.max.z).toBeCloseTo(seaZ, 4)
    expect(box.max.y).toBeCloseTo(0, 4)
    expect(box.min.x).toBeCloseTo(-seaRadius, 3)
    expect(box.max.x).toBeCloseTo(seaRadius, 3)

    const plan = tidalChannelPlanSamples()
    expect(plan[0].s).toBeCloseTo(landZ)
    expect(plan[0].z).toBeCloseTo(tip.z)
    expect(plan[plan.length - 1].z).toBeCloseTo(seaZ)
    const landSpan = Math.hypot(plan[0].xRight - plan[0].xLeft, plan[0].zRight - plan[0].zLeft)
    expect(landSpan).toBeCloseTo(2 * landRadius, 5)
    const atTaper = plan.find((ring) => Math.abs(ring.s - taperZ) < 1e-8)
    expect(atTaper).toBeDefined()
    expect(atTaper!.xRight - atTaper!.xLeft).toBeCloseTo(2 * landRadius, 5)
    expect(plan[plan.length - 1].xRight - plan[plan.length - 1].xLeft).toBeCloseTo(2 * seaRadius, 5)

    geometry.dispose()
  })

  it('dips the floor toward +Z and keeps the landward tip at the semicircle depth', () => {
    const { landZ, seaZ, taperZ, length } = tidalChannelSpan()
    const reference = tidalChannelReferenceDepth()
    const landDepth = CHANNEL_RADIUS
    const referenceAngle = Math.atan2(reference - landDepth, length)
    const seaDepth = tidalChannelDepthAt(seaZ)
    const dipAngle = Math.atan2(seaDepth - landDepth, length)
    const midZ = (landZ + seaZ) / 2

    expect(TIDAL_CHANNEL_OPACITY).toBe(0.5)
    expect(reference).toBeCloseTo(channelSpan().flatY - landwardMouthBarBaseY())
    expect(reference).toBeGreaterThan(landDepth)
    expect(tidalChannelDepthAt(landZ)).toBeCloseTo(landDepth)
    expect(seaDepth).toBeGreaterThan(reference)
    expect(dipAngle).toBeCloseTo(referenceAngle * TIDAL_CHANNEL_DIP_ANGLE_SCALE, 8)
    expect(tidalChannelDepthAt(midZ)).toBeCloseTo((landDepth + seaDepth) / 2, 8)
    expect(tidalChannelDepthAt(midZ)).toBeGreaterThan(tidalChannelDepthAt(landZ))
    expect(tidalChannelDepthAt(seaZ)).toBeGreaterThan(tidalChannelDepthAt(midZ))

    const geometry = tidalChannelGeometry()
    const position = geometry.getAttribute('position')
    const bottomNear = (x: number, z: number) => {
      let bottom = 0
      let best = Infinity
      for (let i = 0; i < position.count; i += 1) {
        const y = position.getY(i)
        if (y > -1e-4) continue
        const dx = position.getX(i) - x
        const dz = position.getZ(i) - z
        const dist = dx * dx + dz * dz
        if (dist > best) continue
        best = dist
        bottom = y
      }
      return bottom
    }
    const tip = tidalChannelFrameAt(landZ)
    const midS = (taperZ + seaZ) / 2
    const mid = tidalChannelFrameAt(midS)
    expect(bottomNear(tip.x, tip.z)).toBeCloseTo(-landDepth, 4)
    expect(bottomNear(mid.x, mid.z)).toBeCloseTo(-tidalChannelDepthAt(midS), 4)
    expect(bottomNear(0, seaZ)).toBeCloseTo(-seaDepth, 4)
    expect(bottomNear(0, seaZ)).toBeLessThan(bottomNear(tip.x, tip.z))
    geometry.dispose()
  })

  it('winds the orange shell outward across the full length and seaward width', () => {
    const { landZ, seaZ } = tidalChannelSpan()
    const seaRadius = CHANNEL_RADIUS * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
    const tip = tidalChannelFrameAt(landZ)
    const landRightZ = tip.z + CHANNEL_RADIUS * tip.rightZ
    const landward = new THREE.Vector3(-Math.sin(TIDAL_CHANNEL_LANDWARD_TURN_RAD), 0, -Math.cos(TIDAL_CHANNEL_LANDWARD_TURN_RAD))
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
    expect(minZ).toBeCloseTo(landRightZ, 4)
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
      const fromTip = center.clone().sub(new THREE.Vector3(tip.x, 0, tip.z))
      if (fromTip.length() < CHANNEL_RADIUS * 1.2 && normal.dot(landward) > 0.9) landCap = true
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
