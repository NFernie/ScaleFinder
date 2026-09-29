import { describe, expect, it } from 'vitest'
import { beginCircle, CIRCLE_STEPS, circleRadiusM, circleRing, setCircleCentre, setCircleEdge } from './circle'
import { destinationPoint, haversineM } from './projection'

const centre = { lng: 10, lat: 45 }
const edge = destinationPoint(centre, 2000, 90)

describe('circle', () => {
  it('commits a second click into a 64-point ring at the clicked radius', () => {
    const ready = setCircleEdge(setCircleCentre(beginCircle(), centre), edge)
    expect(ready.status).toBe('ready')
    expect(circleRadiusM(ready.centre!, ready.edge!)).toBeCloseTo(2000, 0)
    const ring = circleRing(ready.centre!, circleRadiusM(ready.centre!, ready.edge!))
    expect(ring).toHaveLength(CIRCLE_STEPS)
    for (const point of ring) {
      expect(haversineM(centre, point)).toBeCloseTo(2000, 0)
    }
  })

  it('rejects a radius under one metre and ignores a second centre', () => {
    const placed = setCircleCentre(beginCircle(), centre)
    expect(setCircleCentre(placed, edge).centre).toEqual(centre)
    const tiny = setCircleEdge(placed, centre)
    expect(tiny.status).toBe('centre')
    expect(tiny.message).toBe('The radius is too small.')
  })
})
