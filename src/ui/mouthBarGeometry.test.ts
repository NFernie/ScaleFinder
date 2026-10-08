import { describe, expect, it } from 'vitest'
import { MOUTH_BAR_SCALE } from '../core/wfSchematic'
import { mouthBarGeometry } from './mouthBarGeometry'

describe('mouthBarGeometry', () => {
  it('is a flat oval that dips toward +Z', () => {
    const geometry = mouthBarGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    expect(box.max.x - box.min.x).toBeCloseTo(MOUTH_BAR_SCALE.x, 5)
    expect(box.max.z - box.min.z).toBeCloseTo(MOUTH_BAR_SCALE.z, 5)
    expect(box.max.y - box.min.y).toBeCloseTo(MOUTH_BAR_SCALE.y, 5)
    expect(MOUTH_BAR_SCALE.z).toBeGreaterThan(MOUTH_BAR_SCALE.x)
    expect(MOUTH_BAR_SCALE.x).toBeGreaterThan(MOUTH_BAR_SCALE.y)

    const position = geometry.getAttribute('position')
    let sea = 0
    let land = 0
    let seaCount = 0
    let landCount = 0
    for (let i = 0; i < position.count; i += 1) {
      const z = position.getZ(i)
      if (z > MOUTH_BAR_SCALE.z / 2 - 1e-4) {
        sea += position.getY(i)
        seaCount += 1
      }
      if (z < -MOUTH_BAR_SCALE.z / 2 + 1e-4) {
        land += position.getY(i)
        landCount += 1
      }
    }
    expect(seaCount).toBeGreaterThan(0)
    expect(landCount).toBeGreaterThan(0)
    expect(sea / seaCount).toBeLessThan(land / landCount)
    geometry.dispose()
  })
})
