import { LengthUnit } from '../core/types'

export interface Sample {
  id: string
  fileName: string
  unit: LengthUnit
  text: string
}

/** Delta-lobe-like polygon, ~18 km across, in metres (X,Y,Z). */
const DELTA_LOBE = `X,Y,Z
0,0,2
9000,1500,3
14000,7000,4
11000,13000,3
3000,14000,2
-4000,9000,2
-3000,3000,3`

/** Small field, ~3 km across, in metres (X,Y,Z). */
const SMALL_FIELD = `X,Y,Z
0,0,120
2600,300,124
3000,1600,126
1800,2400,123
200,1900,121
-400,700,120`

export const SAMPLES: Record<string, Sample> = {
  'delta-lobe': {
    id: 'delta-lobe',
    fileName: 'sample-delta-lobe.csv',
    unit: 'm',
    text: DELTA_LOBE,
  },
  'small-field': {
    id: 'small-field',
    fileName: 'sample-small-field.csv',
    unit: 'm',
    text: SMALL_FIELD,
  },
}
