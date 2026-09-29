import { describe, expect, it } from 'vitest'
import {
  commitPolygonName,
  downloadFileName,
  exportPolygonText,
  exportSelectedText,
  fixedAnchor,
  parseUtmTable,
} from './polygonExport'
import { haversineM } from './projection'

const anchor = { lng: 31, lat: 30 }
const square = [
  { lng: 31, lat: 30 },
  { lng: 31.01, lat: 30 },
  { lng: 31.01, lat: 30.01 },
  { lng: 31, lat: 30.01 },
]

describe('polygon names', () => {
  it('keeps a typed name and refuses a blank one', () => {
    expect(commitPolygonName('  Nile field  ', 'field-a.csv')).toBe('Nile field')
    expect(commitPolygonName('   ', 'field-a.csv')).toBe('field-a.csv')
  })

  it('builds a csv download name', () => {
    expect(downloadFileName('Nile field')).toBe('Nile field.csv')
    expect(downloadFileName('Field.CSV')).toBe('Field.CSV')
    expect(downloadFileName('a/b')).toBe('a-b.csv')
    expect(downloadFileName('///')).toBe('---.csv')
    expect(downloadFileName('   ')).toBe('polygon.csv')
  })
})

describe('utm file text', () => {
  it('writes a one-part table with Z set to 0', () => {
    const result = exportPolygonText([square], anchor)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text.startsWith('# UTM 36N\nPoly,Vert,X,Y,Z\n')).toBe(true)
    const data = result.text.trim().split('\n').slice(2)
    expect(data).toHaveLength(4)
    expect(data[0].startsWith('1,1,')).toBe(true)
    expect(data[0].endsWith(',0')).toBe(true)
    expect(data[3].startsWith('1,4,')).toBe(true)
  })

  it('restarts vertex numbers for each part', () => {
    const result = exportPolygonText([square.slice(0, 2), square.slice(2)], anchor)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toContain('Poly,Vert,X,Y,Z')
    expect(result.text).toContain('\n1,1,')
    expect(result.text).toContain('\n2,1,')
  })

  it('refuses a polar centre and an empty shape', () => {
    expect(exportPolygonText([square], { lng: 0, lat: 85 }).ok).toBe(false)
    expect(exportPolygonText([[]], anchor).ok).toBe(false)
  })

  it('omits a selected polygon in another zone', () => {
    const result = exportSelectedText([
      { id: 'a', parts: [square], anchor },
      { id: 'b', parts: [square], anchor: { lng: 0, lat: 30 } },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text.startsWith('# UTM 36N\nPoly,Vert,X,Y,Z\n')).toBe(true)
    expect(result.omitted.map((item) => item.id)).toEqual(['b'])
    expect(result.omitted[0].message).toContain('36N')
    expect(result.text).toContain('\n1,1,')
    expect(result.text).not.toContain('\n2,1,')
  })
})

describe('utm import', () => {
  it('reads a four-column file and places the fixed centre on the globe', () => {
    const exported = exportPolygonText([square], anchor)
    if (!exported.ok) throw new Error('export failed')
    const parsed = parseUtmTable(exported.text)
    if (!parsed?.zone) throw new Error('expected a zone')
    expect(parsed.parts).toHaveLength(1)
    expect(parsed.parts[0]).toHaveLength(4)
    const centre = fixedAnchor(parsed.parts, parsed.zone)
    expect(haversineM(centre, anchor)).toBeLessThan(1500)
  })

  it('keeps several poly numbers as parts of one shape', () => {
    const text = [
      '# UTM 36N',
      'Poly,Vert,X,Y,Z',
      '1,1,500000,3000000,0',
      '1,2,501000,3000000,0',
      '1,3,501000,3001000,0',
      '2,1,502000,3001000,5',
      '3,1,503000,3002000,0',
      '3,2,504000,3002000,0',
      '3,3,504000,3003000,0',
    ].join('\n')
    const parsed = parseUtmTable(text)
    expect(parsed?.parts.map((part) => part.length)).toEqual([3, 3])
    expect(parsed?.hasZ).toBe(true)
    expect(parsed?.zone).toEqual({ zone: 36, hemisphere: 'N' })
  })

  it('reads a tab-separated southern UTM text file', () => {
    const text = [
      '# UTM 54S\t\t\t\t',
      'Poly\tVert\tX\tY\tZ',
      '1\t1\t419276\t6874687\t0',
      '1\t2\t420233\t6874263\t0',
      '1\t3\t421355\t6873501\t0',
      '1\t19\t426041\t6877963\t0',
    ].join('\n')
    const parsed = parseUtmTable(text)
    expect(parsed?.zone).toEqual({ zone: 54, hemisphere: 'S' })
    expect(parsed?.parts).toHaveLength(1)
    expect(parsed?.parts[0]).toHaveLength(4)
    expect(parsed?.parts[0][0]).toEqual({ x: 419276, y: 6874687, z: 0 })
    if (!parsed?.zone) throw new Error('expected a zone')
    const centre = fixedAnchor(parsed.parts, parsed.zone)
    expect(centre.lat).toBeLessThan(0)
    expect(centre.lng).toBeGreaterThan(100)
  })

  it('returns null for a two-column file and a null zone when the comment is missing', () => {
    expect(parseUtmTable('0,0\n1000,0\n1000,1000\n0,1000\n')).toBeNull()
    const parsed = parseUtmTable(
      'Vertices,X,Y,Z\n1,500000,3000000,0\n2,501000,3000000,0\n3,501000,3001000,0\n',
    )
    expect(parsed?.zone).toBeNull()
    expect(parsed?.parts[0]).toHaveLength(3)
    expect(parseUtmTable('Poly,Vert,X,Y,Z\n1,1,1,1,0\n1,2,2,2,0\n')?.parts).toEqual([])
  })
})
