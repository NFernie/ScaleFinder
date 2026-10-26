import * as THREE from 'three'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

/** Seaward opening width is this many times the landward width (same length as `halfChannelGeometry`). */
export const TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO = 5

const ARC_SEGMENTS = 24
const LENGTH_RINGS = 20

function radiusAt(z: number, halfLength: number, landRadius: number): number {
  const t = (z + halfLength) / (2 * halfLength)
  return landRadius * (1 + (TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO - 1) * t)
}

/**
 * Funnel tidal channel along +Z. Each cross-section is a half circle: flat at y = 0,
 * arc to y = −radius(z). Landward (−Z) uses `CHANNEL_RADIUS`; seaward (+Z) is
 * {@link TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO}× wider. Length matches `halfChannelGeometry`.
 * Origin: centre of the flat top at mid-length (y = 0, z = 0), same framing as `halfChannelGeometry`.
 */
export function tidalChannelGeometry(): THREE.BufferGeometry {
  const half = CHANNEL_LENGTH / 2
  const landRadius = CHANNEL_RADIUS
  const positions: number[] = []
  const indices: number[] = []
  const ringStarts: number[] = []

  const pushArc = (z: number) => {
    const radius = radiusAt(z, half, landRadius)
    const start = positions.length / 3
    ringStarts.push(start)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      positions.push(radius * Math.sin(theta), -radius * Math.cos(theta), z)
    }
    return start
  }

  for (let ring = 0; ring <= LENGTH_RINGS; ring += 1) {
    const z = -half + (ring / LENGTH_RINGS) * (2 * half)
    pushArc(z)
  }

  for (let ring = 0; ring < LENGTH_RINGS; ring += 1) {
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
    const radius = radiusAt(z, half, landRadius)
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
  cap(-half, -1)
  cap(half, 1)

  const rLand = landRadius
  const rSea = landRadius * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
  const flat = positions.length / 3
  positions.push(-rLand, 0, -half, rLand, 0, -half, rSea, 0, half, -rSea, 0, half)
  indices.push(flat, flat + 1, flat + 2, flat, flat + 3, flat + 2)

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
  const half = CHANNEL_LENGTH / 2
  const landRadius = CHANNEL_RADIUS
  const rings: TidalChannelPlanRing[] = []
  for (let ring = 0; ring <= LENGTH_RINGS; ring += 1) {
    const z = -half + (ring / LENGTH_RINGS) * (2 * half)
    const radius = radiusAt(z, half, landRadius)
    rings.push({ z, xLeft: -radius, xRight: radius, zArcDeep: -radius })
  }
  return rings
}

/** SVG plan: solid = tidal funnel; dashed = constant-width half channel for comparison. */
export function tidalChannelPlanSvg(): string {
  const half = CHANNEL_LENGTH / 2
  const landRadius = CHANNEL_RADIUS
  const seaRadius = landRadius * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
  const tidal = tidalChannelPlanSamples()
  const xs = tidal.flatMap((r) => [r.xLeft, r.xRight])
  const zs = tidal.flatMap((r) => [r.z, r.zArcDeep])
  xs.push(-landRadius, landRadius, -seaRadius, seaRadius)
  zs.push(-half, half)
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
  /** Flat-top footprint in plan (arc depth is below y = 0 and does not widen the XZ outline). */
  const funnelOutline = [
    { x: sx(-landRadius), y: sy(-half) },
    { x: sx(landRadius), y: sy(-half) },
    { x: sx(seaRadius), y: sy(half) },
    { x: sx(-seaRadius), y: sy(half) },
  ]
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
  <text x="40" y="56" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Gold = funnel (5× width at seaward end). Dashed = existing half channel (constant width). Landward at bottom.</text>
  <path d="${toPath(constantOutline)} Z" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <path d="${toPath(funnelOutline)} Z" fill="rgba(251,191,36,0.22)" stroke="#fbbf24" stroke-width="2.5"/>
  <line x1="${sx(0)}" y1="${sy(-half)}" x2="${sx(0)}" y2="${sy(half)}" stroke="#475569" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="${W - 320}" y="${H - 18}" fill="#94a3b8" font-size="12">Length ${CHANNEL_LENGTH.toFixed(2)} (same as half channel)</text>
</svg>`
}
