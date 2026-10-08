import { describe, expect, it } from 'vitest'
import { MOUTH_BAR_DIP, MOUTH_BAR_SCALE, mouthBarBaseOffset } from '../core/wfSchematic'
import { mouthBarGeometry } from './mouthBarGeometry'

describe('mouthBarGeometry', () => {
  it('is a half spheroid with the dome up and a seaward dip', () => {
    const geometry = mouthBarGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    const halfZ = MOUTH_BAR_SCALE.z / 2
    expect(box.max.x - box.min.x).toBeCloseTo(MOUTH_BAR_SCALE.x, 5)
    expect(box.max.z - box.min.z).toBeCloseTo(MOUTH_BAR_SCALE.z, 5)
    expect(box.max.y - box.min.y).toBeGreaterThan(MOUTH_BAR_SCALE.y)
    expect(MOUTH_BAR_SCALE.z).toBeCloseTo(0.72 * 1.5)
    expect(MOUTH_BAR_SCALE.y).toBeCloseTo(0.056 * 1.5)
    expect(MOUTH_BAR_SCALE.z).toBeGreaterThan(MOUTH_BAR_SCALE.x)

    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    let sea = 0
    let land = 0
    let seaCount = 0
    let landCount = 0
    let crown = -Infinity
    let sole = Infinity
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      if (Math.abs(x) < 1e-6 && Math.abs(z) < 1e-6) {
        crown = Math.max(crown, y)
        sole = Math.min(sole, y)
      }
      if (z > halfZ - 1e-4) {
        sea += y
        seaCount += 1
      }
      if (z < -halfZ + 1e-4) {
        land += y
        landCount += 1
      }
    }
    expect(seaCount).toBeGreaterThan(0)
    expect(landCount).toBeGreaterThan(0)
    expect(sea / seaCount).toBeCloseTo(mouthBarBaseOffset(halfZ, halfZ))
    expect(land / landCount).toBeCloseTo(0)
    expect(sea / seaCount).toBeLessThan(land / landCount)
    expect(land / landCount - sea / seaCount).toBeCloseTo(MOUTH_BAR_DIP)
    expect(crown - sole).toBeCloseTo(MOUTH_BAR_SCALE.y)
    expect(normal.getY(0)).toBeGreaterThan(0.5)
    geometry.dispose()
  })
})
