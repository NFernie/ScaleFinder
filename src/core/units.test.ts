import { describe, expect, it } from 'vitest'
import { fromMetres, toMetres } from './units'

describe('units', () => {
  it('converts feet to metres', () => {
    expect(toMetres(1, 'ft')).toBeCloseTo(0.3048, 6)
  })

  it('converts km to metres', () => {
    expect(toMetres(2, 'km')).toBe(2000)
  })

  it('is an identity for metres', () => {
    expect(toMetres(5, 'm')).toBe(5)
    expect(fromMetres(5, 'm')).toBe(5)
  })

  it('round-trips', () => {
    expect(fromMetres(toMetres(123.4, 'ft'), 'ft')).toBeCloseTo(123.4, 6)
  })
})
