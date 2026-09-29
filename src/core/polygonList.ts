import { boundingBox, centroid, maxSpanM, polygonAreaM2 } from './geometry'
import { verticesToMetres } from './parseFile'
import { LengthUnit, LngLat, PolygonStats, Vertex } from './types'

/** Assignment order. Teal matches the original single-Polygon colour. */
export const POLYGON_COLOURS = [
  '#2dd4bf',
  '#f59e0b',
  '#38bdf8',
  '#fb7185',
  '#a3e635',
  '#a78bfa',
  '#fb923c',
] as const

export interface PolygonItem {
  id: string
  sourceName: string
  raw: Vertex[]
  unit: LengthUnit
  hasZ: boolean
  selected: boolean
  anchor: LngLat
  colour: string
  /** When set, these parts are the shape. `raw` stays the vertices joined together. */
  parts?: Vertex[][]
  /** A UTM import twin. Drag, re-centre, and region search leave it in place. */
  fixed?: boolean
  /** Clockwise turn of the imported metres, around their own centre. */
  rotationDeg?: number
  /** Edge chosen when the Polygon was added. Part index, then edge index. */
  referenceEdge?: { part: number; edge: number }
  /** Compass bearing of that edge when the Polygon was added. */
  originalBearing?: number
}

export interface NewPolygonInput {
  id: string
  sourceName: string
  raw: Vertex[]
  unit: LengthUnit
  hasZ: boolean
  mapCentre: LngLat
}

function copyLngLat(point: LngLat): LngLat {
  return { lng: point.lng, lat: point.lat }
}

/** First swatch no row currently uses. Teal again once every swatch is taken. */
export function nextColour(used: readonly string[]): string {
  const taken = new Set(used.map((colour) => colour.toLowerCase()))
  return POLYGON_COLOURS.find((colour) => !taken.has(colour)) ?? POLYGON_COLOURS[0]
}

/** Uppermost selected centre, or the map centre when nothing is selected. */
export function centreForNewPolygon(items: readonly PolygonItem[], mapCentre: LngLat): LngLat {
  const first = items.find((item) => item.selected)
  return copyLngLat(first ? first.anchor : mapCentre)
}

export function appendPolygon(items: readonly PolygonItem[], input: NewPolygonInput): PolygonItem[] {
  const item: PolygonItem = {
    id: input.id,
    sourceName: input.sourceName,
    raw: input.raw,
    unit: input.unit,
    hasZ: input.hasZ,
    selected: true,
    anchor: centreForNewPolygon(items, input.mapCentre),
    colour: nextColour(items.map((existing) => existing.colour)),
  }
  return [...items, item]
}

/** Drop one Polygon from the session list. Other rows stay in order. */
export function removePolygon(items: readonly PolygonItem[], id: string): PolygonItem[] {
  return items.filter((item) => item.id !== id)
}

/** Copy the uppermost selected centre onto every other selected Polygon. */
export function reCentreSelected(items: readonly PolygonItem[]): PolygonItem[] {
  const selected = items.filter((item) => item.selected)
  if (selected.length < 2) return items as PolygonItem[]
  const centre = copyLngLat(selected[0].anchor)
  return items.map((item) =>
    item.selected && !item.fixed ? { ...item, anchor: copyLngLat(centre) } : item,
  )
}

/** Move every selected Polygon onto one geographic centre. */
export function stackSelectedOn(items: readonly PolygonItem[], centre: LngLat): PolygonItem[] {
  const target = copyLngLat(centre)
  return items.map((item) =>
    item.selected && !item.fixed ? { ...item, anchor: copyLngLat(target) } : item,
  )
}

/** Raw vertices converted to metres with the unit stored on the Polygon. */
export function partsForPolygon(item: PolygonItem): Vertex[][] {
  const source = item.parts && item.parts.length > 0 ? item.parts : [item.raw]
  return source.map((part) => verticesToMetres(part, item.unit))
}

export function verticesForPolygon(item: PolygonItem): Vertex[] {
  return partsForPolygon(item).flat()
}

export function displayStats(item: PolygonItem): PolygonStats | null {
  const parts = partsForPolygon(item)
  const points = parts.flat()
  if (points.length === 0) return null
  const areaM2 = parts.reduce((sum, part) => sum + (part.length >= 3 ? polygonAreaM2(part) : 0), 0)
  return {
    areaM2,
    centroid: centroid(points),
    bbox: boundingBox(points),
    maxSpanM: maxSpanM(points),
    characteristicLengthM: Math.sqrt(areaM2),
  }
}
