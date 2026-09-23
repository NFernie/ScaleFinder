import { describe, expect, it } from 'vitest'
import { parsePolygonFile, verticesToMetres } from './parseFile'

describe('parsePolygonFile', () => {
  it('parses comma-separated XYZ with a header', () => {
    const csv = 'X,Y,Z\n0,0,10\n1000,0,12\n1000,1000,15\n0,1000,9'
    const r = parsePolygonFile(csv)
    expect(r.hadHeader).toBe(true)
    expect(r.hasZ).toBe(true)
    expect(r.vertices).toHaveLength(4)
    expect(r.vertices[0]).toEqual({ x: 0, y: 0, z: 10 })
  })

  it('parses whitespace/tab separated XY without a header', () => {
    const txt = '0 0\n1000\t0\n1000 1000\n0 1000'
    const r = parsePolygonFile(txt)
    expect(r.hadHeader).toBe(false)
    expect(r.hasZ).toBe(false)
    expect(r.vertices).toHaveLength(4)
  })

  it('ignores comments and blank lines', () => {
    const txt = '# my polygon\n\n0,0\n5,0\n5,5\n\n0,5\n'
    const r = parsePolygonFile(txt)
    expect(r.vertices).toHaveLength(4)
  })

  it('throws for fewer than three vertices', () => {
    expect(() => parsePolygonFile('0,0\n1,1')).toThrow()
  })

  it('throws for non-numeric data rows', () => {
    expect(() => parsePolygonFile('0,0\n1,0\nabc,def\n0,1')).toThrow(/non-numeric/)
  })

  it('throws for empty input', () => {
    expect(() => parsePolygonFile('   \n# only a comment')).toThrow()
  })
})

describe('verticesToMetres', () => {
  it('passes metres through unchanged', () => {
    const v = [{ x: 1, y: 2, z: 3 }]
    expect(verticesToMetres(v, 'm')).toEqual(v)
  })

  it('scales feet to metres', () => {
    const [v] = verticesToMetres([{ x: 100, y: 200 }], 'ft')
    expect(v.x).toBeCloseTo(30.48, 4)
    expect(v.y).toBeCloseTo(60.96, 4)
  })

  it('scales km to metres', () => {
    const [v] = verticesToMetres([{ x: 1, y: 2 }], 'km')
    expect(v).toEqual({ x: 1000, y: 2000, z: undefined })
  })
})
