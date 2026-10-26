import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

/** Seaward opening width is this many times the landward width. */
export const TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO = 5

/** Total length is this multiple of `CHANNEL_LENGTH`. The extra length is landward. */
export const TIDAL_CHANNEL_LENGTH_SCALE = 1.5

const ARC_SEGMENTS = 24
const LAND_RINGS = 8
const TAPER_RINGS = 16

/**
 * Landward tip, seaward tip, and the station where the flare begins.
 * The flare starts at the landward end of the half channel (`−CHANNEL_LENGTH / 2`).
 */
export function tidalChannelSpan(): { landZ: number; seaZ: number; taperZ: number; length: number } {
  const seaZ = CHANNEL_LENGTH / 2
  const length = CHANNEL_LENGTH * TIDAL_CHANNEL_LENGTH_SCALE
  const landZ = seaZ - length
  return { landZ, seaZ, taperZ: -CHANNEL_LENGTH / 2, length }
}

/**
 * Half-width at z. Constant on the landward extension, then a u² flare from the
 * half channel's landward end so the walls stay inside the straight chord
 * (concave toward the channel centre).
 */
export function tidalChannelRadiusAt(z: number): number {
  const { taperZ, seaZ } = tidalChannelSpan()
  const land = CHANNEL_RADIUS
  const sea = land * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
  if (z <= taperZ || seaZ === taperZ) return land
  const u = Math.min(1, Math.max(0, (z - taperZ) / (seaZ - taperZ)))
  return land + (sea - land) * u * u
}

function sampleZ(): number[] {
  const { landZ, seaZ, taperZ } = tidalChannelSpan()
  const zs: number[] = []
  for (let i = 0; i <= LAND_RINGS; i += 1) zs.push(landZ + ((taperZ - landZ) * i) / LAND_RINGS)
  for (let i = 1; i <= TAPER_RINGS; i += 1) zs.push(taperZ + ((seaZ - taperZ) * i) / TAPER_RINGS)
  return zs
}

/**
 * Funnel tidal channel along +Z. Each cross-section is a half circle: flat at y = 0,
 * arc to y = −radius(z). Landward width matches the half channel. Total length is
 * {@link TIDAL_CHANNEL_LENGTH_SCALE}× `CHANNEL_LENGTH`, with the extra length landward
 * and the seaward tip kept at the half channel's seaward tip. Width stays constant until
 * the half channel's landward end, then flares with a curve concave toward the centre to
 * {@link TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO}× at the seaward end.
 */
export function tidalChannelGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const ringStarts: number[] = []
  const zs = sampleZ()

  const pushArc = (z: number) => {
    const radius = tidalChannelRadiusAt(z)
    const start = positions.length / 3
    ringStarts.push(start)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    return start
  }

  for (const z of zs) pushArc(z)

  for (let ring = 0; ring < zs.length - 1; ring += 1) {
    const a = ringStarts[ring]
    const b = ringStarts[ring + 1]
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      const a0 = a + i
      const a1 = a + i + 1
      const b0 = b + i
      const b1 = b + i + 1
      indices.push(a0, b0, a1, a1, b0, b1)
    }
  }

  const cap = (z: number, outward: 1 | -1) => {
    const radius = tidalChannelRadiusAt(z)
    const start = positions.length / 3
    positions.push(0, 0, z)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      if (outward === 1) indices.push(start, start + i + 1, start + i + 2)
      else indices.push(start, start + i + 2, start + i + 1)
    }
  }
  cap(zs[0], -1)
  cap(zs[zs.length - 1], 1)

  for (let ring = 0; ring < zs.length - 1; ring += 1) {
    const left = ringStarts[ring]
    const right = ringStarts[ring] + ARC_SEGMENTS
    const nextLeft = ringStarts[ring + 1]
    const nextRight = ringStarts[ring + 1] + ARC_SEGMENTS
    indices.push(left, nextRight, right, left, nextLeft, nextRight)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export interface TidalChannelPlanRing {
  z: number
  xLeft: number
  xRight: number
  zArcDeep: number
}

/** Plan-view outline samples (+X right, +Z up = seaward in SVG). */
export function tidalChannelPlanSamples(): TidalChannelPlanRing[] {
  return sampleZ().map((z) => {
    const radius = tidalChannelRadiusAt(z)
    return { z, xLeft: -radius, xRight: radius, zArcDeep: -radius }
  })
}

/** SVG plan: solid = tidal funnel; dashed = constant-width half channel for comparison. */
export function tidalChannelPlanSvg(): string {
  const half = CHANNEL_LENGTH / 2
  const landRadius = CHANNEL_RADIUS
  const { landZ, seaZ, taperZ, length } = tidalChannelSpan()
  const tidal = tidalChannelPlanSamples()
  const xs = tidal.flatMap((r) => [r.xLeft, r.xRight])
  const zs = tidal.map((r) => r.z)
  xs.push(-landRadius, landRadius)
  zs.push(-half, half, landZ, seaZ)
  const pad = 0.08
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minZ = Math.min(...zs) - pad
  const maxZ = Math.max(...zs) + pad
  const W = 920
  const H = 640
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * (W - 80) + 40
  const sy = (z: number) => H - 40 - ((z - minZ) / (maxZ - minZ)) * (H - 80)
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const right = tidal.map((r) => ({ x: sx(r.xRight), y: sy(r.z) }))
  const left = [...tidal].reverse().map((r) => ({ x: sx(r.xLeft), y: sy(r.z) }))
  const constantOutline = [
    { x: sx(-landRadius), y: sy(-half) },
    { x: sx(landRadius), y: sy(-half) },
    { x: sx(landRadius), y: sy(half) },
    { x: sx(-landRadius), y: sy(half) },
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="40" y="32" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="20">Tidal channel plan (+X right, +Z up = seaward)</text>
  <text x="40" y="56" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Gold = 1.5× length. Straight until the half channel's landward end, then a flare concave toward the centre (5× at the sea). Dashed = half channel.</text>
  <path d="${toPath(constantOutline)} Z" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <path d="${toPath([...right, ...left])} Z" fill="rgba(251,191,36,0.22)" stroke="#fbbf24" stroke-width="2.5"/>
  <line x1="${sx(-landRadius)}" y1="${sy(taperZ)}" x2="${sx(landRadius)}" y2="${sy(taperZ)}" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="${sx(landRadius) + 8}" y="${sy(taperZ) + 4}" fill="#7dd3fc" font-size="12">taper starts</text>
  <text x="${W - 360}" y="${H - 18}" fill="#94a3b8" font-size="12">Length ${length.toFixed(2)} (1.5× half channel ${CHANNEL_LENGTH.toFixed(2)})</text>
</svg>`
}
