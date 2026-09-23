# ScaleFinder v1 — Design Spec

- **Status:** Draft (awaiting user review)
- **Date:** 2026-09-22
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)

## 1. Goal

Let a user import a polygon defined in local projected XYZ space, render it at
true shape/size, and superimpose it at **true ground scale** on a MapLibre map
of anywhere on Earth to compare it against real geographical regions, then export
a framed PNG snapshot.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Framework | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Map | MapLibre GL JS via `react-map-gl/maplibre` |
| Basemap | MapTiler (API key via `VITE_MAPTILER_KEY`); keyless OpenFreeMap fallback in dev |
| BaaS | None in v1; architected for Supabase later |
| PaaS | Netlify static site |
| Snapshot | Full framed view PNG (basemap + polygon + scale bar + region label) |
| Units | Metres by default; m / ft / km selector |
| Geocoding/search | MapTiler Geocoding API (behind the same key) with a graceful manual lon/lat entry fallback |

## 3. Architecture

Modules are split so the domain logic is pure and unit-testable without React or
a browser:

```
src/
  core/                      # pure TS, no React, fully unit-tested
    parseFile.ts             # .txt/.csv -> Vertex[] (X,Y,Z), unit handling
    geometry.ts             # area (shoelace), centroid, bbox, char. length
    projection.ts           # local XY (m) -> geographic lon/lat (geodesic)
    units.ts                # m / ft / km conversion helpers
  map/
    MapView.tsx             # react-map-gl/maplibre wrapper + basemap config
    basemap.ts              # MapTiler style URL + OpenFreeMap fallback
    PolygonOverlay.tsx      # GeoJSON source + fill/line layers, drag handling
    useSnapshot.ts          # framed PNG capture (html-to-image over the frame)
    search.ts               # region search/geocode
  ui/
    ImportPanel.tsx         # file drop/upload, unit selector, parse feedback
    PolygonPreview.tsx      # true-shape SVG preview + area/dimension readout
    RegionSearch.tsx        # search box + notable-region quick links
    SnapshotButton.tsx      # trigger + download
  App.tsx
  main.tsx
```

### Data flow

1. `ImportPanel` reads the file → `parseFile()` → `Vertex[]` (metres).
2. `geometry` computes area/centroid/bbox → `PolygonPreview` renders true shape.
3. User navigates the map; `projection.toGeographic(vertices, anchorLngLat)`
   converts local metre offsets from the centroid into lon/lat via a geodesic
   destination calculation (Turf.js `destination`).
4. `PolygonOverlay` renders the resulting ring as a MapLibre GeoJSON fill+line;
   dragging updates `anchorLngLat` and re-projects (staying true-scale).
5. `useSnapshot` captures the framed map container to PNG.

## 4. The scale-accuracy core (why it is correct)

- Input XY are treated as planar metres. Offsets from the centroid `(dx, dy)`
  are converted to a bearing + distance and placed with a great-circle
  destination from the anchor lon/lat. This preserves **true ground distance**
  at any latitude, independent of Web Mercator distortion.
- MapLibre renders in Web Mercator, so the on-screen polygon and the basemap
  share the same projection: the polygon's real-world size and the map's scale
  bar agree. This is validated in tests by round-tripping a known square and
  checking the geodesic edge lengths.

## 5. Snapshot

- The `<Map>` is created with `preserveDrawingBuffer: true` so the WebGL canvas
  can be read back.
- The polygon is a map layer (same canvas), so the basemap + polygon capture
  cleanly. The scale bar and region label are DOM overlays; the whole framed
  container is rasterised with `html-to-image` to include them, then downloaded
  as PNG. MapTiler serves tiles with CORS, keeping the canvas untainted.

## 6. Testing strategy

- **Unit (Vitest):** `parseFile` (valid/invalid `.txt` and `.csv`, unit
  conversion, comments/blank lines), `geometry` (shoelace vs known shapes,
  centroid, bbox), `projection` (geodesic round-trip edge lengths within
  tolerance), `units`.
- **Component (Testing Library):** import → preview flow; error states.
- **Manual (GUI):** import a sample file, navigate to the Nile/Mississippi Delta,
  superimpose, drag, and export a PNG — recorded as the walkthrough artifact.
- MapLibre WebGL is not exercised in jsdom; map rendering is validated manually.

## 7. Skills workflow (design → implement → polish)

Vendored into `.cursor/skills/` and documented in `AGENTS.md`:

- **Design:** `ui-ux-pro-max` (styles, palettes, typography, UX rules) +
  `impeccable shape`/`critique`.
- **Implement:** `impeccable craft` + the app code.
- **Polish:** `emilkowalski` (design-eng, animation, `mobile-native`,
  `pick-ui-library`) + `impeccable polish`/`audit`/`harden`.

Every change updates `CHANGELOG.md`.

## 8. Environment & hosting

- `.cursor/environment.json`: `install = npm ci`, a `dev` terminal running the
  Vite server; `VITE_MAPTILER_KEY` provided as a secret.
- Netlify: SPA redirect to `index.html`, publish `dist/`, build `npm run build`.

## 9. Milestones

1. Scaffold Vite+TS+React+Tailwind; vendor skills; `AGENTS.md`; env + Netlify.
2. `core/` (parse, geometry, projection, units) + unit tests.
3. Import panel + true-shape preview.
4. MapLibre map + basemap + search/navigation.
5. True-scale draggable overlay.
6. Framed PNG snapshot.
7. Polish pass (skills) + manual E2E demo.

## 10. Risks / open points

- MapTiler free-tier quota; mitigated by OpenFreeMap dev fallback.
- Very large fields near the poles: geodesic placement handles latitude, but
  extreme-size polygons will still show Mercator area exaggeration (expected and
  documented; the scale bar remains the source of truth).
