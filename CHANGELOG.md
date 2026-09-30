# Changelog

All notable changes to ScaleFinder are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Routine for agents:** every change to the codebase MUST add an entry under
> `## [Unreleased]` before committing. Group entries under `Added`, `Changed`,
> `Fixed`, `Removed`, `Security`, or `Docs`. See `AGENTS.md` for the workflow.

## [Unreleased]

### Added

- `centreSelectedOnFixed` copies a fixed Polygon’s anchor onto switched-on, non-fixed rows and returns the same array for a bad id.
- Polygon and Ruler rubber-band: while status is `adding`, `overlayOf` sets `preview` to the confirmed corners plus `session.hover`. `MeasurementOverlay` draws that line under the confirmed stroke (white 2px, navy 4px casing) so it sits behind the tool cursor.
- Map tool cursor overlay (`MapToolCursor`) with inline SVG marks per active tool; native cursor is hidden on the map frame while drawing. Lasso ring diameter follows Radius (8–128 CSS px, default 48).
- Edge pan while drawing: `edgePanDelta` in `src/map/mapEdgePan.ts` (32px band, ±16px cap); `App` calls `map.panBy` on pointer move when the map is accepting points.

### Changed

- Polygons rows show rotation, then the file name, then the controls. Extent and Outline start closed.
- Polygon thumbnail draws one path per part. An open part stays filled and its stroke stops 8px short of each end.
- Toolbox motion: `.pressable` is scale 0.97 in 120ms ease-out. Bento cells transition transform and opacity only. Tooltips rise 4px and fade in over 125ms ease-out, snap when reduced motion is on, and skip that motion for keyboard focus and for the next cell once one tip is open. `.toolbox-pop` stays 160ms ease-out.
- Toolbox popup tool picker is a bento grid of shape icons with hover/focus tooltips (`ToolIcon`, `TOOL_TIPS`) instead of a vertical text list.

### Fixed

- Polygons sidebar heading shows the section index `2 · Polygons`, not the row count.
- Polygon thumbnails with only a two-vertex part render a full stroke with no fill instead of the placeholder.
- While a tool is active, `map-hide-native-cursor` on the MapLibre canvas container sets `cursor: none` with higher specificity than `.maplibregl-interactive`, `.maplibregl-track-pointer`, and `:active`, so the SVG tool cursor is the only pointer.
- Lasso Radius and Contrast readout labels use the locked title sentences (Radius 8–128 and Contrast 0–255 meanings). Numeric ranges are unchanged.
- Touch move edge-pans with `edgePanDelta` and `panBy` whenever a drawing tool accepts points, and still extends the lasso stroke while painting.
- Tool cursor overlay appears immediately when a tool is selected while the pointer is already over the map (no blank frame until the first move).

### Docs

- `docs/superpowers/plans/2026-09-29-sidebar-update.md` — Implementation plan for the Polygons sidebar. Tasks 7–16 are the Emil pass, polish, audit, harden, and the manual check.
- `docs/superpowers/specs/2026-09-29-sidebar-update-design.md` — Approved Polygons sidebar spec. Critique amendments: an open thumbnail keeps the map fill and stops the stroke 8px short of each end; Centre on fixed is hidden until it can run.
- `features/sidebar_update.md` — Sidebar UI workflow for Extent, the outline thumbnail, row layout, a collapsible Polygons list, Centre on fixed, and hover tooltips. Spec and product code wait on `/brainstorming`, then `/writing-plans`.
- `DESIGN.md` — Toolbox subsection documents the bento icon grid, hover/focus tooltips, tool-matched cursors (lasso radius scaling), edge pan while drawing, and polygon/ruler preview behind the pointer.
- `docs/superpowers/specs/2026-09-29-toolbox-ui-update.md` — approved Toolbox UI addendum: bento icon grid, tool cursors, hover tooltips, edge pan, and polygon/ruler preview behind the pointer. Lasso Radius stays 8–128 (default 48) and Contrast stays 0–255 (default 32). Geometry stays in `src/core`.
- `features/toolbox_ui_update.md` — Toolbox UI update plan (bento grid, cursors, tooltips, edge pan, preview stacking, Emil animation workflow). Supersedes UI prompts in `feature/toolbox.md` for new UI work.

### Changed Drag a free curve or click corners, and similar colours within the radius join the outline. Double-click closes the guide. Add to list stores a movable Lasso and leaves a fixed copy on the map until either row is deleted.
- The Toolbox branch now also includes Polygon rotation, GIS `Poly,Vert,X,Y,Z` columns, and the draggable sidebar from main. A measured outline is listed as "Measured Polygon".
- The map Measure button is now Toolbox. Polygon keeps the previous measure behaviour.

### Fixed

- Lasso no longer rejects a same-colour fill that reaches the raster edge (`src/core/lasso.ts`).
- Basemap sampling waits for a repaint when the map is already idle and rejects empty WebGL canvases (`src/map/sampleCanvas.ts`).

### Added

- The Toolbox popup fades and rises 8px in 160ms, and snaps when reduced motion is on.
- Lasso picks a same-colour patch around a click and can add that outline to the Polygon list.
- Ruler, Circle, and Square can be chosen from the Toolbox. Circle and Square can be added to the Polygon list.
- Lasso can read the map canvas locally, or report that the basemap cannot be sampled (`src/map/sampleCanvas.ts`).
- The Toolbox session holds one Polygon, Ruler, Lasso, Circle, or Square draft (`src/core/toolboxSession.ts`).
- Lasso traces pixels of a similar colour inside a radius into an ordered ring (`src/core/lasso.ts`).
- Square draws a local east-north rectangle, or a square on the longer side (`src/core/square.ts`).
- A circle tool builds a 64-vertex ground ring from a centre and a rim (`src/core/circle.ts`).
- A distance ruler sums open ground segments and does not close into an area (`src/core/ruler.ts`).

### Docs

- `docs/superpowers/specs/2026-09-29-lasso-brush-design.md` — approved Lasso brush: drag a free curve, click corners, double-click closes the guide, and Add to list stores a movable Lasso plus a fixed outline. `PRODUCT.md` and `ScaleFinderPurpose.md` use that behaviour.
- DESIGN.md records the map Toolbox: Panel at 95%, 12px popup corners, Float shadow, Selected teal while a tool is on.
- `docs/superpowers/specs/2026-09-28-map-toolbox-design.md` — align Toolbox spec with locked lasso delta, aim-only controls, Circle list name, and Add to list centre placement.
- `docs/superpowers/specs/2026-09-28-map-toolbox-design.md` — map Toolbox that replaces Measure with Polygon, Ruler, Lasso, Circle, and Square. Status is Approved.
- `feature/toolbox.md` is the plan for a map Toolbox that replaces Measure
  with Polygon, Ruler, Lasso, Circle, and Square. Implementation waits on
  `/brainstorming` and an approved spec.
- `PRODUCT.md` records the v1 product for Impeccable. Agents must read it, and
  `DESIGN.md` when that file exists, before feature or UI changes.
- `DESIGN.md` records the current night-navy and teal interface. The sidecar
  is `.impeccable/design.json`.
- `WORKFLOW.md` explains when to use the vendored UI UX Pro Max, Impeccable,
  and Emil Kowalski skills on this product.
- `docs/superpowers/specs/2026-09-24-polygon-rotation-design.md` —
  rotate a movable Polygon around its centre. The row shows the compass
  bearing of the edge chosen at import. Status is Approved.
- `docs/superpowers/plans/2026-09-24-gis-utm-columns-and-sidebar-resize.md` —
  implementation plan for the GIS columns and the draggable sidebar.
- `docs/superpowers/specs/2026-09-24-gis-utm-columns-and-sidebar-resize-design.md` —
  UTM import and export use `Poly,Vert,X,Y,Z`, and the sidebar can be dragged
  until the page is reloaded. Status is Approved.
- `docs/superpowers/plans/2026-09-24-polygon-rename-utm-export.md` —
  implementation plan for rename and UTM export. The plan tasks are done.
- `docs/superpowers/specs/2026-09-24-polygon-rename-utm-export-design.md` —
  rename a Polygon, export UTM easting and northing, export several Polygons
  as one file, and import that file as a local Polygon plus a fixed twin.
  Status is Approved.
- `docs/superpowers/specs/2026-09-23-map-ruler-design.md` —
  map ruler that can close into a polygon, with the figures in a floating menu
  until Add to list. Status is Approved.
- `docs/superpowers/plans/2026-09-23-map-ruler.md` —
  implementation plan for that ruler.
- `docs/superpowers/specs/2026-09-23-multi-polygon-list-design.md` —
  session list of Polygons, each with its own centre, colour, and import unit.
  Status is Approved.
- `docs/superpowers/plans/2026-09-23-multi-polygon-list.md` —
  implementation plan for that Polygon list. The plan tasks are done.
- `docs/superpowers/specs/2026-09-23-scalefindr-copy-and-figure-notes-design.md` —
  on-screen rename to ScaleFindr, capitalised Polygon, "Equivalent square side",
  and a hover note above each scale figure.
- `docs/superpowers/plans/2026-09-23-scalefindr-copy-and-figure-notes.md` —
  implementation plan for that copy and figure-note spec.

### Changed

- The Polygon on/off control keeps its white knob inside the oval. A Polygon
  follows the pointer while it is dragged, and a turn eases into place over
  220ms.
- Map labels for the selected region and ScaleFindr sit along the bottom of
  the map, clear of the zoom controls and the basemap menu. Headings use
  tighter letter-spacing than body text. Scale figures and bearings use
  tabular numbers. Surfaces use a shade instead of a hard border, and pure
  black fills are gone. Visible sentences keep Polygon capitalised.

### Fixed

- A tab-separated `.txt` UTM file, such as `# UTM 54S` then `Poly`, `Vert`,
  `X`, `Y`, `Z`, imports as a local Polygon and a fixed twin.

### Changed

- UTM import and export use `Poly,Vert,X,Y,Z`. A column named `Vert` or
  `Vertices` still counts, and a polyline with fewer than three points is
  left out. The sidebar edge can be dragged on a wide screen until reload.

### Added

- A movable Polygon can be rotated around its centre by dragging a bar on
  the reference edge or by typing that edge’s compass bearing. Re-centre
  restores the bearing from when the Polygon was added. A fixed Polygon
  does not rotate.
- Each Polygon can be renamed. Export downloads a UTM CSV for where it sits
  on the globe, with Z set to 0. Export selected writes the switched-on
  Polygons that share the first selected zone into one file. Importing that
  file adds a local Polygon and a fixed twin that stays on the globe.
- A map measurement can be summed as ground segments and, once closed, as an
  area in square metres (`src/core/measurement.ts`).
- Measure on the map draws a white chain. Done keeps a ruler. Double-click
  closes a polygon and shows its area in a floating menu. Add to list copies
  that shape into the Polygon list as "Measured polygon".
- `.cursor/rules/subagent-models.mdc` — subagents may only run as Cursor Grok
  or Composer models.
- Each Polygon row has Delete, which removes that Polygon from the session list.
- A session can hold several Polygons. Each one keeps its own centre, colour,
  and the unit it was imported with. Import adds a Polygon. Switching one off
  hides it on the map. Re-centre stacks the selected Polygons on the first
  selected centre.

### Fixed

- A double-click that closes a measurement does not store a second copy of the
  last corner.

### Changed

- The product record allows a map Toolbox: Polygon, Ruler, Lasso, Circle, and Square. Drawings still end when the page closes.
- Planform area, max span, and equivalent square side can be hidden per Polygon
  with Show figures / Hide figures. The preview stays visible.
- Region results sit in their own scrollable list. The region search field is
  unchanged.
- A file that fails to parse leaves Polygons already imported in the list.
- Choosing a region moves every selected Polygon onto that region. A Polygon
  that is switched off stays where it is.
- `ScaleFinderPurpose.md` now treats a session list of Polygons as in scope.
  Saving that list as a project library stays out of scope.
- The on-screen name is ScaleFindr. Visible sentences capitalise Polygon, and
  the import hint describes a two-column X and Y file from GIS software.
- "Characteristic length" is now "Equivalent square side" (still the square
  root of the planform area). Hovering or focusing a scale figure opens a note
  above it with a short description and the equation.
- Polished the existing UI without changing the task: Inter is now actually
  loaded, controls have press and keyboard-focus states, and secondary text
  meets contrast on the dark surfaces.
- The phone layout keeps a real map height instead of letting the canvas
  collapse, and the shell respects the visible viewport, safe areas, and touch
  (no sticky hover, no tap flash, 16px search field, larger drag target).
- Scale figures read as a single list instead of three cramped cards. Import,
  sample, and region controls show loaded, selected, empty, and error states,
  including a reason when snapshot export is unavailable or fails.
- Map labels use a solid chip so the framed PNG stays readable.
- The basemap menu sits at the top centre of the map. The scale bar is larger
  and centred along the bottom edge.

### Added

- `ScaleFinderPurpose.md` — version 1 product purpose and user journey.
- `docs/superpowers/specs/2026-09-22-scalefinder-v1-design.md` — v1 design spec.
- `AGENTS.md` — design → implement → polish workflow, changelog routine, and
  references to the vendored design skills.
- This changelog.
- Vendored design skills under `.cursor/skills/` (ui-ux-pro-max, impeccable,
  emilkowalski) with a provenance index.
- Vite + React + TypeScript + Tailwind app scaffold.
- Pure `src/core/` modules with unit tests: `parseFile` (.txt/.csv XYZ),
  `geometry` (area/centroid/bbox/span), `projection` (geodesic true-scale
  placement), `units`, and `format`.
- MapLibre integration (`react-map-gl/maplibre`): `MapView`, MapTiler basemap
  with keyless OpenFreeMap fallback (`basemap`), curated notable regions +
  optional MapTiler geocoding (`regions`), and a draggable true-scale
  `PolygonOverlay`.
- UI: import panel (file drop/upload, unit selector, samples), true-shape
  preview, scale readout, and region search.
- Framed PNG snapshot export (`html-to-image`).
- Two sample polygons in `public/samples/` and loadable in-app.
- `.cursor/environment.json` (Cloud Agent) and `netlify.toml` (static SPA host).

### Docs

- `AGENTS.md`: added a "Running & viewing in a Cloud Agent" section (auto-started
  `dev` terminal, Forwarded Ports and remote-desktop preview, repo-managed
  environment note) and corrected the geometry note — the geodesic math is
  implemented in-repo (`src/core/projection.ts`), not via Turf.
