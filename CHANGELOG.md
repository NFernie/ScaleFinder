# Changelog

All notable changes to ScaleFinder are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Routine for agents:** every change to the codebase MUST add an entry under
> `## [Unreleased]` before committing. Group entries under `Added`, `Changed`,
> `Fixed`, `Removed`, `Security`, or `Docs`. See `AGENTS.md` for the workflow.

## [Unreleased]

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
