import { describe, expect, it } from 'vitest'
import {
  destinationPoint,
  haversineM,
  projectToGeographic,
} from './projection'
import { Vertex } from './types'

describe('destinationPoint', () => {
  it('moves ~111.2 km north per degree of latitude', () => {
    const p = destinationPoint({ lng: 0, lat: 0 }, 100_000, 0)
    expect(p.lng).toBeCloseTo(0, 6)
    expect(p.lat).toBeCloseTo(0.899, 2)
  })

  it('moving east then measuring distance round-trips', () => {
    const start = { lng: 10, lat: 45 }
    const east = destinationPoint(start, 5000, 90)
    expect(haversineM(start, east)).toBeCloseTo(5000, 0)
  })
})

const square1km: Vertex[] = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]

describe('projectToGeographic', () => {
  it('preserves true edge lengths at the equator', () => {
    const ring = projectToGeographic(square1km, { lng: 0, lat: 0 })
    for (let i = 0; i < ring.length; i++) {
      const d = haversineM(ring[i], ring[(i + 1) % ring.length])
      expect(d).toBeCloseTo(1000, 0)
    }
  })

  it('preserves true edge lengths at high latitude (60N)', () => {
    const ring = projectToGeographic(square1km, { lng: 20, lat: 60 })
    for (let i = 0; i < ring.length; i++) {
      const d = haversineM(ring[i], ring[(i + 1) % ring.length])
      // within 0.5 m of true ground length regardless of Mercator distortion
      expect(Math.abs(d - 1000)).toBeLessThan(0.5)
    }
  })

  it('centres the polygon on the anchor', () => {
    const anchor = { lng: -90, lat: 29 }
    const ring = projectToGeographic(square1km, anchor)
    const meanLng = ring.reduce((s, p) => s + p.lng, 0) / ring.length
    const meanLat = ring.reduce((s, p) => s + p.lat, 0) / ring.length
    expect(meanLng).toBeCloseTo(anchor.lng, 2)
    expect(meanLat).toBeCloseTo(anchor.lat, 2)
  })
})
