import { CHANNEL_LENGTH, CHANNEL_RADIUS } from './wfSchematic'

/** Seaward opening width is this many times the landward width. */
export const TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO = 5

/** Total length is this multiple of `CHANNEL_LENGTH`. The extra length is landward. */
export const TIDAL_CHANNEL_LENGTH_SCALE = 1.5

/**
 * Landward tip, seaward tip, and the station where the flare begins.
 * The flare starts at the landward end of the half channel (`−CHANNEL_LENGTH / 2`).
 * Z is in the channel mesh frame: the seaward tip matches the half channel.
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
