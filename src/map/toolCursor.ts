/** Lasso brush radius defaults — matches `beginLasso` / spec §3.3. */
export const LASSO_CURSOR_RADIUS_DEFAULT = 48
export const LASSO_CURSOR_RADIUS_MIN = 8
export const LASSO_CURSOR_RADIUS_MAX = 128

/** CSS pixel diameter of the lasso ring cursor (equals clamped Radius). */
export function lassoCursorDiameterPx(radiusPx?: number): number {
  const value = radiusPx ?? LASSO_CURSOR_RADIUS_DEFAULT
  return Math.min(LASSO_CURSOR_RADIUS_MAX, Math.max(LASSO_CURSOR_RADIUS_MIN, value))
}
