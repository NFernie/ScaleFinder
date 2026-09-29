import type { ToolId } from '../core/toolboxSession'

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
