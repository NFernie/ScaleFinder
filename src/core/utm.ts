import { LngLat } from './types'

const A = 6_378_137
const F = 1 / 298.257223563
const K0 = 0.9996
const E2 = F * (2 - F)
const EP2 = E2 / (1 - E2)

const toRad = (degrees: number) => (degrees * Math.PI) / 180
const toDeg = (radians: number) => (radians * 180) / Math.PI

export type Hemisphere = 'N' | 'S'

export interface UtmZone {
  zone: number
  hemisphere: Hemisphere
}

export function utmZone(longitude: number): number {
  let zone = Math.floor((longitude + 180) / 6) + 1
  if (zone >= 61) zone = 1
  if (zone < 1) zone = 1
  return zone
}

export function utmHemisphere(latitude: number): Hemisphere {
  return latitude >= 0 ? 'N' : 'S'
}

export function utmOf(point: LngLat): UtmZone {
  return { zone: utmZone(point.lng), hemisphere: utmHemisphere(point.lat) }
}

export function zoneLabel(zone: UtmZone): string {
  return `${zone.zone}${zone.hemisphere}`
}

/** UTM is defined from 80°S through 84°N, including those parallels. */
export function utmLatitudeAllowed(latitude: number): boolean {
  return latitude >= -80 && latitude <= 84
}

export function lngLatToUtm(point: LngLat, zone: UtmZone): { easting: number; northing: number } {
  const lat = toRad(point.lat)
  const lon = toRad(point.lng)
  const lon0 = toRad((zone.zone - 1) * 6 - 180 + 3)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const tanLat = Math.tan(lat)
  const n = A / Math.sqrt(1 - E2 * sinLat * sinLat)
  const t = tanLat * tanLat
  const c = EP2 * cosLat * cosLat
  const a = cosLat * (lon - lon0)
  const m =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256) * lat -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 * E2 * E2) / 1024) * Math.sin(2 * lat) +
      ((15 * E2 * E2) / 256 + (45 * E2 * E2 * E2) / 1024) * Math.sin(4 * lat) -
      ((35 * E2 * E2 * E2) / 3072) * Math.sin(6 * lat))
  const easting =
    K0 *
      n *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120) +
    500_000
  let northing =
    K0 *
    (m +
      n *
        tanLat *
        (a ** 2 / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720))
  if (zone.hemisphere === 'S') northing += 10_000_000
  return { easting, northing }
}

export function utmToLngLat(
  easting: number,
  northing: number,
  zone: UtmZone,
): LngLat {
  const x = easting - 500_000
  let y = northing
  if (zone.hemisphere === 'S') y -= 10_000_000
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2))
  const m = y / K0
  const mu =
    m /
    (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256))
  const lat1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu)
  const sin1 = Math.sin(lat1)
  const cos1 = Math.cos(lat1)
  const tan1 = Math.tan(lat1)
  const n1 = A / Math.sqrt(1 - E2 * sin1 * sin1)
  const t1 = tan1 * tan1
  const c1 = EP2 * cos1 * cos1
  const r1 = (A * (1 - E2)) / (1 - E2 * sin1 * sin1) ** 1.5
  const d = x / (n1 * K0)
  const lat =
    lat1 -
    ((n1 * tan1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6) / 720)
  const lon =
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5) / 120) /
    cos1
  const lon0 = toRad((zone.zone - 1) * 6 - 180 + 3)
  return { lng: toDeg(lon0 + lon), lat: toDeg(lat) }
}
