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

export function schematicFrameLimits(
  mapRect: { width: number; height: number },
  verticalChromePx: number,
): { maxWidth: number; maxHeight: number } {
  if (mapRect.width === 0 || mapRect.height === 0) {
    return { maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }
  }
  return {
    maxWidth: mapRect.width - PANEL_HORIZONTAL_PAD_PX - FRAME_INSET_PX * 2,
    maxHeight: mapRect.height - verticalChromePx - FRAME_INSET_PX * 2,
  }
}
export const ZOOM_MIN = 2
export const ZOOM_MAX = 60
export const ZOOM_STEP = 1.25

function snapNearInteger(n: number): number {
  const rounded = Math.round(n)
  return Math.abs(n - rounded) < 1e-9 ? rounded : n
}

export function fitSchematicFrame(input: {
  width: number
  ratio: number
  minWidth: number
  maxWidth: number
  maxHeight: number
}): { width: number; height: number } {
  const minHeight = input.minWidth / input.ratio
  let width = Math.max(input.width, input.minWidth)
  let height = width / input.ratio
  if (width > input.maxWidth) {
    width = input.maxWidth
    height = width / input.ratio
  }
  let heightCapped = false
  if (height > input.maxHeight) {
    height = input.maxHeight
    width = height * input.ratio
    heightCapped = true
  }
  if (!heightCapped && (width < input.minWidth || height < minHeight)) {
    return { width: input.minWidth, height: snapNearInteger(minHeight) }
  }
  return { width, height: snapNearInteger(height) }
}

export function zoomDistance(distance: number, direction: 'in' | 'out'): number {
  const next = direction === 'in' ? distance / ZOOM_STEP : distance * ZOOM_STEP
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
}
