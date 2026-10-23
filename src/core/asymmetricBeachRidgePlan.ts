import { beachRidgeStations, type RidgeStation } from './wfSchematic'

/**
 * Alongshore fraction where the seaward bow is fullest.
 * This is in the channel half of the element.
 */
export const ASYM_RIDGE_CREST = 0.33

/**
 * How far the crest sits seaward of the straight channel-to-tip chord,
 * in the same units as the symmetric centreline.
 */
export const ASYM_RIDGE_BOW = 0.72

/** Where the bow starts easing onto the symmetric centreline. */
const ASYM_RIDGE_BLEND = 0.58

const ASYM_RIDGE_STATIONS = 25

/**
 * Plan centreline for one asymmetric beach ridge.
 *
 * Taper and cross-section match `beachRidgeStations`. Both tips stay on that
 * centreline. Between them the ridge is a crescent: a smooth seaward bow whose
 * crest is in the channel half, then a curve that flattens onto the symmetric
 * centreline at the outer tip. On the left flank the channel end is the right tip.
 */
export function asymmetricBeachRidgeStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const standard = beachRidgeStations(side, index)
  const channel = standard[0]
  const tip = standard[standard.length - 1]
  const chordZ = (t: number) => channel.z + (tip.z - channel.z) * t
  const stations: RidgeStation[] = []
  for (let i = 0; i < ASYM_RIDGE_STATIONS; i += 1) {
    const t = i / (ASYM_RIDGE_STATIONS - 1)
    const base = stationAt(standard, t)
    let z = chordZ(t) + ASYM_RIDGE_BOW * bowHump(t)
    if (t > ASYM_RIDGE_BLEND) {
      const blend = smoothstep((t - ASYM_RIDGE_BLEND) / (1 - ASYM_RIDGE_BLEND))
      z = (1 - blend) * z + blend * base.z
    }
    stations.push({ ...base, z })
  }
  return stations
}

/** Seaward hump. Zero at both tips, fullest at {@link ASYM_RIDGE_CREST}. */
function bowHump(t: number): number {
  const mode = ASYM_RIDGE_CREST
  const a = 1.15
  const b = (a * (1 - mode)) / mode
  const peak = mode ** a * (1 - mode) ** b
  return (t ** a * (1 - t) ** b) / peak
}

function smoothstep(u: number): number {
  const x = Math.min(1, Math.max(0, u))
  return x * x * (3 - 2 * x)
}

/** X, width, and height are linear in alongshore fraction on the symmetric ridge. */
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
