# Multi-Polygon list — Design Spec

- **Status:** Approved
- **Date:** 2026-09-23
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-22-scalefinder-v1-design.md`](2026-09-22-scalefinder-v1-design.md)
- **Previous slice:** [`2026-09-23-scalefindr-copy-and-figure-notes-design.md`](2026-09-23-scalefindr-copy-and-figure-notes-design.md)

## 1. Goal

Let a session hold more than one Polygon. Each Polygon keeps its own centre, colour, and import unit. Selected Polygons are drawn together on the map so they can be compared, then dragged apart. Deselecting hides a Polygon without removing it.

This replaces the single loaded Polygon and the single map anchor. It is an agreed expansion of v1. `ScaleFinderPurpose.md` currently lists “Multiple simultaneous polygons / project libraries” as out of scope. Implementation updates that line so a session list is in scope, and saving projects or a library stays out of scope.

A map ruler is a separate design and is not part of this spec.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Import | Adds a Polygon. It does not replace the list |
| Bad file | The list is unchanged. The existing import error is shown |
| Row | Switch, file name, colour control, three figures with the existing notes, small preview |
| Selected | Drawn on the map in its colour, with a same-colour drag marker on its centre |
| Deselected | Hidden on the map. The row stays. There is no delete control |
| New Polygon | Appended, selected, and given the next unused colour |
| New centre | Centre of the uppermost selected Polygon already in the list, or the map centre when none are selected |
| Drag | Moves only that Polygon |
| Re-centre | Shown when two or more Polygons are selected. Copies the uppermost selected Polygon’s centre onto every other selected Polygon |
| Region | Flies the map there and stacks every selected Polygon on that region’s centre. Deselected Polygons stay put |
| Colour on import | Next unused swatch. If every swatch is in use, the set starts again |
| Colour control | Can set any colour, including one another row already uses |
| Unit control | Applies only to the next import. Each Polygon remembers the unit it was imported with |
| Sample | Adds a Polygon in the sample’s unit, and moves the unit control to that unit |
| Figures | Same three figures and the same notes as today, on each row |
| One note | Only one figure note is open in the sidebar at a time |
| Snapshot | Selected shapes are in the frame. The sidebar, basemap menu, and figure notes stay out |

## 3. On-screen behaviour

The list is in import order, oldest at the top. “Uppermost selected” means the first selected row in that order.

The import control stays at the top of the sidebar. The unit control still chooses metres, feet, or kilometres for the next file only. Changing it does not reinterpret Polygons already in the list.

Under the import control, the single Scale block becomes a scrolling list. **Re-centre** sits above the rows and is absent until two or more Polygons are selected. When at least one Polygon is selected, one line above the list reads: “Drag a marker on the map to reposition that Polygon. It stays at true ground scale.”

Each row has:

- A switch labelled with the file name. On draws the Polygon. Off hides it and keeps the row.
- A colour control labelled “Colour for” plus the file name.
- Planform area, max span, and equivalent square side, with the existing descriptions and equations.
- A small true-shape preview in that Polygon’s colour, about 96px square, so several rows fit in the sidebar.

A new file is appended and switched on. Its centre matches the uppermost selected Polygon already in the list. If none are selected, its centre is the current map centre (the same fallback as today when the map has not reported a centre). A sample is added the same way, using the sample’s unit, and the unit control changes to that unit so the next file matches.

Two rows may share a file name. Loading a sample twice adds two rows. Sample buttons are not toggles.

Dragging a marker updates only that Polygon’s centre. After alignment, each selected Polygon can be dragged on its own. Switching a Polygon back on draws it at the centre it already has. It is not aligned again.

**Re-centre** copies the uppermost selected centre onto the other selected Polygons. Deselected Polygons do not move.

Choosing a region still sets the region name and flies the map there. Every selected Polygon’s centre moves to that region’s centre. If none are selected, the map still flies and no Polygon moves. A failed search stays in the search box and moves nothing.

Fill, outline, and marker use the Polygon’s colour. The fill stays translucent at the current 0.32 opacity so the basemap shows through. The outline is a solid stroke of the same colour, at the current width of 2. The marker keeps the white border and the 44px drag target. The inner disc uses the Polygon’s colour.

Swatches, in assignment order:

| Name | Hex |
| --- | --- |
| Teal | `#2dd4bf` |
| Amber | `#f59e0b` |
| Sky | `#38bdf8` |
| Rose | `#fb7185` |
| Lime | `#a3e635` |
| Violet | `#a78bfa` |
| Orange | `#fb923c` |

“Unused” means no row currently has that hex, including rows that are switched off. A colour freed by the colour control can be assigned to the next import. After all seven are in use, assignment starts again at teal.

The map’s empty sentence depends on the list:

- No Polygons yet: “Import a Polygon to place it here at true ground scale.”
- Polygons exist, and all are switched off: “Switch a Polygon on to show it here.”

Export stays disabled unless at least one selected Polygon is drawn. The hint is “Import a Polygon to export” only while the list is empty. While rows exist and all are off, the hint is “Switch a Polygon on to export.” A failed snapshot still says “The snapshot could not be saved. Try again.” The file name stays `scalefindr-snapshot.png`, or `scalefindr-<region>.png` when a region name is set. Selected Polygons and their markers are inside the captured frame. The sidebar is not.

Figure notes keep today’s copy, equations, hover, focus, touch, Escape, and flip-below-if-clipped behaviour. Opening a note closes any other note in the list.

## 4. Components and data flow

One record per Polygon:

| Field | Meaning |
| --- | --- |
| `id` | Unique string. React key and MapLibre source id |
| `sourceName` | File name shown on the row |
| `raw` | Parsed vertices, in the import unit |
| `unit` | `m`, `ft`, or `km` remembered from import |
| `hasZ` | Whether a Z column was present |
| `selected` | Drawn when true |
| `anchor` | Geographic centre of this Polygon |
| `colour` | Hex used for fill, outline, and marker |

The app holds the ordered list, the unit chosen for the next import, the region name, and the export error. The single `loaded` polygon and the single `anchor` go away.

List rules live in a pure module, `src/core/polygonList.ts`, with no React:

- Next colour from the swatch list and the colours already stored.
- Centre for a new Polygon.
- Re-centre.
- Stack selected Polygons on a region centre.

Placement of vertices on the globe stays `projectToGeographic` in `src/core/projection.ts`, called once per selected Polygon with that Polygon’s vertices converted by its own `unit`. `characteristicLengthM` is not renamed. `computeStats` is unchanged.

`src/ui/PolygonList.tsx` renders Re-centre and the rows. Each row reuses `ScaleReadout` and `PolygonPreview`. `PolygonPreview` accepts the row colour. The open figure note is one piece of state for the whole list, so two rows cannot show notes together.

`PolygonOverlay` draws one selected Polygon: its own GeoJSON source and layers, ids including the Polygon id, plus its marker. The app mounts one overlay per selected Polygon.

`ImportPanel` still parses through `parsePolygonFile`. It reports the file just added (“Loaded” plus the file name). That line is replaced by the error when a file fails. The drop zone still accepts one file per choice or drop.

## 5. Error handling

A file with no coordinate rows, fewer than three points, or a non-numeric X or Y keeps the parser’s current message, then “Use rows of X, Y values and try another file.” The list is not modified. The next successful add clears the error. A sample that fails to parse does the same.

The colour control is a native colour input, so it always yields a colour. Duplicate file names and duplicate chosen colours are valid. Re-centre cannot run with fewer than two selected Polygons because the button is not shown. A region search error does not change centres.

## 6. Testing

Pure tests in Vitest, with no React:

- The next colour is the first swatch that no row currently uses, including rows that are switched off. When every swatch is in use, it returns teal again.
- A new Polygon’s centre is the uppermost selected centre, or the supplied map centre when nothing is selected.
- Re-centre copies that centre onto the other selected Polygons and leaves deselected centres unchanged.
- Stacking on a region moves every selected centre to the region and leaves the others.
- The unit stored on a Polygon converts its raw coordinates to metres before area, span, and square side are computed. The on-screen numbers stay in today’s metres, hectares, and kilometres. Changing the unit control does not reconvert a Polygon already in the list.

`projectToGeographic` tests stay as they are.

Component tests render the sidebar and do not mount the map:

- A second file adds a row and keeps the first.
- A bad file leaves every row and shows the existing error text.
- A sample adds a row and can be added twice. Sample buttons are not pressed-state toggles.
- A row shows the file name, switch, colour control, three figures, and a figure note with its equation.
- Switching a Polygon off keeps the row.
- Re-centre is absent with one selected Polygon and present with two.
- With an empty list, export is disabled and the hint says to import a Polygon.
- The import panel names the file just added, and that line clears when the next file fails.

Manual check on the running map, because MapLibre does not run in the unit-test browser: two Polygons draw in different colours with matching markers. Dragging one leaves the other still. Re-centre stacks the selected ones. A region stacks the selected ones and flies there. Switching one off removes only that shape. The snapshot shows the selected shapes and the scale bar, and leaves the sidebar out.

## 7. Out of scope

- A control to delete a Polygon.
- Saving the list, accounts, or a project library.
- A map ruler for custom distances.
- Reprojection between named CRS or EPSG codes.
- Importing more than one file in a single drop.
