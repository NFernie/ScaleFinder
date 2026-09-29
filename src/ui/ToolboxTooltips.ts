import type { ToolId } from '../core/toolboxSession'

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
      'Paint on the map to trace a region by colour. Double-click to close the stroke. Adjust Radius and Contrast in the readout while drawing.',
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
