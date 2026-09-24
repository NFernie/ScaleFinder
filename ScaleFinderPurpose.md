# ScaleFinder — Purpose (v1)

## One-line

ScaleFinder is a browser-based tool that lets users superimpose a true-scale
field polygon over any location on a MapLibre world map, so they can visually
compare the size of a mapped feature against real geographical/geological
regions and capture that comparison for geological studies.

## The problem

Geologists routinely work with polygons that describe the planform outline of a
feature (a field, a reservoir body, a mapped depositional element) in a local
projected **XYZ** coordinate space (metres). It is hard to intuit how big that
feature really is until it is placed, at true scale, next to a familiar
real-world system — the Mississippi Delta, the Nile Delta, the Danube Delta, or
a river system such as the Ord or the Amazon.

## The v1 user journey

1. **Export** — the user already has (or exports) a polygon as a `.txt` or
   `.csv` file whose rows are `X, Y, Z` values in a local projected space
   (metres by default).
2. **Import** — the user imports that file into ScaleFinder.
3. **Convert & preview** — ScaleFinder converts the raw XY values into real-world
   distances and renders a true-shape, true-size area polygon (with area and
   dimensions read out).
4. **Explore the globe** — the user opens the MapLibre map and pans, searches,
   or zooms to a region of interest (e.g. the Mississippi Delta, Nile Delta, or
   the Amazon River).
5. **Superimpose** — the imported polygon is overlaid on the map at **true
   ground scale** and can be dragged to reposition, so the user can compare its
   size against the selected region.
6. **Capture** — the user takes a UI snapshot of the framed map view (basemap +
   polygon + scale bar + region label) and exports it as a PNG for use in
   geological studies and reports.

## In scope for v1

- Import of `.txt` / `.csv` polygons in XYZ space (Z is preserved but not used
  for the planform comparison).
- Unit handling: metres by default, with an m / ft / km selector.
- Core geometry: polygon area, centroid, bounding box, characteristic length.
- Local XY → geographic conversion using a geodesic (great-circle) placement so
  the overlay is true-scale at any latitude.
- MapLibre map with search/navigation and a MapTiler basemap (keyless
  OpenFreeMap fallback in development).
- Draggable, true-scale polygon overlay.
- Several Polygons in one session, each with its own centre, colour, and the
  unit it was imported with. The list lasts for the browser session only.
- A map ruler: a chain of clicks shows each ground segment and the total in a
  floating menu. Double-click closes the chain and adds the area. Add to list
  copies that closed shape into the session as a Polygon. The measurement is
  not kept after the page closes.
- Rename a Polygon in the session list, and export it as UTM easting and
  northing where it sits on the globe. Several switched-on Polygons in the
  same zone can be exported as one file. Importing that file adds the usual
  local Polygon and a fixed Polygon that stays at the original place.
- Framed PNG snapshot export.

## Explicitly out of scope for v1 (candidate v2+)

- User accounts, saving projects, and cloud-stored snapshots (a Backend-as-a-
  Service such as Supabase; the app is architected so this can be added later).
- Saving a Polygon list as a project library. A session can hold several
  Polygons at once; they are not stored after the page closes.
- Reprojection between named CRS/EPSG codes (v1 treats input as local metres).
- Server-side rendering or collaborative features.

## Success criteria

- A user can import a sample polygon file and see a correct area and true-shape
  preview.
- The polygon overlays a chosen region on the map at demonstrably correct scale
  (the map scale bar and the polygon's stated dimensions agree).
- The user can reposition the polygon and export a framed PNG snapshot.

> This is a version 1 summary. See
> [`docs/superpowers/specs`](docs/superpowers/specs) for the detailed design
> spec, and [`CHANGELOG.md`](CHANGELOG.md) for the running history.
