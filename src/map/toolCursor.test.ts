import { describe, expect, it } from 'vitest'
import {
  LASSO_CURSOR_RADIUS_DEFAULT,
  LASSO_CURSOR_RADIUS_MAX,
  LASSO_CURSOR_RADIUS_MIN,
  framePointerFromClient,
  lassoCursorDiameterPx,
} from './toolCursor'

describe('lassoCursorDiameterPx', () => {
  it('defaults to 48 when radius is missing', () => {
    expect(lassoCursorDiameterPx()).toBe(LASSO_CURSOR_RADIUS_DEFAULT)
  })

  it('clamps to 8–128', () => {
    expect(lassoCursorDiameterPx(4)).toBe(LASSO_CURSOR_RADIUS_MIN)
    expect(lassoCursorDiameterPx(200)).toBe(LASSO_CURSOR_RADIUS_MAX)
    expect(lassoCursorDiameterPx(64)).toBe(64)
  })
})

describe('framePointerFromClient', () => {
  const rect = { left: 100, top: 50, width: 400, height: 300 }

  it('returns local coordinates inside the frame', () => {
    expect(framePointerFromClient(rect, 250, 200)).toEqual({ x: 150, y: 150 })
  })

  it('returns null outside the frame', () => {
    expect(framePointerFromClient(rect, 99, 200)).toBeNull()
    expect(framePointerFromClient(rect, 501, 200)).toBeNull()
    expect(framePointerFromClient(rect, 250, 49)).toBeNull()
    expect(framePointerFromClient(rect, 250, 351)).toBeNull()
  })
})
