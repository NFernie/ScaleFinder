import { toMetres } from './units'
import { LengthUnit, Vertex } from './types'

export interface ParseResult {
  vertices: Vertex[]
  hadHeader: boolean
  hasZ: boolean
}

const DELIMITER = /[\s,;]+/

function splitLine(line: string): string[] {
  return line.trim().split(DELIMITER).filter(Boolean)
}

function isNumeric(token: string): boolean {
  return token !== '' && Number.isFinite(Number(token))
}

/**
 * Parse a `.txt` / `.csv` polygon file whose rows are `X, Y[, Z]` values.
 * Supports comma / whitespace / tab / semicolon delimiters, `#` comments,
 * blank lines, and an optional header row (auto-detected).
 */
export function parsePolygonFile(text: string): ParseResult {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  if (rows.length === 0) {
    throw new Error('File contains no coordinate rows.')
  }

  let hadHeader = false
  const firstTokens = splitLine(rows[0])
  if (firstTokens.length < 2 || !isNumeric(firstTokens[0]) || !isNumeric(firstTokens[1])) {
    hadHeader = true
  }

  const dataRows = hadHeader ? rows.slice(1) : rows
  if (dataRows.length < 3) {
    throw new Error('A Polygon needs at least three coordinate rows.')
  }

  let hasZ = true
  const vertices: Vertex[] = dataRows.map((row, i) => {
    const tokens = splitLine(row)
    if (tokens.length < 2) {
      throw new Error(`Row ${i + 1} has fewer than two values: "${row}"`)
    }
    const x = Number(tokens[0])
    const y = Number(tokens[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Row ${i + 1} has non-numeric X/Y: "${row}"`)
    }
    if (tokens.length >= 3 && isNumeric(tokens[2])) {
      return { x, y, z: Number(tokens[2]) }
    }
    hasZ = false
    return { x, y }
  })

  return { vertices, hadHeader, hasZ }
}

/** Scale parsed vertices (in `unit`) into metres for geometry/projection. */
export function verticesToMetres(vertices: Vertex[], unit: LengthUnit): Vertex[] {
  if (unit === 'm') return vertices
  return vertices.map((v) => ({
    x: toMetres(v.x, unit),
    y: toMetres(v.y, unit),
    z: v.z === undefined ? undefined : toMetres(v.z, unit),
  }))
}
