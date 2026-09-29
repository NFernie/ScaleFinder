const MAX_PAN_PX = 16

function axisDelta(pos: number, span: number, edgePx: number): number {
  if (span <= edgePx * 2) return 0
  let raw = 0
  if (pos <= edgePx) raw = pos - edgePx
  else if (pos >= span - edgePx) raw = pos - (span - edgePx)
  return Math.max(-MAX_PAN_PX, Math.min(MAX_PAN_PX, raw))
}

export function edgePanDelta(
  pointer: { x: number; y: number },
  viewport: { width: number; height: number },
  edgePx: number,
): { x: number; y: number } {
  return {
    x: axisDelta(pointer.x, viewport.width, edgePx),
    y: axisDelta(pointer.y, viewport.height, edgePx),
  }
}
