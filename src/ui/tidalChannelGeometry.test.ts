import { describe, expect, it } from 'vitest'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'
import {
  TIDAL_CHANNEL_LENGTH_SCALE,
  TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO,
  tidalChannelGeometry,
  tidalChannelPlanSamples,
  tidalChannelRadiusAt,
  tidalChannelSpan,
} from './tidalChannelGeometry'

describe('tidalChannelGeometry', () => {
  it('holds landward width until the half channel landward end, then flares concave to five times the width', () => {
    const { landZ, seaZ, taperZ, length } = tidalChannelSpan()
    const landRadius = CHANNEL_RADIUS
    const seaRadius = landRadius * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO

    expect(length).toBeCloseTo(CHANNEL_LENGTH * TIDAL_CHANNEL_LENGTH_SCALE)
    expect(seaZ).toBeCloseTo(CHANNEL_LENGTH / 2)
    expect(landZ).toBeLessThan(-CHANNEL_LENGTH / 2)
    expect(taperZ).toBeCloseTo(-CHANNEL_LENGTH / 2)

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
