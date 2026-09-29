import { haversineM } from './projection'
import { LngLat } from './types'

export interface RulerSegment {
  label: string
  metres: number
}

export interface Ruler {
  status: 'adding' | 'done'
  corners: LngLat[]
  message: string | null
}

export function beginRuler(): Ruler {
  return { status: 'adding', corners: [], message: null }
}

export function addRulerCorner(ruler: Ruler, corner: LngLat): Ruler {
  if (ruler.status !== 'adding') return ruler
  const last = ruler.corners[ruler.corners.length - 1]
  if (last && haversineM(last, corner) < 1) return { ...ruler, message: null }
  return {
    status: 'adding',
    corners: [...ruler.corners, { lng: corner.lng, lat: corner.lat }],
    message: null,
  }
}

export function finishDistanceRuler(ruler: Ruler): Ruler {
  if (ruler.status !== 'adding') return ruler
  if (ruler.corners.length < 2) return { ...ruler, message: 'Add at least two points.' }
  return { status: 'done', corners: ruler.corners, message: null }
}

export function rulerReadout(ruler: Ruler): { segments: RulerSegment[]; totalM: number } {
  const segments = ruler.corners.slice(1).map((corner, index) => ({
    label: `Segment ${index + 1}`,
    metres: haversineM(ruler.corners[index], corner),
  }))
  return {
    segments,
    totalM: segments.reduce((sum, segment) => sum + segment.metres, 0),
  }
}
