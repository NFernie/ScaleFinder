import { beachRidgeStations, type RidgeStation } from './wfSchematic'

/**
 * How far the middle of the bow sits landward of the straight channel-to-tip chord.
 * The hollow faces +Z (seaward). Zero at both tips, fullest at mid-length.
 */
export const BR_CONCAVE_SW_BOW = 0.55

/**
 * Half-width at both tips as a fraction of the mid-element half-width.
 * The body stays close to uniform; the tips are only slightly narrower.
 */
export const BR_CONCAVE_SW_TIP_WIDTH_SCALE = 0.9

const BR_CONCAVE_SW_STATIONS = 25

/**
 * Plan centreline for one concave-seaward beach ridge (`BRconcaveSW`).
 *
 * Alongshore reach and height match `beachRidgeStations`. Both tips share the
 * channel-end Z, and the middle sits {@link BR_CONCAVE_SW_BOW} landward of
 * that line, so the bow is symmetrical and concave toward +Z. Width is fullest
 * at mid-length and tapers slightly at both tips. Index does not shear the
 * plan; a future scene supplies the same stack step as the other ridges.
 */
export function brConcaveSwStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const standard = beachRidgeStations(side, index)
  const channel = standard[0]
  const tip = standard[standard.length - 1]
  const midWidth = channel.halfWidth
  const stations: RidgeStation[] = []
  for (let i = 0; i < BR_CONCAVE_SW_STATIONS; i += 1) {
    const t = i / (BR_CONCAVE_SW_STATIONS - 1)
    const base = stationAt(standard, t)
    const bow = Math.sin(Math.PI * t)
    const x = channel.x + (tip.x - channel.x) * t
    stations.push({
      x,
      z: channel.z - BR_CONCAVE_SW_BOW * bow,
      halfWidth: midWidth * (BR_CONCAVE_SW_TIP_WIDTH_SCALE + (1 - BR_CONCAVE_SW_TIP_WIDTH_SCALE) * bow),
      height: base.height,
    })
  }
  return stations
}

function stationAt(stations: RidgeStation[], t: number): RidgeStation {
  const last = stations.length - 1
  const scaled = Math.min(last, Math.max(0, t * last))
  const index = Math.min(last - 1, Math.floor(scaled))
  const u = scaled - index
  const start = stations[index]
  const end = stations[index + 1]
  const mix = (a: number, b: number) => a + (b - a) * u
  return {
    x: mix(start.x, end.x),
    z: mix(start.z, end.z),
    halfWidth: mix(start.halfWidth, end.halfWidth),
    height: mix(start.height, end.height),
  }
}
