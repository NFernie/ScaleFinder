import { LengthUnit } from './types'

const METRES_PER_UNIT: Record<LengthUnit, number> = {
  m: 1,
  ft: 0.3048,
  km: 1000,
}

/** Convert a length value expressed in `unit` into metres. */
export function toMetres(value: number, unit: LengthUnit): number {
  return value * METRES_PER_UNIT[unit]
}

/** Convert a length in metres into `unit`. */
export function fromMetres(metres: number, unit: LengthUnit): number {
  return metres / METRES_PER_UNIT[unit]
}

export const LENGTH_UNITS: LengthUnit[] = ['m', 'ft', 'km']
