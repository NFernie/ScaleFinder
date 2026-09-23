import { describe, expect, it } from 'vitest'
import { getBasemaps, hasMapTilerKey } from './basemap'

describe('getBasemaps', () => {
  it('returns only keyless OpenFreeMap styles without a key', () => {
    const maps = getBasemaps(undefined)
    expect(maps.every((m) => !m.requiresKey)).toBe(true)
    expect(maps.length).toBeGreaterThan(0)
  })

  it('offers MapTiler styles first when a key is present', () => {
    const maps = getBasemaps('abc123')
    expect(maps[0].requiresKey).toBe(true)
    expect(maps[0].styleUrl).toContain('key=abc123')
    // keyless fallbacks still present
    expect(maps.some((m) => !m.requiresKey)).toBe(true)
  })

  it('treats blank keys as no key', () => {
    expect(hasMapTilerKey('   ')).toBe(false)
    expect(getBasemaps('   ').every((m) => !m.requiresKey)).toBe(true)
  })
})
