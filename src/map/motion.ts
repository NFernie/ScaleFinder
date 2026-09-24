/** Ease-out that starts fast. UI motion stays under 300ms. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - (1 - clamped) ** 3
}

/** Turn from `from` toward `to` along the short arc. `t` is 0–1. */
export function approachAngle(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180
  return from + delta * easeOutCubic(t)
}
