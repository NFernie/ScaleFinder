import { describe, expect, it } from 'vitest'
import { haversineM } from './projection'
import {
  lngLatToUtm,
  utmHemisphere,
  utmLatitudeAllowed,
  utmToLngLat,
  utmZone,
  zoneLabel,
} from './utm'

describe('utm zone', () => {
  it('labels the centre zone and hemisphere', () => {
    expect(zoneLabel({ zone: utmZone(31), hemisphere: utmHemisphere(30) })).toBe('36N')
    expect(zoneLabel({ zone: utmZone(31), hemisphere: utmHemisphere(-30) })).toBe('36S')
    expect(utmZone(180)).toBe(1)
    expect(utmZone(-180)).toBe(1)
    expect(utmZone(-174)).toBe(2)
    expect(utmHemisphere(0)).toBe('N')
    expect(utmLatitudeAllowed(-80)).toBe(true)
    expect(utmLatitudeAllowed(84)).toBe(true)
    expect(utmLatitudeAllowed(-80.01)).toBe(false)
    expect(utmLatitudeAllowed(84.01)).toBe(false)
  })
})

describe('utm conversion', () => {
  it('puts the equator on a central meridian at the false origin', () => {
    const zone = { zone: 31, hemisphere: 'N' as const }
    const utm = lngLatToUtm({ lng: 3, lat: 0 }, zone)
    expect(utm.easting).toBeCloseTo(500_000, 3)
    expect(utm.northing).toBeCloseTo(0, 3)
  })

  it('round-trips a published-style point within a metre', () => {
    const point = { lng: 31, lat: 30 }
    const zone = { zone: 36, hemisphere: 'N' as const }
    const utm = lngLatToUtm(point, zone)
    const back = utmToLngLat(utm.easting, utm.northing, zone)
    expect(haversineM(point, back)).toBeLessThan(1)
  })

  it('uses the southern false northing', () => {
    const north = lngLatToUtm({ lng: 31, lat: 30 }, { zone: 36, hemisphere: 'N' })
    const south = lngLatToUtm({ lng: 31, lat: -30 }, { zone: 36, hemisphere: 'S' })
    expect(south.northing).toBeCloseTo(10_000_000 - north.northing, 0)
  })
})
