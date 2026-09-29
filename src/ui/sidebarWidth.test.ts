import { describe, expect, it } from 'vitest'
import { clampSidebarWidth, SIDEBAR_DEFAULT_PX } from './sidebarWidth'

describe('sidebar width', () => {
  it('starts at 380 and clamps to the list and map limits', () => {
    expect(SIDEBAR_DEFAULT_PX).toBe(380)
    expect(clampSidebarWidth(200, 1200)).toBe(280)
    expect(clampSidebarWidth(1000, 1200)).toBe(880)
    expect(clampSidebarWidth(400, 1200)).toBe(400)
  })
})
