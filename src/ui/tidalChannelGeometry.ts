import * as THREE from 'three'
import {
  TIDAL_CHANNEL_LENGTH_SCALE,
  TIDAL_CHANNEL_OPACITY,
  TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO,
  tidalChannelDepthAt,
  tidalChannelFrameAt,
  tidalChannelRadiusAt,
  tidalChannelSpan,
} from '../core/tidalChannel'
import { CHANNEL_LENGTH, CHANNEL_RADIUS } from '../core/wfSchematic'

export {
  TIDAL_CHANNEL_LENGTH_SCALE,
  TIDAL_CHANNEL_OPACITY,
  TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO,
  tidalChannelDepthAt,
  tidalChannelFrameAt,
  tidalChannelRadiusAt,
  tidalChannelSpan,
}

const ARC_SEGMENTS = 24
const LAND_RINGS = 8
const TAPER_RINGS = 16

function sampleS(): number[] {
  const { landZ, seaZ, taperZ } = tidalChannelSpan()
  const stations: number[] = []
  for (let i = 0; i <= LAND_RINGS; i += 1) stations.push(landZ + ((taperZ - landZ) * i) / LAND_RINGS)
  for (let i = 1; i <= TAPER_RINGS; i += 1) stations.push(taperZ + ((seaZ - taperZ) * i) / TAPER_RINGS)
  return stations
}

function place(s: number, localX: number, localY: number): [number, number, number] {
  const frame = tidalChannelFrameAt(s)
  return [frame.x + localX * frame.rightX, localY, frame.z + localX * frame.rightZ]
}

/**
 * Funnel tidal channel along +Z. Flat top at y = 0, curved base below it.
 * The landward tip stays a semicircle. The floor then dips in a straight line
 * toward +Z, so the seaward tip is deeper. Landward width matches the half channel.
 * Total length is
 * {@link TIDAL_CHANNEL_LENGTH_SCALE}× `CHANNEL_LENGTH`, with the extra length landward
 * and the seaward tip kept at the half channel's seaward tip. From the landward tip
 * to the flare start the centreline turns 45° toward −X. Width stays constant on
 * that reach, then opens with a curve concave toward the centre to
 * {@link TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO}× at the seaward end. The flare stays on
 * x = 0. Faces point outward so the orange material covers the flat top, the arc,
 * and both end caps out to those dimensions. The Tfw view draws that shell at
 * {@link TIDAL_CHANNEL_OPACITY}.
 */
export function tidalChannelGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const ringStarts: number[] = []
  const stations = sampleS()

  const pushArc = (s: number) => {
    const xRadius = tidalChannelRadiusAt(s)
    const yRadius = tidalChannelDepthAt(s)
    const start = positions.length / 3
    ringStarts.push(start)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      const [x, y, z] = place(s, xRadius * Math.sin(theta), -yRadius * Math.cos(theta))
      positions.push(x, y, z)
    }
    return start
  }

  for (const s of stations) pushArc(s)

  for (let ring = 0; ring < stations.length - 1; ring += 1) {
    const a = ringStarts[ring]
    const b = ringStarts[ring + 1]
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      const a0 = a + i
      const a1 = a + i + 1
      const b0 = b + i
      const b1 = b + i + 1
      indices.push(a0, a1, b0, a1, b1, b0)
    }
  }

  const cap = (s: number, outward: 1 | -1) => {
    const xRadius = tidalChannelRadiusAt(s)
    const yRadius = tidalChannelDepthAt(s)
    const start = positions.length / 3
    const [cx, cy, cz] = place(s, 0, 0)
    positions.push(cx, cy, cz)
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = -Math.PI / 2 + (i / ARC_SEGMENTS) * Math.PI
      const [x, y, z] = place(s, xRadius * Math.sin(theta), -yRadius * Math.cos(theta))
      positions.push(x, y, z)
    }
    for (let i = 0; i < ARC_SEGMENTS; i += 1) {
      if (outward === 1) indices.push(start, start + i + 1, start + i + 2)
      else indices.push(start, start + i + 2, start + i + 1)
    }
  }
  cap(stations[0], -1)
  cap(stations[stations.length - 1], 1)

  for (let ring = 0; ring < stations.length - 1; ring += 1) {
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
  /** Station along the old straight axis. Radius and depth use this. */
  s: number
  /** Centreline. */
  x: number
  z: number
  xLeft: number
  zLeft: number
  xRight: number
  zRight: number
  zArcDeep: number
}

/** Plan-view outline samples (+X right, +Z up = seaward in SVG). */
export function tidalChannelPlanSamples(): TidalChannelPlanRing[] {
  return sampleS().map((s) => {
    const radius = tidalChannelRadiusAt(s)
    const frame = tidalChannelFrameAt(s)
    return {
      s,
      x: frame.x,
      z: frame.z,
      xLeft: frame.x - radius * frame.rightX,
      zLeft: frame.z - radius * frame.rightZ,
      xRight: frame.x + radius * frame.rightX,
      zRight: frame.z + radius * frame.rightZ,
      zArcDeep: -tidalChannelDepthAt(s),
    }
  })
}

/** SVG plan: solid = tidal funnel; dashed = constant-width half channel for comparison. */
export function tidalChannelPlanSvg(): string {
  const half = CHANNEL_LENGTH / 2
  const landRadius = CHANNEL_RADIUS
  const { landZ, seaZ, taperZ, length } = tidalChannelSpan()
  const tidal = tidalChannelPlanSamples()
  const xs = tidal.flatMap((r) => [r.xLeft, r.xRight, r.x])
  const zs = tidal.flatMap((r) => [r.z, r.zLeft, r.zRight])
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
  const right = tidal.map((r) => ({ x: sx(r.xRight), y: sy(r.zRight) }))
  const left = [...tidal].reverse().map((r) => ({ x: sx(r.xLeft), y: sy(r.zLeft) }))
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
  <text x="40" y="56" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Gold = 1.5× length. Landward of the flare the centreline turns 45° toward −X. The flare opens to 10× at the sea. Dashed = half channel.</text>
  <path d="${toPath(constantOutline)} Z" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <path d="${toPath([...right, ...left])} Z" fill="rgba(251,191,36,0.22)" stroke="#fbbf24" stroke-width="2.5"/>
  <line x1="${sx(-landRadius)}" y1="${sy(taperZ)}" x2="${sx(landRadius)}" y2="${sy(taperZ)}" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="${sx(landRadius) + 8}" y="${sy(taperZ) + 4}" fill="#7dd3fc" font-size="12">taper starts</text>
  <text x="${W - 360}" y="${H - 18}" fill="#94a3b8" font-size="12">Length ${length.toFixed(2)} (1.5× half channel ${CHANNEL_LENGTH.toFixed(2)})</text>
</svg>`
}
