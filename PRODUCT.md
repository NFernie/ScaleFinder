# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A geologist working with the planform outline of a field, a reservoir body, or a mapped depositional element. The outline arrives as local projected X, Y, Z coordinates in metres. The job is to see how large that feature is next to a familiar river or delta, then capture the comparison.

## Product Purpose

ScaleFindr places that outline on a world map at true ground scale so the geologist can compare it with a real geographical or geological region and export a snapshot for a study. Success means a sample file shows the correct area and shape, the map scale bar agrees with the Polygon's stated size, and the user can reposition the Polygon and export a framed PNG.

The name shown in the app is ScaleFindr. Repository documents still say ScaleFinder. They are the same product.

## Positioning

The outline keeps its ground distances when it is moved. Neighbouring map tools edit geography. This one answers how big a local metre outline is beside a real delta or river.

## Operating Context

The user already has a `.txt` or `.csv` export from GIS software. They import it, read the area and dimensions, search or pan to a region such as the Mississippi, Nile, or Danube delta, or a river such as the Ord or the Amazon, drag the overlay, and export a PNG of the map, Polygon, scale bar, and region label.

## Capabilities and Constraints

Confirmed for v1:

- Import `.txt` or `.csv` polygons in local XYZ metres. Z is preserved and ignored for the planform comparison.
- Units default to metres, with an m / ft / km selector.
- Area, centroid, bounding box, and characteristic length.
- Local XY is placed with great-circle distances so the overlay is true ground scale at any latitude.
- MapLibre map, search, and a MapTiler basemap. Development can fall back to keyless OpenFreeMap.
- A draggable true-scale Polygon overlay.
- Several Polygons in one browser session, each with its own centre, colour, and import unit. The list is gone after the page closes.
- A map ruler. Clicks show each ground segment and the total. Double-click closes the chain and adds the area. Add to list copies that closed shape into the session. The measurement is not kept after the page closes.
- Rename a Polygon. Export it as UTM easting and northing where it sits. Several switched-on Polygons in the same zone can be one file. Importing that file adds a local Polygon and a fixed Polygon that stays at the original place.
- Framed PNG snapshot export.

Out of scope for v1:

- User accounts, saved projects, and cloud-stored snapshots. A later version may use Supabase.
- A saved Polygon library.
- Reprojection between named CRS or EPSG codes. Input is local metres.
- Server-side rendering and collaborative editing.

`ScaleFinderPurpose.md` remains the long-form v1 brief. Detailed interaction specs live in `docs/superpowers/specs/`.

## Brand Commitments

The product name in the interface is ScaleFindr. Use Polygon with a capital P when the sentence refers to one of these outlines.

## Evidence on Hand

- `ScaleFinderPurpose.md` is the v1 brief.
- Specs and plans are in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- There are no customer quotes, case studies, press mentions, or pricing claims. Do not invent them.

## Product Principles

- The ground measurement wins over how large the shape looks in pixels.
- Compare the outline with a real region. Do not grow the tool into a general GIS editor.
- A session may hold several Polygons. Nothing is stored after the page closes.
- State only geology and places the user supplied. Do not invent studies, customers, or saved work.
