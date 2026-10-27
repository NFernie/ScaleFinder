import { beachRidgeStations, type RidgeStation } from './wfSchematic'

const BR_CONCAVE_SW_STATIONS = 33

const reference = beachRidgeStations('r', 0)
const referenceTip = reference[reference.length - 1]

/**
 * Sagitta of the semicircular plan. Half the alongshore span, so the
 * centreline is a symmetrical U opening toward +Z.
 */
export const BR_CONCAVE_SW_BOW = Math.abs(referenceTip.x - reference[0].x) / 2

/**
 * Plan stations for one concave-seaward beach ridge (`BRconcaveSW`).
 *
 * The centreline is a semicircle. Both tips sit on the channel-end Z and the
 * middle is {@link BR_CONCAVE_SW_BOW} landward, so the hollow faces +Z.
 * Half-width and height stay the channel-end section for the whole arc.
 * Index does not change the plan.
 */
export function brConcaveSwStations(side: 'l' | 'r', index: number): RidgeStation[] {
  const standard = beachRidgeStations(side, index)
  const channel = standard[0]
  const tip = standard[standard.length - 1]
  const span = tip.x - channel.x
  const radius = Math.abs(span) / 2
  const midX = (channel.x + tip.x) / 2
  const sign = span >= 0 ? 1 : -1
  const stations: RidgeStation[] = []
  for (let i = 0; i < BR_CONCAVE_SW_STATIONS; i += 1) {
    const theta = (i / (BR_CONCAVE_SW_STATIONS - 1)) * Math.PI
    stations.push({
      x: midX - sign * radius * Math.cos(theta),
      z: channel.z - radius * Math.sin(theta),
      halfWidth: channel.halfWidth,
      height: channel.height,
    })
  }
  return stations
}
