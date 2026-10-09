export const FRAME_START = { width: 328, height: 224 }
export const FRAME_INSET_PX = 12
export const FRAME_KEY_STEP_PX = 16
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
