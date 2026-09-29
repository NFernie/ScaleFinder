# AGENTS.md — ScaleFinder

Guidance for AI agents working in this repository. Read this first, then read
[`PRODUCT.md`](PRODUCT.md) and [`ScaleFinderPurpose.md`](ScaleFinderPurpose.md)
before making changes. When [`DESIGN.md`](DESIGN.md) exists, read it before any
UI change. Cursor does not load those files on its own. The always-on rule in
[`.cursor/rules/product-design-context.mdc`](.cursor/rules/product-design-context.mdc)
requires it.

## What this project is

ScaleFindr is a Vite + React + TypeScript + Tailwind web app for superimposing a
true-scale field polygon over a MapLibre world map to compare it against real
geographical regions. `PRODUCT.md` is the durable product record.
`ScaleFinderPurpose.md` is the long-form v1 brief. Design specs live in
[`docs/superpowers/specs/`](docs/superpowers/specs/).

## Golden rules

1. **Read the product record first.** `PRODUCT.md` is the durable record of who
   the product is for and what v1 may do. `ScaleFinderPurpose.md` is the
   long-form brief. Do not add features outside them without agreement. When
   `DESIGN.md` exists, UI work follows it.
2. **Always update `CHANGELOG.md`.** Every code change adds an entry under
   `## [Unreleased]` (Keep a Changelog format) before you commit. This is a hard
   routine, not optional.
3. **Follow the design → implement → polish workflow** below for any UI work.
4. **Keep the core pure.** Geometry, parsing, projection and unit logic live in
   `src/core/` with no React/DOM dependencies and are unit-tested.

## Design → Implement → Polish workflow

Vendored skills live in [`.cursor/skills/`](.cursor/skills/). Use them in order.
[`WORKFLOW.md`](WORKFLOW.md) is the handrail for which skill to call, with
ScaleFindr examples.

### 1. Design

- **`ui-ux-pro-max`** — choose UI style, colour palette, typography, chart/UX
  patterns before building a new surface.
- **`impeccable shape`** — plan the UX/UI of the surface; **`impeccable critique`**
  for a design review of hierarchy and clarity.

### 2. Implement

- **`impeccable craft`** — shape-then-build flow.
- Build with Vite + React + TypeScript + Tailwind, keeping domain logic in
  `src/core/`. Write/extend Vitest tests alongside the code.

### 3. Polish

- **`emilkowalski` skills** — `emil-design-eng` (polish details), `animate` /
  `review-animations` (purposeful motion), `mobile-native` (feel native on a
  phone), `pick-ui-library` (choose trusted libraries instead of hand-rolling).
- **`impeccable polish` / `audit` / `harden`** — final pass, a11y/perf/responsive
  checks, error handling and edge cases before shipping.

> Not every change needs all three stages, but any new or materially changed UI
> surface should pass through design → implement → polish.

## Tech stack & key libraries

- Vite, React 18, TypeScript, Tailwind CSS.
- MapLibre GL JS via `react-map-gl/maplibre`; `html-to-image` for snapshot export.
- Geodesic geometry is implemented in-repo (`src/core/projection.ts`) with no
  external geo dependency.
- Basemap: MapTiler (`VITE_MAPTILER_KEY`) with a keyless OpenFreeMap dev fallback.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` / `npm ci` | Install dependencies |
| `npm run dev` | Vite dev server on `0.0.0.0:5173` |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Run the Vitest suite once |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type-check without emit |

## Running & viewing in a Cloud Agent

This repo is a **repository-managed** environment: config lives in
`.cursor/environment.json`, which takes precedence over any dashboard/personal/
team environment ([resolution order](https://cursor.com/docs/cloud-agent/setup)).
Because of this, new agents do **not** show a dashboard "Environment" Save card —
that is expected. The committed config applies to any agent started on a branch
that contains it (you do not have to merge to the default branch first).

The `dev` terminal (`npm run dev`) **auto-starts** on every agent boot and stays
alive in the shared `tmux` session, so the Vite server is normally already
running on `0.0.0.0:5173`. To view the app:

- **Forwarded Ports (recommended):** in the Agents Window open the Forwarded
  Ports menu, forward `5173` (or enable Auto-Forward), then "Open in internal
  browser". Vite already binds to `0.0.0.0` (see `vite.config.ts`), which is
  required for forwarding.
- **Remote desktop:** take control of the agent's VM desktop and open Google
  Chrome at `http://localhost:5173/`.
- If the server isn't running, start it with `npm run dev` in a terminal.

For the MapTiler basemap, set the `VITE_MAPTILER_KEY` secret (it persists across
runs and is injected into new VMs); without it the app falls back to keyless
OpenFreeMap.

## Testing expectations

- Add/extend **Vitest** unit tests for anything in `src/core/` (parsing,
  geometry, projection, units) and component tests for import/preview flows.
- MapLibre WebGL is not covered by jsdom — validate map/overlay/snapshot behaviour
  with **manual GUI testing** and attach a short walkthrough recording.
- Ensure `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`
  pass before considering work complete.

## Hosting

- Deploys to **Netlify** as a static SPA (`dist/`, SPA redirect to `index.html`).
- No backend in v1. If persistence is added later, use Supabase (see the spec's
  out-of-scope section) rather than ad-hoc storage.
