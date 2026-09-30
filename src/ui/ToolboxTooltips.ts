import type { LassoBehaviour } from '../core/lasso'
import type { ToolId } from '../core/toolboxSession'

export const LASSO_BEHAVIOUR_TIPS: Record<LassoBehaviour, string> = {
  dynamic: 'Each sample uses the colour under the pointer. The accepted colour can change along the stroke.',
  static: 'Every sample is compared with the colour under the first point. Later colours do not replace it.',
  outline: 'Click and drag the outline. The stroke is the Polygon. Map colour is ignored.',
}

export const VERTEX_EDIT_HINT =
  'Drag a corner to move it. Right-click a side or corner to add or delete a vertex.'

/** Locked readout titles from features/toolbox_ui_update.md. */
export const LASSO_RADIUS_TITLE =
  'Radius (8–128 px): Size of the colour-search disc around your brush. Low (8–24): tight, precise edges. High (64–128): grabs a wider area; use on large uniform regions; may include unlike colours.'

export const LASSO_CONTRAST_TITLE =
  'Contrast (0–255): How similar a pixel’s RGB must be to the seed colour. Low (0–16): only nearly identical colours. High (48–255): includes more variation; 32 is default. 255 is maximally permissive.'

export const TOOL_TIPS: Record<ToolId, { title: string; body: string }> = {
  polygon: {
    title: 'Polygon',
    body:
      'Click corners on the map. Double-click or Done to close. Area and Add to list when closed.',
  },
  ruler: {
    title: 'Ruler',
    body:
      'Click to measure distances along a path. Open chain only — no area. Done or double-click to finish.',
  },
  lasso: {
    title: 'Lasso',
    body:
      'Choose Dynamic, Static, or Outline in the readout, then paint on the map. Double-click to close.',
  },
  circle: {
    title: 'Circle',
    body: 'First click sets centre, second sets radius. Add to list when complete.',
  },
  square: {
    title: 'Square / Rectangle',
    body: 'Two clicks for opposite corners. Toggle square or rectangle in the readout.',
  },
}
