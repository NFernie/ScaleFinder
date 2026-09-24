import { describe, expect, it } from 'vitest'
import { polygonAreaM2 } from './geometry'
import {
  addCorner,
  applyDoubleClick,
  beginMeasurement,
  finishRuler,
  measuredPolygonDraft,
  readout,
} from './measurement'
import { destinationPoint, haversineM, projectToGeographic } from './projection'

const origin = { lng: 10, lat: 45 }
const east = destinationPoint(origin, 1000, 90)
const northEast = destinationPoint(east, 1000, 0)
const north = destinationPoint(origin, 1000, 0)

function chain() {
  return [origin, east, northEast, north].reduce(
    (measurement, corner) => addCorner(measurement, corner),
    beginMeasurement(),
  )
}

describe('measurement readout', () => {
  it('sums ground distances and leaves the closing side off a ruler', () => {
    const ruler = finishRuler(chain())
    const figures = readout(ruler)
    expect(figures.segments.map((segment) => segment.label)).toEqual([
      'Segment 1',
      'Segment 2',
      'Segment 3',
    ])
    expect(figures.segments[0].metres).toBeCloseTo(1000, 0)
    expect(figures.totalM).toBeCloseTo(
      figures.segments.reduce((sum, segment) => sum + segment.metres, 0),
      3,
    )
    expect(figures.areaM2).toBeNull()
    expect(haversineM(north, origin)).toBeGreaterThan(900)
    expect(figures.totalM).toBeLessThan(3500)
  })

  it('includes the closing side and the shoelace area for a closed shape', () => {
    const closed = applyDoubleClick(chain(), north)
    if (!closed) throw new Error('expected a closed polygon')
    const figures = readout(closed)
    expect(figures.segments.map((segment) => segment.label)).toEqual([
      'Segment 1',
      'Segment 2',
      'Segment 3',
      'Segment 4',
    ])
    expect(figures.segments[3].metres).toBeCloseTo(haversineM(north, origin), 3)
    expect(figures.totalM).toBeCloseTo(
      figures.segments.reduce((sum, segment) => sum + segment.metres, 0),
      3,
    )
    const draft = measuredPolygonDraft(closed)
    if (!draft) throw new Error('expected a draft')
    expect(figures.areaM2).toBeCloseTo(polygonAreaM2(draft.raw), 3)
    expect(figures.areaM2).toBeGreaterThan(900_000)
  })
})

describe('measurement to Polygon', () => {
  it('keeps the drawn centre and projects back onto the measured corners', () => {
    const closed = applyDoubleClick(chain(), north)
    if (!closed) throw new Error('expected a closed polygon')
    const draft = measuredPolygonDraft(closed)
    if (!draft) throw new Error('expected a draft')
    expect(draft.sourceName).toBe('Measured Polygon')
    expect(draft.unit).toBe('m')
    expect(draft.hasZ).toBe(false)
    const placed = projectToGeographic(draft.raw, draft.anchor)
    closed.corners.forEach((corner, index) => {
      expect(haversineM(placed[index], corner)).toBeLessThan(2)
    })
  })

  it('returns nothing for a ruler', () => {
    expect(measuredPolygonDraft(finishRuler(chain()))).toBeNull()
  })
})

describe('measurement controls', () => {
  it('keeps Adding when Done has fewer than two corners', () => {
    const next = finishRuler(addCorner(beginMeasurement(), origin))
    expect(next.status).toBe('adding')
    expect(next.corners).toHaveLength(1)
    expect(next.message).toBe('Add at least two corners.')
  })

  it('does not close or delete when a double-click has fewer than three corners', () => {
    const open = addCorner(addCorner(beginMeasurement(), origin), east)
    const next = applyDoubleClick(open, east)
    expect(next).not.toBeNull()
    expect(next?.status).toBe('adding')
    expect(next?.corners).toHaveLength(2)
    expect(next?.message).toBe('Add at least three corners to close a Polygon.')
  })

  it('does not store a second copy of the last corner', () => {
    const once = addCorner(beginMeasurement(), origin)
    expect(addCorner(once, origin).corners).toHaveLength(1)
  })

  it('does not store a second copy of the last corner when closing', () => {
    const closed = applyDoubleClick(chain(), north)
    expect(closed?.corners).toHaveLength(4)
    expect(closed?.status).toBe('polygon')
  })

  it('deletes only a closed polygon on a second double-click', () => {
    const closed = applyDoubleClick(chain(), north)
    if (!closed) throw new Error('expected a closed polygon')
    expect(applyDoubleClick(closed, north)).toBeNull()
    const ruler = finishRuler(chain())
    expect(applyDoubleClick(ruler, north)).toEqual(ruler)
  })

  it('ignores new corners once the chain is finished', () => {
    const ruler = finishRuler(chain())
    expect(addCorner(ruler, origin).corners).toHaveLength(4)
  })
})
