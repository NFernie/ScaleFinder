import { beachRidgeStations, type RidgeStation } from './wfSchematic'

const BR_CONVEX_SW_STATIONS = 33

let bowCache: number | undefined

/**
 * Sagitta of the plan bow. A quarter of the alongshore span: half the
 * height of the previous semicircle, belly toward +Z.
 * Read on demand so this module can load while `wfSchematic` is still initialising.
 */
export function brConvexSwBow(): number {
  if (bowCache === undefined) {
    const reference = beachRidgeStations('r', 0)
    const tip = reference[reference.length - 1]
    bowCache = Math.abs(tip.x - reference[0].x) / 4
  }
  return bowCache
}

/**
 * Same length as {@link brConvexSwBow}. The span is the symmetric ridge’s
 * alongshore reach (outer 3.45 minus channel radius 0.1). Kept as a number so
 * this module can load before `beachRidgeStations` exists.
 */
export const BR_CONVEX_SW_BOW = (3.45 - 0.1) / 4

/**
 * Plan stations for one convex-seaward beach ridge (`BRconvexSW`).
 *
 * Alongshore X still traces a semicircle between the two tips. Z is half
 * that radius and positive, so the middle sits {@link BR_CONVEX_SW_BOW}
 * seaward of the tip chord and the belly faces +Z. Half-width and height
 * stay the channel-end section for the whole arc. Index does not change
 * the plan.
 */
export function brConvexSwStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const standard = beachRidgeStations(side, index)
  const channel = standard[0]
  const tip = standard[standard.length - 1]
  const span = tip.x - channel.x
  const radius = Math.abs(span) / 2
  const bow = radius / 2
  const midX = (channel.x + tip.x) / 2
  const sign = span >= 0 ? 1 : -1
  const stations: RidgeStation[] = []
  for (let i = 0; i < BR_CONVEX_SW_STATIONS; i += 1) {
    const theta = (i / (BR_CONVEX_SW_STATIONS - 1)) * Math.PI
    stations.push({
      x: midX - sign * radius * Math.cos(theta),
      z: channel.z + bow * Math.sin(theta),
      halfWidth: channel.halfWidth,
      height: channel.height,
    })
  }
  return stations
}
