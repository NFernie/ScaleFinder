# Changelog

All notable changes to ScaleFinder are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Routine for agents:** every change to the codebase MUST add an entry under
> `## [Unreleased]` before committing. Group entries under `Added`, `Changed`,
> `Fixed`, `Removed`, `Security`, or `Docs`. See `AGENTS.md` for the workflow.

## [Unreleased]

### Docs

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
