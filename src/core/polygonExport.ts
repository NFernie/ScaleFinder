import { centroid } from './geometry'
import { LngLat, Vertex } from './types'
import { lngLatToUtm, utmLatitudeAllowed, utmOf, utmToLngLat, UtmZone, zoneLabel } from './utm'

const POLE_MESSAGE = 'This Polygon is too close to a pole for a UTM export.'
const EMPTY_MESSAGE = 'A Polygon needs at least one vertex to export.'
const ZONE_MESSAGE = 'No fixed Polygon was added because the file has no UTM zone.'

export { POLE_MESSAGE, EMPTY_MESSAGE, ZONE_MESSAGE }

export function commitPolygonName(typed: string, previous: string): string {
  const trimmed = typed.trim()
  return trimmed ? trimmed : previous
}

export function downloadFileName(sourceName: string): string {
  const cleaned = sourceName.replace(/[/\\:*?"<>|]/g, '-').trim()
  if (!cleaned) return 'polygon.csv'
  if (cleaned.toLowerCase().endsWith('.csv')) return cleaned
  return `${cleaned}.csv`
}

export function fixedName(fileName: string): string {
  return `${fileName} (fixed)`
}

export function outsideZoneMessage(zone: UtmZone): string {
  return `This Polygon is outside UTM zone ${zoneLabel(zone)}, so it was left out of the export.`
}

export interface UtmImport {
  parts: Vertex[][]
  hasZ: boolean
  zone: UtmZone | null
}

/** Local two-column files return null. UTM tables return their parts and zone. */
export function parseUtmTable(text: string): UtmImport | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  let zone: UtmZone | null = null
  for (const line of lines) {
    const match = /^#\s*UTM\s+(\d+)\s*([NSns])\b/.exec(line)
    if (match) {
      zone = { zone: Number(match[1]), hemisphere: match[2].toUpperCase() === 'S' ? 'S' : 'N' }
    }
  }
  const rows = lines.filter((line) => line.length > 0 && !line.startsWith('#'))
  if (rows.length === 0) return null
  const header = splitRow(rows[0]).map((token) => token.toLowerCase())
  const verticesCol = header.indexOf('vertices')
  if (verticesCol < 0) return null
  const xCol = header.indexOf('x')
  const yCol = header.indexOf('y')
  const zCol = header.indexOf('z')
  const polyCol = header.findIndex((token) => token.replace(/\s+/g, '') === 'polynumber' || token === 'poly')
  if (xCol < 0 || yCol < 0) return null

  const grouped = new Map<string, Vertex[]>()
  const order: string[] = []
  let hasZ = false
  for (const row of rows.slice(1)) {
    const tokens = splitRow(row)
    const x = Number(tokens[xCol])
    const y = Number(tokens[yCol])
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const zToken = zCol >= 0 ? tokens[zCol] : undefined
    const z = zToken !== undefined && zToken !== '' && Number.isFinite(Number(zToken)) ? Number(zToken) : undefined
    if (z !== undefined) hasZ = true
    const key = polyCol >= 0 && tokens[polyCol] ? tokens[polyCol] : '1'
    if (!grouped.has(key)) {
      grouped.set(key, [])
      order.push(key)
    }
    grouped.get(key)?.push(z === undefined ? { x, y } : { x, y, z })
  }
  const parts = order.map((key) => grouped.get(key) ?? []).filter((part) => part.length > 0)
  return { parts, hasZ, zone }
}

export function fixedAnchor(parts: Vertex[][], zone: UtmZone): LngLat {
  const all = parts.flat()
  const centre = centroid(all)
  return utmToLngLat(centre.x, centre.y, zone)
}

export function exportPolygonText(parts: LngLat[][], anchor: LngLat): { ok: true; text: string } | { ok: false; message: string } {
  const usable = parts.filter((part) => part.length > 0)
  if (usable.flat().length === 0) return { ok: false, message: EMPTY_MESSAGE }
  if (!utmLatitudeAllowed(anchor.lat)) return { ok: false, message: POLE_MESSAGE }
  const zone = utmOf(anchor)
  const comment = `# UTM ${zoneLabel(zone)}`
  if (usable.length === 1) {
    const rows = usable[0].map((point, index) => vertexRow(index + 1, point, zone))
    return { ok: true, text: [comment, 'Vertices,X,Y,Z', ...rows].join('\n') + '\n' }
  }
  const rows = usable.flatMap((part, partIndex) =>
    part.map((point, index) => `${partIndex + 1},${vertexRow(index + 1, point, zone)}`),
  )
  return { ok: true, text: [comment, 'Poly Number,Vertices,X,Y,Z', ...rows].join('\n') + '\n' }
}

export interface SelectedExportInput {
  id: string
  parts: LngLat[][]
  anchor: LngLat
}

export function exportSelectedText(
  polygons: SelectedExportInput[],
):
  | { ok: true; text: string; omitted: { id: string; message: string }[] }
  | { ok: false; message: string; id: string } {
  const first = polygons[0]
  if (!first) return { ok: false, message: EMPTY_MESSAGE, id: '' }
  if (!utmLatitudeAllowed(first.anchor.lat)) return { ok: false, message: POLE_MESSAGE, id: first.id }
  const zone = utmOf(first.anchor)
  const label = zoneLabel(zone)
  const omitted: { id: string; message: string }[] = []
  const rows: string[] = []
  let poly = 0
  for (const polygon of polygons) {
    const same =
      utmZoneNumber(polygon.anchor) === zone.zone && utmOf(polygon.anchor).hemisphere === zone.hemisphere
    if (!same) {
      omitted.push({ id: polygon.id, message: outsideZoneMessage(zone) })
      continue
    }
    const vertices = polygon.parts.flat()
    if (vertices.length === 0) continue
    poly += 1
    vertices.forEach((point, index) => {
      rows.push(`${poly},${vertexRow(index + 1, point, zone)}`)
    })
  }
  if (rows.length === 0) return { ok: false, message: EMPTY_MESSAGE, id: first.id }
  return {
    ok: true,
    text: [`# UTM ${label}`, 'Poly Number,Vertices,X,Y,Z', ...rows].join('\n') + '\n',
    omitted,
  }
}

function utmZoneNumber(point: LngLat): number {
  return utmOf(point).zone
}

function vertexRow(index: number, point: LngLat, zone: UtmZone): string {
  const utm = lngLatToUtm(point, zone)
  return `${index},${utm.easting.toFixed(2)},${utm.northing.toFixed(2)},0`
}

function splitRow(row: string): string[] {
  return row.split(',').map((token) => token.trim()).filter(Boolean)
}
