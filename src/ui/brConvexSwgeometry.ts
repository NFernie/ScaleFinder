import * as THREE from 'three'
import { BR_CONVEX_SW_BOW, brConvexSwStations } from '../core/brConvexSwPlan'
import { beachRidgeRing } from '../core/wfSchematic'

export { BR_CONVEX_SW_BOW, brConvexSwStations }

/**
 * Loft one convex-seaward beach ridge. The right flank follows the core
 * stations in +X. The left flank is that mesh mirrored in X, with winding
 * flipped. The Tfw scene draws the left flank with this loft. The nested
 * pose stays with the scene.
 */
export function brConvexSwGeometry(side: 'l' | 'r', index: number): THREE.BufferGeometry {
  const stations = brConvexSwStations('r', index)
  const positions: number[] = []
  const indices: number[] = []
  for (const station of stations) {
    for (const corner of beachRidgeRing(station)) {
      positions.push(corner.x, corner.y, corner.z)
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }
  const corners = beachRidgeRing(stations[0]).length
  for (let s = 0; s < stations.length - 1; s += 1) {
    const a = s * corners
    const b = (s + 1) * corners
    for (let i = 0; i < corners; i += 1) {
      const next = (i + 1) % corners
      quad(a + i, b + i, b + next, a + next)
    }
  }
  for (let i = 1; i < corners - 1; i += 1) indices.push(0, i, i + 1)
  const tip = (stations.length - 1) * corners
  for (let i = corners - 1; i >= 2; i -= 1) indices.push(tip, tip + i, tip + i - 1)
  if (side === 'l') {
    for (let i = 0; i < positions.length; i += 3) positions[i] = -positions[i]
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export interface PlanEdgeSample {
  x: number
  zCentre: number
  zLand: number
  zSea: number
}

/** Samples for a 2D plan plot (+X alongshore, +Z seaward). */
export function brConvexSwPlanSamples(side: 'l' | 'r', index: number): PlanEdgeSample[] {
  const stations = brConvexSwStations(side, index)
  return stations.map((station) => {
    const ring = beachRidgeRing(station)
    const zLand = ring.reduce((best, corner) => (corner.z < best ? corner.z : best), ring[0].z)
    const zSea = ring.reduce((best, corner) => (corner.z > best ? corner.z : best), ring[0].z)
    return { x: station.x, zCentre: station.z, zLand, zSea }
  })
}

/** Channel-end Z step used by the Wf ridge stack. Preview only; this mesh has no scene. */
const STACK_PREVIEW_STEP = 0.34

function planFrame(samples: PlanEdgeSample[], title: string, caption: string): string {
  const xs = samples.flatMap((s) => [s.x])
  const zs = samples.flatMap((s) => [s.zLand, s.zSea])
  const pad = 0.2
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minZ = Math.min(...zs) - pad
  const maxZ = Math.max(...zs) + pad
  const W = 960
  const H = 560
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * (W - 80) + 40
  const sy = (z: number) => H - 48 - ((z - minZ) / (maxZ - minZ)) * (H - 96)
  const sea: Array<{ x: number; y: number }> = []
  const land: Array<{ x: number; y: number }> = []
  const centre: Array<{ x: number; y: number }> = []
  for (const sample of samples) {
    sea.push({ x: sx(sample.x), y: sy(sample.zSea) })
    land.push({ x: sx(sample.x), y: sy(sample.zLand) })
    centre.push({ x: sx(sample.x), y: sy(sample.zCentre) })
  }
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const outline = [...sea, ...[...land].reverse()]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="40" y="28" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="18">${title}</text>
  <text x="40" y="50" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">${caption}</text>
  <path d="${toPath(outline)} Z" fill="rgba(234,179,8,0.18)" stroke="#eab308" stroke-width="2.5"/>
  <path d="${toPath(centre)}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="40" y="${H - 16}" fill="#94a3b8" font-size="12">+X right · +Z up = seaward · channel end at low |X|</text>
</svg>`
}

/** Plan of one right-flank element. +Z is up. */
export function brConvexSwPlanSvg(index = 3): string {
  return planFrame(
    brConvexSwPlanSamples('r', index),
    `BRconvexSW plan — index ${index}`,
    `Symmetrical bow, convex toward +Z, half the previous semicircle height. The section is the same from tip to tip.`,
  )
}

/**
 * Plan of five right-flank elements with the Wf channel-end Z step (0.34).
 * Index 0 is landward. Index 4 is the deepest, most seaward element.
 * This is a preview, not a placed scene.
 */
export function brConvexSwStackPlanSvg(): string {
  const ridges = Array.from({ length: 5 }, (_, index) => {
    const shift = index * STACK_PREVIEW_STEP
    return brConvexSwPlanSamples('r', index).map((sample) => ({
      x: sample.x,
      zCentre: sample.zCentre + shift,
      zLand: sample.zLand + shift,
      zSea: sample.zSea + shift,
    }))
  })
  const samples = ridges.flat()
  const xs = samples.map((s) => s.x)
  const zs = samples.flatMap((s) => [s.zLand, s.zSea])
  const pad = 0.2
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minZ = Math.min(...zs) - pad
  const maxZ = Math.max(...zs) + pad
  const W = 960
  const H = 640
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * (W - 80) + 40
  const sy = (z: number) => H - 48 - ((z - minZ) / (maxZ - minZ)) * (H - 96)
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const paths = ridges
    .map((ridge) => {
      const sea = ridge.map((s) => ({ x: sx(s.x), y: sy(s.zSea) }))
      const land = ridge.map((s) => ({ x: sx(s.x), y: sy(s.zLand) }))
      const centre = ridge.map((s) => ({ x: sx(s.x), y: sy(s.zCentre) }))
      const outline = [...sea, ...[...land].reverse()]
      return `<path d="${toPath(outline)} Z" fill="rgba(234,179,8,0.16)" stroke="#eab308" stroke-width="2"/>
  <path d="${toPath(centre)}" fill="none" stroke="#fbbf24" stroke-width="1.25"/>`
    })
    .join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="40" y="28" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="18">BRconvexSW stack preview — indices 0–4</text>
  <text x="40" y="50" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Same channel-end Z step as the symmetric and asymmetric ridge stacks (0.34). Not placed in a scene. +Z up.</text>
  ${paths}
  <text x="40" y="${H - 16}" fill="#94a3b8" font-size="12">+X right · +Z up = seaward · channel end at low |X| · index 4 is the seaward ridge</text>
</svg>`
}
