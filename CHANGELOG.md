# Changelog

All notable changes to ScaleFinder are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Routine for agents:** every change to the codebase MUST add an entry under
> `## [Unreleased]` before committing. Group entries under `Added`, `Changed`,
> `Fixed`, `Removed`, `Security`, or `Docs`. See `AGENTS.md` for the workflow.

## [Unreleased]

### Docs

- `docs/superpowers/specs/2026-09-23-scalefindr-copy-and-figure-notes-design.md` —
  on-screen rename to ScaleFindr, capitalised Polygon, "Equivalent square side",
  and a hover note above each scale figure.

### Changed

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
