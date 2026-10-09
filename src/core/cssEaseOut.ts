/**
 * CSS `ease-out`: cubic-bezier(0, 0, 0.58, 1).
 * Given elapsed fraction `t` (0–1), solve for Bezier parameter `u` where x(u) = t, then return y(u).
 */
export function cssEaseOut(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1

  const x1 = 0
  const y1 = 0
  const x2 = 0.58
  const y2 = 1

  const cx = 3 * x1
  const bx = 3 * (x2 - 2 * x1)
  const ax = 1 - cx - bx

  const cy = 3 * y1
  const by = 3 * (y2 - 2 * y1)
  const ay = 1 - cy - by

  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u
  const sampleDerivX = (u: number) => (3 * ax * u + 2 * bx) * u + cx

  let u = t
  for (let i = 0; i < 8; i += 1) {
    const x = sampleX(u) - t
    if (Math.abs(x) < 1e-6) break
    const dx = sampleDerivX(u)
    if (Math.abs(dx) < 1e-6) break
    u -= x / dx
    u = Math.min(1, Math.max(0, u))
  }

  const y = sampleY(u)
  return Math.min(1, Math.max(0, y))
}
