import { describe, expect, it } from 'vitest'
import {
  POLYGON_COLOURS,
  appendPolygon,
  centreForNewPolygon,
  nextColour,
  reCentreSelected,
  removePolygon,
  stackSelectedOn,
  verticesForPolygon,
  type PolygonItem,
} from './polygonList'
import { LngLat, Vertex } from './types'

const mapCentre: LngLat = { lng: 10, lat: 20 }

const square: Vertex[] = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]

function item(partial: Partial<PolygonItem> & Pick<PolygonItem, 'id'>): PolygonItem {
  return {
    sourceName: partial.id,
    raw: square,
    unit: 'm',
    hasZ: false,
    selected: true,
    anchor: { lng: 0, lat: 0 },
    colour: POLYGON_COLOURS[0],
    ...partial,
  }
}

describe('nextColour', () => {
  it('returns the first swatch that no row uses', () => {
    expect(nextColour([])).toBe('#2dd4bf')
    expect(nextColour(['#2dd4bf', '#F59E0B'])).toBe('#38bdf8')
  })

  it('treats a deselected row as still using its colour', () => {
    expect(nextColour(['#2dd4bf'])).toBe('#f59e0b')
  })

  it('returns teal again when every swatch is in use', () => {
    expect(nextColour([...POLYGON_COLOURS])).toBe('#2dd4bf')
  })
})

describe('centreForNewPolygon', () => {
  it('uses the uppermost selected centre', () => {
    const items = [
      item({ id: 'a', selected: false, anchor: { lng: 1, lat: 1 } }),
      item({ id: 'b', selected: true, anchor: { lng: 2, lat: 3 } }),
      item({ id: 'c', selected: true, anchor: { lng: 9, lat: 9 } }),
    ]
    expect(centreForNewPolygon(items, mapCentre)).toEqual({ lng: 2, lat: 3 })
  })

  it('uses the map centre when nothing is selected', () => {
    const items = [item({ id: 'a', selected: false, anchor: { lng: 1, lat: 1 } })]
    expect(centreForNewPolygon(items, mapCentre)).toEqual(mapCentre)
  })
})

describe('appendPolygon', () => {
  it('appends a selected polygon with the next colour and shared centre', () => {
    const existing = [
      item({ id: 'a', colour: '#2dd4bf', anchor: { lng: 4, lat: 5 } }),
    ]
    const next = appendPolygon(existing, {
      id: 'b',
      sourceName: 'field.csv',
      raw: square,
      unit: 'ft',
      hasZ: true,
      mapCentre,
    })
    expect(existing).toHaveLength(1)
    expect(next).toHaveLength(2)
    expect(next[1]).toMatchObject({
      id: 'b',
      sourceName: 'field.csv',
      unit: 'ft',
      hasZ: true,
      selected: true,
      colour: '#f59e0b',
      anchor: { lng: 4, lat: 5 },
    })
  })
})

describe('removePolygon', () => {
  it('removes one polygon and leaves the others in order', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })]
    expect(removePolygon(items, 'b').map((polygon) => polygon.id)).toEqual(['a', 'c'])
    expect(items).toHaveLength(3)
  })
})

describe('reCentreSelected', () => {
  it('copies the uppermost selected centre onto the other selected polygons', () => {
    const items = [
      item({ id: 'off', selected: false, anchor: { lng: 7, lat: 7 } }),
      item({ id: 'first', selected: true, anchor: { lng: 1, lat: 2 } }),
      item({ id: 'second', selected: true, anchor: { lng: 3, lat: 4 } }),
    ]
    const next = reCentreSelected(items)
    expect(next.map((p) => p.anchor)).toEqual([
      { lng: 7, lat: 7 },
      { lng: 1, lat: 2 },
      { lng: 1, lat: 2 },
    ])
  })

  it('leaves the list unchanged when fewer than two are selected', () => {
    const items = [item({ id: 'only', anchor: { lng: 1, lat: 2 } })]
    expect(reCentreSelected(items)).toBe(items)
  })
})

describe('fixed polygons', () => {
  it('leaves a fixed Polygon in place when the others are re-centred or stacked', () => {
    const items = [
      item({ id: 'local', anchor: { lng: 1, lat: 2 } }),
      item({ id: 'fixed', anchor: { lng: 31, lat: 30 }, fixed: true }),
    ]
    const recentred = reCentreSelected(items)
    expect(recentred[1].anchor).toEqual({ lng: 31, lat: 30 })
    const stacked = stackSelectedOn(items, { lng: 9, lat: 8 })
    expect(stacked[0].anchor).toEqual({ lng: 9, lat: 8 })
    expect(stacked[1].anchor).toEqual({ lng: 31, lat: 30 })
  })
})

describe('stackSelectedOn', () => {
  it('moves every selected polygon onto the region and leaves the others', () => {
    const items = [
      item({ id: 'off', selected: false, anchor: { lng: 7, lat: 7 } }),
      item({ id: 'on', selected: true, anchor: { lng: 1, lat: 2 } }),
    ]
    const next = stackSelectedOn(items, { lng: 30, lat: 31 })
    expect(next[0].anchor).toEqual({ lng: 7, lat: 7 })
    expect(next[1].anchor).toEqual({ lng: 30, lat: 31 })
  })
})

describe('verticesForPolygon', () => {
  it('converts raw coordinates with the unit stored on the polygon', () => {
    const [vertex] = verticesForPolygon(
      item({ id: 'feet', unit: 'ft', raw: [{ x: 100, y: 200 }] }),
    )
    expect(vertex.x).toBeCloseTo(30.48, 2)
    expect(vertex.y).toBeCloseTo(60.96, 2)
  })
})
