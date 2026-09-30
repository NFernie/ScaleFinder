export const RING_HIT_PX = 12
export const RING_CORNER_PX = 1

export interface ScreenPoint {
  x: number
  y: number
}

export interface RingHit {
  part: number
  side: number
  corner: number
  cornerPart: number
  at: ScreenPoint
  onCorner: boolean
}

function hypot(x: number, y: number): number {
  return Math.hypot(x, y)
}

function closestOnSegment(a: ScreenPoint, b: ScreenPoint, p: ScreenPoint): { at: ScreenPoint; distance: number } {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return { at: { x: a.x, y: a.y }, distance: hypot(p.x - a.x, p.y - a.y) }
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2))
  const at = { x: a.x + abx * t, y: a.y + aby * t }
  return { at, distance: hypot(p.x - at.x, p.y - at.y) }
}

export function nearestRingHit(rings: ScreenPoint[][], click: ScreenPoint, maxPx = RING_HIT_PX): RingHit | null {
  let bestSide: { part: number; side: number; at: ScreenPoint; distance: number } | null = null
  let bestCorner: { part: number; corner: number; distance: number } | null = null
  rings.forEach((ring, part) => {
    ring.forEach((point, index) => {
      const next = ring[(index + 1) % ring.length]
      if (!next || ring.length < 2) return
      const projected = closestOnSegment(point, next, click)
      if (!bestSide || projected.distance < bestSide.distance) {
        bestSide = { part, side: index, at: projected.at, distance: projected.distance }
      }
      const cornerDistance = hypot(click.x - point.x, click.y - point.y)
      if (!bestCorner || cornerDistance < bestCorner.distance) {
        bestCorner = { part, corner: index, distance: cornerDistance }
      }
    })
  })
  if (!bestSide || !bestCorner) return null
  if (bestSide.distance > maxPx && bestCorner.distance > maxPx) return null
  const end = rings[bestSide.part][(bestSide.side + 1) % rings[bestSide.part].length]
  const start = rings[bestSide.part][bestSide.side]
  const onCorner =
    hypot(bestSide.at.x - start.x, bestSide.at.y - start.y) <= RING_CORNER_PX ||
    hypot(bestSide.at.x - end.x, bestSide.at.y - end.y) <= RING_CORNER_PX
  return {
    part: bestSide.part,
    side: bestSide.side,
    corner: bestCorner.corner,
    cornerPart: bestCorner.part,
    at: bestSide.at,
    onCorner,
  }
}
