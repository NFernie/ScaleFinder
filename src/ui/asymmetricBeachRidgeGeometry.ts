import { asymmetricBeachRidgeStations } from '../core/asymmetricBeachRidgePlan'
import { beachRidgeRing, beachRidgeStations } from '../core/wfSchematic'
import { loftRidgeGeometry } from './beachRidgeGeometry'

export { asymmetricBeachRidgeStations }

/** Loft one asymmetric element. The asymmetric scene uses this for the left flank only. */
export function asymmetricBeachRidgeGeometry(side: 'l' | 'r', index: number) {
  return loftRidgeGeometry(asymmetricBeachRidgeStations('r', index), side)
}

export interface PlanEdgeSample {
  x: number
  zCentre: number
  zLand: number
  zSea: number
}

/** Samples for a 2D plan plot (+X alongshore, +Z seaward). */
export function asymmetricBeachRidgePlanSamples(side: 'l' | 'r', index: number): PlanEdgeSample[] {
  const stations = asymmetricBeachRidgeStations(side, index)
  return stations.map((station) => {
    const ring = beachRidgeRing(station)
    const zLand = ring.reduce((best, corner) => (corner.z < best ? corner.z : best), ring[0].z)
    const zSea = ring.reduce((best, corner) => (corner.z > best ? corner.z : best), ring[0].z)
    return { x: station.x, zCentre: station.z, zLand, zSea }
  })
}

export function symmetricBeachRidgePlanSamples(side: 'l' | 'r', index: number): PlanEdgeSample[] {
  const stations = beachRidgeStations(side, index)
  return stations.map((station) => {
    const ring = beachRidgeRing(station)
    const zLand = ring.reduce((best, corner) => (corner.z < best ? corner.z : best), ring[0].z)
    const zSea = ring.reduce((best, corner) => (corner.z > best ? corner.z : best), ring[0].z)
    return { x: station.x, zCentre: station.z, zLand, zSea }
  })
}

/** SVG plan view comparing symmetric (dashed) and asymmetric (solid) right-flank outlines. */
export function asymmetricBeachRidgePlanSvg(index = 3): string {
  const symmetric = symmetricBeachRidgePlanSamples('r', index)
  const asymmetric = asymmetricBeachRidgePlanSamples('r', index)
  const xs = [...symmetric, ...asymmetric].flatMap((s) => [s.x, s.x])
  const zs = [...symmetric, ...asymmetric].flatMap((s) => [s.zLand, s.zSea])
  const pad = 0.15
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minZ = Math.min(...zs) - pad
  const maxZ = Math.max(...zs) + pad
  const W = 900
  const H = 520
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * (W - 80) + 40
  const sy = (z: number) => H - 40 - ((z - minZ) / (maxZ - minZ)) * (H - 80)
  const map = (samples: PlanEdgeSample[]) => ({
    centre: samples.map((s) => ({ x: sx(s.x), y: sy(s.zCentre) })),
    sea: samples.map((s) => ({ x: sx(s.x), y: sy(s.zSea) })),
    land: samples.map((s) => ({ x: sx(s.x), y: sy(s.zLand) })),
  })
  const sym = map(symmetric)
  const asym = map(asymmetric)
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const symOutline = [...sym.sea, ...[...sym.land].reverse()].map((p) => ({ x: p.x, z: p.y }))
  const asymOutline = [...asym.sea, ...[...asym.land].reverse()].map((p) => ({ x: p.x, z: p.y }))
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="40" y="28" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="18">Beach ridge plan (+X right, +Z up = seaward)</text>
  <text x="40" y="48" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Index ${index} (most seaward). Dashed = symmetric concave seaward bow. Solid gold = asymmetric convex seaward bow.</text>
  <path d="${toPath(symOutline.map((p) => ({ x: p.x, y: p.z })))} Z" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
  <path d="${toPath(asymOutline.map((p) => ({ x: p.x, y: p.z })))} Z" fill="rgba(234,179,8,0.15)" stroke="#eab308" stroke-width="2.5"/>
  <path d="${toPath(sym.centre)}" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="4 4" opacity="0.7"/>
  <path d="${toPath(asym.centre)}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="${W - 280}" y="${H - 16}" fill="#94a3b8" font-size="12">Channel end → left (low |X|)</text>
</svg>`
}
