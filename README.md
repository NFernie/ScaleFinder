# ScaleFinder

Superimpose a **true-scale field polygon** over a MapLibre world map to compare
it against real geographical regions — deltas, river systems, and more — then
export a framed snapshot for geological studies.

See [`ScaleFinderPurpose.md`](ScaleFinderPurpose.md) for the product purpose and
[`docs/superpowers/specs/`](docs/superpowers/specs/) for the design spec.

## What it does

1. **Import** a polygon from a `.txt` / `.csv` file of `X, Y[, Z]` values in a
   local projected space (metres by default; ft / km selectable).
2. **Preview** the true-shape polygon with its planform area, max span, and
   characteristic length.
3. **Find a region** on the MapLibre map (quick-links for the Mississippi, Nile,
   Danube, and other deltas, plus rivers; worldwide search with a MapTiler key).
4. **Superimpose** the polygon at **true ground scale** and drag it to reposition
   — the map's scale bar and the polygon's stated size stay in agreement.
5. **Export** a framed PNG snapshot (basemap + polygon + region label).

## Tech stack

- Vite + React 18 + TypeScript + Tailwind CSS
- MapLibre GL JS via `react-map-gl/maplibre`
- `html-to-image` for PNG export
- Vitest + Testing Library

The scale logic is a pure, dependency-free TypeScript core in
[`src/core`](src/core) (`parseFile`, `geometry`, `projection`, `units`), unit
tested independently of React and the map.

## Getting started

Requires Node.js 20+ (developed against Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
```

### MapTiler key (optional in dev)

Production uses a MapTiler basemap and worldwide search. Provide a key via a
`.env` file (see [`.env.example`](.env.example)) or the environment:

```bash
echo "VITE_MAPTILER_KEY=your_key_here" > .env
```

Without a key, ScaleFinder automatically falls back to the keyless **OpenFreeMap**
basemap, so the app is fully usable in development.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server (`0.0.0.0:5173`) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build (`0.0.0.0:4173`) |
| `npm run test` | Run the Vitest suite once |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type-check without emitting |

## Sample data

Two sample polygons are in [`public/samples`](public/samples) and are also
loadable from the UI ("Load a sample").

## For agents

Read [`AGENTS.md`](AGENTS.md): it defines the **design → implement → polish**
workflow (using the vendored skills in [`.cursor/skills`](.cursor/skills)) and the
`CHANGELOG.md` update routine. Deploys to Netlify (see `netlify.toml`).
