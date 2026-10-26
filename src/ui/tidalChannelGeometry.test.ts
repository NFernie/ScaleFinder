import { describe, expect, it } from 'vitest'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'
import {
  TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO,
  tidalChannelGeometry,
  tidalChannelPlanSamples,
} from './tidalChannelGeometry'

describe('tidalChannelGeometry', () => {
  it('funnels seaward to five times the landward width over the same length as the half channel', () => {
    const geometry = tidalChannelGeometry()
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) throw new Error('missing box')
    const half = CHANNEL_LENGTH / 2
    const landRadius = CHANNEL_RADIUS
    const seaRadius = landRadius * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO

    expect(box.min.z).toBeCloseTo(-half, 4)
    expect(box.max.z).toBeCloseTo(half, 4)
    expect(box.max.y).toBeCloseTo(0, 4)
    expect(box.min.y).toBeCloseTo(-seaRadius, 3)
    expect(box.min.x).toBeCloseTo(-seaRadius, 3)
    expect(box.max.x).toBeCloseTo(seaRadius, 3)

    const position = geometry.getAttribute('position')
    let minXAtLand = Infinity
    let maxXAtLand = -Infinity
    let minXAtSea = Infinity
    let maxXAtSea = -Infinity
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const z = position.getZ(i)
      if (Math.abs(z + half) < 0.02) {
        minXAtLand = Math.min(minXAtLand, x)
        maxXAtLand = Math.max(maxXAtLand, x)
      }
      if (Math.abs(z - half) < 0.02) {
        minXAtSea = Math.min(minXAtSea, x)
        maxXAtSea = Math.max(maxXAtSea, x)
      }
    }
    expect(maxXAtLand - minXAtLand).toBeCloseTo(2 * landRadius, 3)
    expect(maxXAtSea - minXAtSea).toBeCloseTo(2 * seaRadius, 3)
    expect(maxXAtSea - minXAtSea).toBeCloseTo(TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO * (maxXAtLand - minXAtLand), 3)

    const plan = tidalChannelPlanSamples()
    expect(plan[0].xRight - plan[0].xLeft).toBeCloseTo(2 * landRadius, 5)
    expect(plan[plan.length - 1].xRight - plan[plan.length - 1].xLeft).toBeCloseTo(2 * seaRadius, 5)

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
