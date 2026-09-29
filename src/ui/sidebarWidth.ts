export const SIDEBAR_DEFAULT_PX = 380
export const SIDEBAR_MIN_PX = 280
export const MAP_MIN_PX = 320
export const SIDEBAR_STEP_PX = 16

/** Keep the list at least 280px and leave the map at least 320px. */
export function clampSidebarWidth(width: number, containerWidth: number): number {
  const room = containerWidth - MAP_MIN_PX
  const max = room >= SIDEBAR_MIN_PX ? room : SIDEBAR_MIN_PX
  return Math.min(max, Math.max(SIDEBAR_MIN_PX, width))
}
