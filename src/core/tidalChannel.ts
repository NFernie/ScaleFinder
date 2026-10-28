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
 * Opacity of the tidal channel shell in the schematic view.
 * The shell was fully opaque; this is 50% transparency.
 */
export const TIDAL_CHANNEL_OPACITY = 0.5

/**
 * The floor's dip toward +Z is this multiple of the angle from the landward
 * floor down to the most landward mouth-bar base. The landward tip stays put.
 */
export const TIDAL_CHANNEL_DIP_ANGLE_SCALE = 1.2

/**
 * Heading of the reach from the landward tip to the flare start.
 * That reach turns this far from −Z toward −X, the left beach-ridge side.
 * The flare, from the taper station to the seaward tip, stays on the axis.
 */
export const TIDAL_CHANNEL_LANDWARD_TURN_RAD = (45 * Math.PI) / 180

/** Centreline point and the horizontal right axis at station `s` (`landZ` … `seaZ`). */
export interface TidalChannelFrame {
  s: number
  x: number
  z: number
  rightX: number
  rightZ: number
}

/**
 * Centreline frame. `s` is arc length along the old straight axis, so radius
 * and depth stay keyed to it. From the landward tip to the flare start the
 * centreline runs straight at {@link TIDAL_CHANNEL_LANDWARD_TURN_RAD} toward −X.
 * From the flare start to the seaward tip it stays on x = 0.
 */
export function tidalChannelFrameAt(s: number): TidalChannelFrame {
  const { taperZ } = tidalChannelSpan()
  if (s >= taperZ) return { s, x: 0, z: s, rightX: 1, rightZ: 0 }
  const run = taperZ - s
  const turn = TIDAL_CHANNEL_LANDWARD_TURN_RAD
  const landX = -Math.sin(turn)
  const landZ = -Math.cos(turn)
  const seawardX = -landX
  const seawardZ = -landZ
  return {
    s,
    x: landX * run,
    z: taperZ + landZ * run,
    rightX: seawardZ,
    rightZ: -seawardX,
  }
}

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
 * Depth below the flat top (y = 0) of the floor that sat on the most landward
 * mouth-bar base. That depth is the reference for the dip angle. The seaward
 * tip is deeper than this.
 */
export function tidalChannelReferenceDepth(): number {
  return channelSpan().flatY - landwardMouthBarBaseY()
}

/**
 * Floor depth at the landward tip and at the seaward tip.
 * The landward tip stays a semicircle (`CHANNEL_RADIUS`). The seaward tip is
 * low enough that the angle down toward +Z is {@link TIDAL_CHANNEL_DIP_ANGLE_SCALE}
 * times the angle from that landward floor to {@link tidalChannelReferenceDepth}.
 */
export function tidalChannelDip(): { landDepth: number; seaDepth: number } {
  const { length } = tidalChannelSpan()
  const landDepth = CHANNEL_RADIUS
  const drop = tidalChannelReferenceDepth() - landDepth
  const angle = Math.atan2(drop, length)
  const seaDepth = landDepth + length * Math.tan(angle * TIDAL_CHANNEL_DIP_ANGLE_SCALE)
  return { landDepth, seaDepth }
}

/**
 * Vertical radius of the base arc at z. X half-width stays {@link tidalChannelRadiusAt}.
 * Depth increases in a straight line from the landward tip to the seaward tip,
 * so the floor dips toward +Z and the seaward side sits deeper in Y.
 */
export function tidalChannelDepthAt(z: number): number {
  const { landZ, length } = tidalChannelSpan()
  const { landDepth, seaDepth } = tidalChannelDip()
  if (length === 0) return landDepth
  const u = Math.min(1, Math.max(0, (z - landZ) / length))
  return landDepth + (seaDepth - landDepth) * u
}
