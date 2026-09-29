import { destinationPoint, haversineM } from './projection'
import { LngLat } from './types'

export const CIRCLE_STEPS = 64

export interface CircleDraft {
  status: 'centre' | 'ready'
  centre: LngLat | null
  edge: LngLat | null
  message: string | null
}

export function beginCircle(): CircleDraft {
  return { status: 'centre', centre: null, edge: null, message: null }
}

export function setCircleCentre(draft: CircleDraft, centre: LngLat): CircleDraft {
  if (draft.status !== 'centre' || draft.centre) return draft
  return { ...draft, centre: { lng: centre.lng, lat: centre.lat }, message: null }
}

export function setCircleEdge(draft: CircleDraft, edge: LngLat): CircleDraft {
  if (!draft.centre || draft.status !== 'centre') return draft
  if (haversineM(draft.centre, edge) < 1) return { ...draft, message: 'The radius is too small.' }
  return {
    status: 'ready',
    centre: draft.centre,
    edge: { lng: edge.lng, lat: edge.lat },
    message: null,
  }
}

export function circleRadiusM(centre: LngLat, edge: LngLat): number {
  return haversineM(centre, edge)
}

export function circleRing(centre: LngLat, radiusM: number): LngLat[] {
  const ring: LngLat[] = []
  for (let step = 0; step < CIRCLE_STEPS; step += 1) {
    ring.push(destinationPoint(centre, radiusM, (360 * step) / CIRCLE_STEPS))
  }
  return ring
}
