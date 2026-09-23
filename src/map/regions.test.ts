import { describe, expect, it } from 'vitest'
import { filterNotableRegions, NOTABLE_REGIONS } from './regions'

describe('filterNotableRegions', () => {
  it('returns all regions for an empty query', () => {
    expect(filterNotableRegions('')).toHaveLength(NOTABLE_REGIONS.length)
  })

  it('matches by case-insensitive substring', () => {
    const r = filterNotableRegions('delta')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.name.toLowerCase().includes('delta'))).toBe(true)
  })

  it('finds the Nile Delta', () => {
    const r = filterNotableRegions('nile')
    expect(r[0].name).toBe('Nile Delta')
  })
})
