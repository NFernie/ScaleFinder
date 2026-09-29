import { describe, expect, it } from 'vitest'
import {
  LASSO_CURSOR_RADIUS_DEFAULT,
  LASSO_CURSOR_RADIUS_MAX,
  LASSO_CURSOR_RADIUS_MIN,
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
