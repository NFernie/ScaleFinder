export const FRAME_START = { width: 328, height: 224 }
export const FRAME_INSET_PX = 12
export const FRAME_KEY_STEP_PX = 16
/** Horizontal padding on the panel section (`p-3` × 2); frame width is section width minus this. */
export const PANEL_HORIZONTAL_PAD_PX = 24
/** Conservative chrome below/above the frame when layout has not been measured yet. */
export const PANEL_VERTICAL_CHROME_FALLBACK_PX = 218

export function mapFrameElementFromPanel(section: HTMLElement | null): HTMLElement | null {
  if (!section) return null
  const wrapper = section.offsetParent as HTMLElement | null
  if (!wrapper) return null
  return (wrapper.offsetParent as HTMLElement | null) ?? null
}

export function panelVerticalChromePx(section: HTMLElement): number {
  const frame = section.querySelector('[data-testid="wf-schematic-frame"]')
  if (frame instanceof HTMLElement && section.offsetHeight >= frame.offsetHeight) {
    return section.offsetHeight - frame.offsetHeight
  }
  return PANEL_VERTICAL_CHROME_FALLBACK_PX
}

const FRAME_RATIO = FRAME_START.width / FRAME_START.height

function clampLimit(n: number): number {
  if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY
  return Math.max(0, n)
}

/** Largest start-ratio box that fits inside limits; that box is the resize minimum. */
export function initialSchematicFrame(limits: {
  maxWidth: number
  maxHeight: number
}): { frame: { width: number; height: number }; minWidth: number } {
  const maxWidth = clampLimit(limits.maxWidth)
  const maxHeight = clampLimit(limits.maxHeight)
  if (maxWidth === Number.POSITIVE_INFINITY && maxHeight === Number.POSITIVE_INFINITY) {
    return { frame: { ...FRAME_START }, minWidth: FRAME_START.width }
  }
  const frame = fitSchematicFrame({
    width: FRAME_START.width,
    ratio: FRAME_RATIO,
    minWidth: 0,
    maxWidth,
    maxHeight,
  })
  const width = Math.max(0, frame.width)
  const height = Math.max(0, frame.height)
  return { frame: { width, height }, minWidth: width }
}

export type FrameEdgeGaps = {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** Clearance already provided by the anchored wrapper. An empty rect is not a measured gap. */
export function wrapperEdgeGaps(
  mapRect: { width: number; height: number; right: number; bottom: number },
  wrapperRect: { width: number; height: number; right: number; bottom: number } | null,
): { right: number; bottom: number } {
  if (
    !wrapperRect ||
    mapRect.width <= 0 ||
    mapRect.height <= 0 ||
    wrapperRect.width <= 0 ||
    wrapperRect.height <= 0
  ) {
    return { right: 0, bottom: 0 }
  }
  return {
    right: Math.max(0, mapRect.right - wrapperRect.right),
    bottom: Math.max(0, mapRect.bottom - wrapperRect.bottom),
  }
}

/** Use the wrapper gap when it is already at least the 12px inset; otherwise keep the 12px inset. */
function reservedEdge(gap: number | undefined): number {
  if (gap == null || !Number.isFinite(gap)) return FRAME_INSET_PX
  return Math.max(FRAME_INSET_PX, Math.max(0, gap))
}

export function schematicFrameLimits(
  mapRect: { width: number; height: number },
  verticalChromePx: number,
  gaps?: FrameEdgeGaps,
): { maxWidth: number; maxHeight: number } {
  if (mapRect.width === 0 || mapRect.height === 0) {
    return { maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }
  }
  const left = reservedEdge(gaps?.left)
  const right = reservedEdge(gaps?.right)
  const top = reservedEdge(gaps?.top)
  const bottom = reservedEdge(gaps?.bottom)
  return {
    maxWidth: Math.max(0, mapRect.width - PANEL_HORIZONTAL_PAD_PX - left - right),
    maxHeight: Math.max(0, mapRect.height - verticalChromePx - top - bottom),
  }
}
export const ZOOM_MIN = 2
export const ZOOM_MAX = 60
export const ZOOM_STEP = 1.25

function snapNearInteger(n: number): number {
  const rounded = Math.round(n)
  return Math.abs(n - rounded) < 1e-9 ? rounded : n
}

function positiveLimit(n: number): number {
  if (n === Number.POSITIVE_INFINITY) return n
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function largestFittingFrame(
  maxWidth: number,
  maxHeight: number,
  ratio: number,
): { width: number; height: number } {
  let width = maxWidth
  let height = width / ratio
  if (height > maxHeight) {
    height = maxHeight
    width = height * ratio
  }
  width = Math.min(maxWidth, Math.max(0, width))
  height = Math.min(maxHeight, Math.max(0, height))
  return { width, height: snapNearInteger(height) }
}

export function fitSchematicFrame(input: {
  width: number
  ratio: number
  minWidth: number
  maxWidth: number
  maxHeight: number
}): { width: number; height: number } {
  const maxWidth = positiveLimit(input.maxWidth)
  const maxHeight = positiveLimit(input.maxHeight)
  const minWidth = Math.max(0, Number.isFinite(input.minWidth) ? input.minWidth : 0)
  const minHeight = minWidth / input.ratio
  if (minWidth > maxWidth || minHeight > maxHeight) {
    return largestFittingFrame(maxWidth, maxHeight, input.ratio)
  }
  let width = Math.max(Number.isFinite(input.width) ? input.width : 0, minWidth)
  let height = width / input.ratio
  if (width > maxWidth) {
    width = maxWidth
    height = width / input.ratio
  }
  let heightCapped = false
  if (height > maxHeight) {
    height = maxHeight
    width = height * input.ratio
    heightCapped = true
  }
  if (!heightCapped && (width < minWidth || height < minHeight)) {
    return { width: minWidth, height: snapNearInteger(minHeight) }
  }
  width = Math.min(maxWidth, Math.max(0, width))
  height = Math.min(maxHeight, Math.max(0, height))
  return { width, height: snapNearInteger(height) }
}

export function zoomDistance(distance: number, direction: 'in' | 'out'): number {
  const next = direction === 'in' ? distance / ZOOM_STEP : distance * ZOOM_STEP
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
}

/** Pixel deltas that add up to one wheel detent. Line and page modes step on the event itself. */
export const WHEEL_PIXEL_THRESHOLD = 100

export function wheelZoomStep(
  accumulator: number,
  event: { deltaY: number; deltaMode: number },
): { direction: 'in' | 'out' | null; accumulator: number } {
  if (event.deltaY === 0) return { direction: null, accumulator }
  if (event.deltaMode === 1 || event.deltaMode === 2) {
    return { direction: event.deltaY < 0 ? 'in' : 'out', accumulator }
  }
  const total = accumulator + event.deltaY
  if (Math.abs(total) < WHEEL_PIXEL_THRESHOLD) return { direction: null, accumulator: total }
  if (total > 0) return { direction: 'out', accumulator: total - WHEEL_PIXEL_THRESHOLD }
  return { direction: 'in', accumulator: total + WHEEL_PIXEL_THRESHOLD }
}
