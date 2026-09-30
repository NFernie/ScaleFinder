import { describe, expect, it } from 'vitest'
import { insertOnSide, removeCorner } from './ringEdit'

const ring = [
  { lng: 0, lat: 0 },
  { lng: 1, lat: 0 },
  { lng: 1, lat: 1 },
  { lng: 0, lat: 1 },
]

describe('ringEdit', () => {
  it('inserts between the ends of that side', () => {
    const point = { lng: 1, lat: 0.5 }
    expect(insertOnSide(ring, 1, point).map((item) => item.lng + ',' + item.lat)).toEqual([
      '0,0',
      '1,0',
      '1,0.5',
      '1,1',
      '0,1',
    ])
  })

  it('inserts the closing side at the end of the ring', () => {
    const point = { lng: 0, lat: 0.5 }
    const next = insertOnSide(ring, 3, point)
    expect(next[next.length - 1]).toEqual(point)
    expect(next[0]).toEqual(ring[0])
  })

  it('removes a corner from four and refuses a third', () => {
    expect(removeCorner(ring, 1)).toHaveLength(3)
    expect(removeCorner(ring.slice(0, 3), 0)).toBeNull()
  })
})
