import { beachRidgeStations, type RidgeStation } from './wfSchematic'

/** Heading off the alongshore axis, toward +Z, for the run that leaves the channel. */
export const ASYM_RIDGE_CHANNEL_SEAWARD_DEG = 5

/**
 * Fraction of the alongshore length that stays on that seaward heading.
 * After this the centreline turns landward toward the outer tip.
 */
export const ASYM_RIDGE_SEAWARD_RUN = 0.15

/**
 * Plan centreline for one asymmetric beach ridge.
 *
 * Taper and cross-section match `beachRidgeStations`. The outer tip stays on
 * that centreline. From the channel end (the right tip of the left flank) the
 * centreline runs seaward at {@link ASYM_RIDGE_CHANNEL_SEAWARD_DEG} for the
 * first {@link ASYM_RIDGE_SEAWARD_RUN} of the alongshore length, then straight
 * to the outer tip. That leg is landward because the outer tip sits landward
 * of the bend.
 */
export function asymmetricBeachRidgeStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const standard = beachRidgeStations(side, index)
  const channel = standard[0]
  const tip = standard[standard.length - 1]
  const span = Math.abs(tip.x - channel.x)
  const bendAlong = ASYM_RIDGE_SEAWARD_RUN * span
  const seaward = Math.tan((ASYM_RIDGE_CHANNEL_SEAWARD_DEG * Math.PI) / 180)
  const zBend = channel.z + bendAlong * seaward
  const zAt = (along: number) => {
    if (along <= bendAlong || span === 0) return channel.z + along * seaward
    const u = (along - bendAlong) / (span - bendAlong)
    return zBend + (tip.z - zBend) * u
  }
  return withBendStation(standard, bendAlong).map((station) => ({
    ...station,
    z: zAt(Math.abs(station.x - channel.x)),
  }))
}

/** Insert a station at the seaward-to-landward turn so the loft corner sits on it. */
function withBendStation(stations: RidgeStation[], bendAlong: number): RidgeStation[] {
  const channelX = stations[0].x
  const tipX = stations[stations.length - 1].x
  const sign = Math.sign(tipX - channelX) || 1
  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i]
    const b = stations[i + 1]
    const alongA = Math.abs(a.x - channelX)
    const alongB = Math.abs(b.x - channelX)
    if (Math.abs(alongA - bendAlong) < 1e-9 || Math.abs(alongB - bendAlong) < 1e-9) return stations
    if (alongA < bendAlong && bendAlong < alongB) {
      const u = (bendAlong - alongA) / (alongB - alongA)
      const mix = (start: number, end: number) => start + (end - start) * u
      const bend: RidgeStation = {
        x: channelX + sign * bendAlong,
        z: mix(a.z, b.z),
        halfWidth: mix(a.halfWidth, b.halfWidth),
        height: mix(a.height, b.height),
      }
      return [...stations.slice(0, i + 1), bend, ...stations.slice(i + 1)]
    }
  }
  return stations
}
