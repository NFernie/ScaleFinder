import { CHANNEL_LENGTH, CHANNEL_RADIUS, channelSpan, landwardMouthBarBaseY } from './wfSchematic'

/** Seaward opening width is this many times the landward width. */
export const TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO = 10

/** Total length is this multiple of `CHANNEL_LENGTH`. The extra length is landward. */
export const TIDAL_CHANNEL_LENGTH_SCALE = 1.5

/**
 * Flare length along Z, as a multiple of `CHANNEL_LENGTH`.
 * 1.2× the half-channel length, so the flare starts landward of the half channel's landward end.
 */
export const TIDAL_CHANNEL_TAPER_LENGTH_SCALE = 1.2

/**
 * Landward tip, seaward tip, and the station where the flare begins.
 * The seaward tip matches the half channel. The flare runs
 * {@link TIDAL_CHANNEL_TAPER_LENGTH_SCALE}× `CHANNEL_LENGTH` and therefore
 * starts landward of `−CHANNEL_LENGTH / 2`.
 * Z is in the channel mesh frame.
 */
export function tidalChannelSpan(): { landZ: number; seaZ: number; taperZ: number; length: number } {
  const seaZ = CHANNEL_LENGTH / 2
  const length = CHANNEL_LENGTH * TIDAL_CHANNEL_LENGTH_SCALE
  const landZ = seaZ - length
  const taperZ = seaZ - CHANNEL_LENGTH * TIDAL_CHANNEL_TAPER_LENGTH_SCALE
  return { landZ, seaZ, taperZ, length }
}

/**
 * Half-width at z. The centreline stays at x = 0. Width is constant on the
 * landward extension, then a u² flare from {@link tidalChannelSpan}.taperZ so
 * the walls stay inside the straight chord (concave toward the channel centre).
 */
export function tidalChannelRadiusAt(z: number): number {
  const { taperZ, seaZ } = tidalChannelSpan()
  const land = CHANNEL_RADIUS
  const sea = land * TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO
  if (z <= taperZ || seaZ === taperZ) return land
  const u = Math.min(1, Math.max(0, (z - taperZ) / (seaZ - taperZ)))
  return land + (sea - land) * u * u
}

/**
 * Depth of the curved base below the flat top (y = 0).
 * Landward of the flare the section is a semicircle, so depth equals the half-width.
 * From the flare start to the seaward tip the depth is constant and the floor
 * sits on the base of the most landward mouth bar.
 */
export function tidalChannelShallowDepth(): number {
  return channelSpan().flatY - landwardMouthBarBaseY()
}

/** Vertical radius of the base arc at z. X half-width stays {@link tidalChannelRadiusAt}. */
export function tidalChannelDepthAt(z: number): number {
  const { taperZ } = tidalChannelSpan()
  if (z < taperZ) return tidalChannelRadiusAt(z)
  return tidalChannelShallowDepth()
}
