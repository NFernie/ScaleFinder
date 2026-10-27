import { tidalChannelRadiusAt } from './tidalChannel'
import {
  beachRidgeStations,
  bodyCenter,
  CHANNEL_RADIUS,
  EXPLODE_SPREAD,
  sceneAt as wfSceneAt,
  type PlacedBody,
  type SceneBody,
} from './wfSchematic'

/** Map pin for the Tfw element-complex set. Latitude −19.984295231442236, longitude 119.165775381814. */
export const TFW_ECS_ANCHOR = { lat: -19.984295231442236, lng: 119.165775381814 } as const

const NAMES: Record<string, string> = {
  ecs: 'Tfw element complex set',
  'ec-lobe': 'Tfw-Lobe',
  'ec-mouth': 'Tfw-Mouth Bar',
}

/**
 * Outward X shift for one beach ridge so its channel-end centreline sits on the
 * tidal-channel wall at that ridge's channel-end Z.
 */
export function tfwRidgeShift(bodyId: string): number {
  const rested = wfSceneAt(0)
  const ridge = rested.find((body) => body.id === bodyId)
  const channel = rested.find((body) => body.id === 'e-channel')
  if (!ridge || ridge.kind !== 'beach-ridge' || !channel) return 0
  const side = bodyId.includes('-r-') ? 'r' : 'l'
  const index = Number(bodyId.slice(bodyId.lastIndexOf('-') + 1))
  const stations = beachRidgeStations(side, Number.isFinite(index) ? index : 0)
  const localZ = ridge.nested.z + stations[0].z - channel.nested.z
  const sign = side === 'r' ? 1 : -1
  return sign * (tidalChannelRadiusAt(localZ) - CHANNEL_RADIUS)
}

function shiftedBody(body: SceneBody): SceneBody {
  const shift = body.kind === 'beach-ridge' ? tfwRidgeShift(body.id) : 0
  return {
    ...body,
    name: NAMES[body.id] ?? body.name,
    nested: { ...body.nested, x: body.nested.x + shift },
  }
}

/**
 * Tfw element complex set. Same ranks, mouth-bar fans, and ridge stack as the
 * symmetric Wf scene. The channel is the tidal funnel. Both beach-ridge flanks
 * use the asymmetric loft, and each ridge is shifted in X so its channel end
 * follows the funnel wall.
 */
export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const spread = 1 + (EXPLODE_SPREAD - 1) * t
  return wfSceneAt(t).map((body) => {
    const shifted = shiftedBody(body)
    if (shifted.nested.x === body.nested.x) {
      return { ...shifted, position: body.position, showLabel: body.showLabel }
    }
    if (spread === 1) {
      return { ...shifted, position: shifted.nested, showLabel: body.showLabel }
    }
    const localX = bodyCenter(shifted).x - shifted.nested.x
    const centerX = bodyCenter(shifted).x
    return {
      ...shifted,
      position: { ...body.position, x: centerX * spread - localX },
      showLabel: body.showLabel,
    }
  })
}
