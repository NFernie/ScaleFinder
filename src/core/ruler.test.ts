import { describe, expect, it } from 'vitest'
import { destinationPoint } from './projection'
import { addRulerCorner, beginRuler, finishDistanceRuler, rulerReadout } from './ruler'

const origin = { lng: 10, lat: 45 }
const east = destinationPoint(origin, 1000, 90)
const north = destinationPoint(origin, 500, 0)

describe('distance ruler', () => {
  it('sums each open segment and has no closing side', () => {
    const ruler = finishDistanceRuler(
      addRulerCorner(addRulerCorner(addRulerCorner(beginRuler(), origin), east), north),
    )
    const figures = rulerReadout(ruler)
    expect(ruler.status).toBe('done')
    expect(figures.segments.map((segment) => segment.label)).toEqual(['Segment 1', 'Segment 2'])
    expect(figures.segments[0].metres).toBeCloseTo(1000, 0)
    expect(figures.totalM).toBeCloseTo(
      figures.segments.reduce((sum, segment) => sum + segment.metres, 0),
      3,
    )
    expect(figures).not.toHaveProperty('areaM2')
  })

  it('keeps adding after many clicks until Done', () => {
    const open = [origin, east, north].reduce(
      (ruler, corner) => addRulerCorner(ruler, corner),
      beginRuler(),
    )
    expect(open.status).toBe('adding')
    expect(open.corners).toHaveLength(3)
  })

  it('does not finish a single point', () => {
    const next = finishDistanceRuler(addRulerCorner(beginRuler(), origin))
    expect(next.status).toBe('adding')
    expect(next.message).toBe('Add at least two points.')
  })

  it('ignores clicks after Done and ignores a duplicate point', () => {
    const done = finishDistanceRuler(addRulerCorner(addRulerCorner(beginRuler(), origin), east))
    expect(addRulerCorner(done, north).corners).toHaveLength(2)
    const duplicate = addRulerCorner(addRulerCorner(beginRuler(), origin), origin)
    expect(duplicate.corners).toHaveLength(1)
  })
})
