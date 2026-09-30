import { LngLat } from './types'

export const VERTEX_FLOOR = 'A Polygon needs at least three corners.'

export function insertOnSide(ring: LngLat[], sideIndex: number, point: LngLat): LngLat[] {
  if (sideIndex < 0 || sideIndex >= ring.length) return ring
  const next = ring.map((item) => ({ lng: item.lng, lat: item.lat }))
  next.splice(sideIndex + 1, 0, { lng: point.lng, lat: point.lat })
  return next
}

export function moveCorner(ring: LngLat[], index: number, point: LngLat): LngLat[] {
  if (index < 0 || index >= ring.length) return ring
  return ring.map((item, itemIndex) =>
    itemIndex === index ? { lng: point.lng, lat: point.lat } : { lng: item.lng, lat: item.lat },
  )
}

export function removeCorner(ring: LngLat[], index: number): LngLat[] | null {
  if (ring.length < 4 || index < 0 || index >= ring.length) return null
  return ring.filter((_, item) => item !== index).map((item) => ({ lng: item.lng, lat: item.lat }))
}
