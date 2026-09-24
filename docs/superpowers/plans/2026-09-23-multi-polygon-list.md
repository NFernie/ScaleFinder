# Multi-Polygon list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one session hold several Polygons, each with its own centre, colour, and import unit.

**Architecture:** Pure list rules live in `src/core/polygonList.ts`. The app stores an ordered `PolygonItem[]` plus the unit for the next import. Each selected Polygon is projected with the existing `projectToGeographic` and drawn by its own `PolygonOverlay`. The sidebar list reuses `ScaleReadout` and `PolygonPreview`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, Vitest, Testing Library, MapLibre via react-map-gl.

## Global Constraints

- Import adds a Polygon. A bad file leaves the list unchanged and shows the existing error.
- No delete control. Deselect hides the Polygon and keeps the row.
- New Polygon is appended, selected, coloured with the next unused swatch, and centred on the uppermost selected Polygon, or the map centre when none are selected.
- Re-centre appears only when two or more are selected. It copies the uppermost selected centre onto the other selected Polygons.
- Choosing a region flies there and stacks every selected Polygon on that region. Deselected Polygons stay put. A failed search moves nothing.
- Swatches in order: `#2dd4bf`, `#f59e0b`, `#38bdf8`, `#fb7185`, `#a3e635`, `#a78bfa`, `#fb923c`. After all seven are in use, assignment starts again at teal.
- The unit control applies only to the next import. Each Polygon remembers its unit. Samples set the control to the sample unit.
- Figures stay in metres, hectares, and kilometres. `characteristicLengthM` is not renamed.
- Only one figure note is open in the sidebar. Notes, equations, and snapshot file names stay as they are.
- Fill opacity 0.32, outline width 2, same colour. Marker keeps the white border and 44px target.
- Empty map: "Import a Polygon to place it here at true ground scale." All off: "Switch a Polygon on to show it here."
- Export hint: "Import a Polygon to export" when the list is empty. "Switch a Polygon on to export" when every row is off.
- Drag line, when any Polygon is selected: "Drag a marker on the map to reposition that Polygon. It stays at true ground scale."
- Update `ScaleFinderPurpose.md` so a session list is in scope and a saved library stays out of scope.
- MapLibre behaviour is checked by hand. Unit tests do not mount the map.

---

### Task 1: Pure list rules

**Files:**
- Create: `src/core/polygonList.ts`
- Test: `src/core/polygonList.test.ts`

**Interfaces:**
- Produces: `POLYGON_COLOURS`, `PolygonItem`, `nextColour`, `centreForNewPolygon`, `appendPolygon`, `reCentreSelected`, `stackSelectedOn`, `verticesForPolygon`

- [x] Write failing tests for next colour, new centre, append, re-centre, region stack, and feet-to-metres.
- [x] Run `npm run test -- src/core/polygonList.test.ts` and confirm failure.
- [x] Implement the module.
- [x] Re-run the test and confirm pass.
- [x] Commit.

### Task 2: Sidebar list and map drawing

**Files:**
- Modify: `src/map/PolygonOverlay.tsx` — `id`, `colour`, `sourceName`
- Modify: `src/ui/PolygonPreview.tsx` — `colour`, compact size
- Modify: `src/ui/ScaleReadout.tsx` — optional controlled `openLabel`
- Create: `src/ui/PolygonList.tsx`
- Modify: `src/ui/ImportPanel.tsx` — samples are not toggles; Loaded line hides while an error is shown
- Modify: `src/App.tsx` — list state replaces `loaded` and `anchor`
- Modify: `src/ui/ImportPanel.test.tsx`
- Create: `src/App.test.tsx`
- Modify: `ScaleFinderPurpose.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: Task 1 functions
- `PolygonOverlay` props: `id: string`, `ring: LngLat[]`, `anchor: LngLat`, `colour: string`, `sourceName: string`, `onAnchorChange: (next: LngLat) => void`

- [x] Write `App.test.tsx` covering add, bad file, sample twice, row contents, switch, Re-centre, export hints, remembered unit, and one figure note. Mock `MapView` and `PolygonOverlay`.
- [x] Run the new tests and confirm failure.
- [x] Implement the UI and wire `App`.
- [x] Run `npm run test`, `npm run lint`, `npm run typecheck`.
- [x] Commit.

### Task 3: Polish and manual check

- [x] Match existing press, focus, and 44px targets. Truncate long file names. Keep one note open across rows.
- [x] Run `npm run build`.
- [x] In the browser, load two Polygons, drag one, re-centre, switch one off, and confirm the empty and export sentences on a desktop width and a phone width.
- [x] Commit any polish fixes.
