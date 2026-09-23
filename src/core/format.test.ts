import { describe, expect, it } from 'vitest'
import { formatArea, formatLength } from './format'

describe('formatArea', () => {
  it('uses km² for large areas', () => {
    expect(formatArea(25_000_000)).toBe('25.00 km²')
  })
  it('uses hectares below 1 km²', () => {
    expect(formatArea(500_000)).toBe('50.0 ha')
  })
  it('uses m² for tiny areas', () => {
    expect(formatArea(5000)).toBe('5,000 m²')
  })
})

describe('formatLength', () => {
  it('uses metres below 1 km', () => {
    expect(formatLength(400)).toBe('400 m')
  })
  it('uses km otherwise', () => {
    expect(formatLength(5000)).toBe('5 km')
  })
})
