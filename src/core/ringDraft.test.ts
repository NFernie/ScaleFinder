import { describe, expect, it } from 'vitest'
import { polygonAreaM2 } from './geometry'
import { destinationPoint, haversineM, projectToGeographic } from './projection'
import { ringToDraft } from './ringDraft'

describe('ring draft', () => {
  it('turns a geographic ring into a metres Polygon at the drawn centre', () => {
    const origin = { lng: 10, lat: 45 }
    const corners = [origin, destinationPoint(origin, 1000, 90), destinationPoint(origin, 1000, 0)]
    const draft = ringToDraft(corners, 'Lasso')
    expect(draft?.sourceName).toBe('Lasso')
    expect(draft?.unit).toBe('m')
    expect(polygonAreaM2(draft!.raw)).toBeGreaterThan(0)
    const projected = projectToGeographic(draft!.raw, draft!.anchor)
    expect(haversineM(projected[0], origin)).toBeLessThan(2)
  })

  it('returns null for fewer than three corners', () => {
    expect(ringToDraft([{ lng: 0, lat: 0 }], 'Circle')).toBeNull()
  })
})
