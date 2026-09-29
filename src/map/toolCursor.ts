/** Lasso brush radius defaults — matches `beginLasso` / spec §3.3. */
export const LASSO_CURSOR_RADIUS_DEFAULT = 48
export const LASSO_CURSOR_RADIUS_MIN = 8
export const LASSO_CURSOR_RADIUS_MAX = 128

/** CSS pixel diameter of the lasso ring cursor (equals clamped Radius). */
export function lassoCursorDiameterPx(radiusPx?: number): number {
  const value = radiusPx ?? LASSO_CURSOR_RADIUS_DEFAULT
  return Math.min(LASSO_CURSOR_RADIUS_MAX, Math.max(LASSO_CURSOR_RADIUS_MIN, value))
}

export type FrameRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

/** Map client coordinates to frame-local CSS pixels, or null if outside the frame. */
export function framePointerFromClient(
  rect: FrameRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const x = clientX - rect.left
  const y = clientY - rect.top
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null
  }
  return { x, y }
}
