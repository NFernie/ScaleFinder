# GIS UTM columns and sidebar resize — Design Spec

- **Status:** Approved
- **Date:** 2026-09-24
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-24-polygon-rename-utm-export-design.md`](2026-09-24-polygon-rename-utm-export-design.md)

## 1. Goal

Make UTM import and export use the same GIS table, so a file with several polylines is recognised and the fixed twin is added. Let the person drag the sidebar wider or narrower until the page is reloaded.

This amends the column-header rules in the parent spec. Rename, the fixed twin, zone maths, and the rest of that spec stay as written.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Zone line | The first zone line is `# UTM 36N` or `# UTM 36S`. The hash is required |
| Header we write | `Poly,Vert,X,Y,Z` for one Polygon and for Export selected |
| One part | Every row has Poly `1`. Vert starts at 1 |
| Several parts of one Polygon | Each part is the next Poly number. Vert restarts at 1 for that part |
| Export selected | Each switched-on Polygon in the zone is the next Poly number, in list order. Vert runs through that Polygon’s vertices in part order and does not restart between parts |
| Older headers | `Vert` or `Vertices` is the vertex column. `Poly` or `Poly Number` is the polyline column. Matching ignores letter case and spaces inside the name |
| Two-column file | No vertex column means today’s local Polygon only. No fixed twin |
| Sidebar width | Starts at 380px. Lives in page state. A reload returns it to 380px |
| Drag limits | The list stays at least 280px. The map keeps at least 320px |
| Narrow screen | Below the wide-screen breakpoint the list stays stacked and the handle is not shown |

## 3. On-screen behaviour

A UTM file starts with the zone line, then `Poly,Vert,X,Y,Z`, then one row per vertex. A single polyline uses `1` in Poly. Further polylines use `2`, `3`, and so on. Export writes that same header. Z is 0. X and Y stay UTM metres to two decimal places.

A file that still says `Vertices` or `Poly Number` is still a UTM table, and it still adds the fixed twin when the zone line is present. A two-column file with no vertex column stays a normal local Polygon.

The fixed row is unchanged. Its name ends with ` (fixed)`. It has no drag marker. Drag, Re-centre, and choosing a region leave it where it is.

On a wide screen the list starts at 380px. A drag handle sits on the edge between the list and the map. It is a 44px target named `Resize sidebar`. Dragging it widens or narrows the list. Left and Right move it by 16px. The list cannot shrink below 280px, and the map keeps at least 320px. Reloading the page returns the list to 380px. On a phone the handle is not shown.

## 4. Components and data flow

`parseUtmTable`, `exportPolygonText`, and `exportSelectedText` stay in `src/core/polygonExport.ts`. They have no React.

`parseUtmTable` treats a header token of `vert` or `vertices` as the vertex column, and `poly` or `polynumber` as the polyline column. Rows group by that polyline value. A missing polyline column uses `1`.

`exportPolygonText` writes `# UTM 36N` and `Poly,Vert,X,Y,Z`. One part writes Poly `1` on every row. Several parts write the next Poly number for each part, and Vert restarts at 1.

`exportSelectedText` writes the same header. Each included Polygon is the next Poly number. Its vertices, in part order, share that number.

`App.tsx` keeps calling those functions. Nothing new is stored on a Polygon.

The drag width lives in `App.tsx`, starting at 380. Below the wide-screen breakpoint the layout stays the stacked grid. On a wide screen the first column uses that width. `SidebarResizeHandle` in `src/ui/` is the boundary control. Dragging it, or pressing Left or Right, updates the width. The width is not written to storage. The map column fills the space that remains.

## 5. Error handling

A missing vertex column means the file is not a UTM table. The ordinary two-column import runs and no fixed twin is added. A zone line that is not `# UTM 36N` or `# UTM 36S` still imports the local shape and reports “No fixed Polygon was added because the file has no UTM zone.” Easting or northing that is not a number is skipped. A polyline with fewer than three points is dropped. If every polyline is dropped, the import stops with the existing “no usable coordinates” message. Export still refuses an empty selection and a centre too close to a pole.

The drag handle captures the pointer, so a release anywhere ends the drag. If the pointer is cancelled, the drag ends and the last clamped width stays. A width below 280px, or one that would leave the map under 320px, is clamped. Arrow keys use the same clamp. On a narrow screen the handle is not rendered.

## 6. Testing

Core tests in `src/core/polygonExport.test.ts`:

- Export writes `# UTM 36N` and `Poly,Vert,X,Y,Z`.
- A single part uses Poly `1`. Vert starts at 1. Z is 0.
- Several parts of one Polygon use Poly `1`, `2`, `3`. Vert restarts at 1 for each part.
- Export selected uses Poly `1`, `2`, `3` for the included Polygons, in list order.
- Import of that same text rebuilds the parts.
- A header that still says `Vertices` or `Poly Number` is accepted.
- A two-column file with no vertex column returns no UTM table.
- A bad zone line returns parts with no zone.

An app test imports a `Poly,Vert,X,Y,Z` file with a zone line and checks that the local Polygon and the ` (fixed)` twin both appear. The resize handle is tested by setting its width and checking the wide-screen column uses that width, and that the default is 380. MapLibre drag behaviour stays a manual check.

## 7. Out of scope

- Saving the sidebar width after the page closes.
- Resizing the stacked phone layout.
- A resizable-panel library.
- A `.prj` file or an EPSG code besides the `# UTM` line.
