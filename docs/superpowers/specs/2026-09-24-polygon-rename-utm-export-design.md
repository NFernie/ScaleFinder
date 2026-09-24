# Polygon rename and UTM export — Design Spec

- **Status:** Approved
- **Date:** 2026-09-24
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-23-multi-polygon-list-design.md`](2026-09-23-multi-polygon-list-design.md)
- **Column headers:** Amended by [`2026-09-24-gis-utm-columns-and-sidebar-resize-design.md`](2026-09-24-gis-utm-columns-and-sidebar-resize-design.md). Where the two differ on `Poly,Vert,X,Y,Z`, the amendment wins.

## 1. Goal

Let a person rename a Polygon in the session list, and download it as UTM easting and northing where its vertices sit on the globe. A UTM file imports back as two Polygons: the usual local one, and a fixed one that sits on that geographic place.

Export selected writes several switched-on Polygons into one file. Importing that file adds one local Polygon and one fixed twin. The Poly Numbers in the file are parts of that single shape, and a part may be open.

This is an agreed expansion. Implementation adds rename, UTM export, and the fixed import twin to `ScaleFinderPurpose.md` as in scope. Saving a Polygon list stays out of scope.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Name | One name per Polygon. It is the row label and the download name |
| Rename | Click the visible name. Enter, Tab, or a click elsewhere saves the trimmed name. Escape restores the previous name |
| Blank name | A blank name, or a name of only spaces, is refused. The field closes and the previous name stays |
| Switch | The switch is the pill alone. Its accessible name is the Polygon name. Renaming does not change on/off |
| Coordinates | X and Y are UTM easting and northing, in metres, where each vertex sits now. Z is always 0 on export |
| Zone | The zone of that Polygon’s current centre. Every vertex of that Polygon uses that one zone |
| Hemisphere | `N` when the centre latitude is zero or north. `S` when it is south |
| One part | `# UTM 36N`, then the header `Poly,Vert,X,Y,Z`. Poly is `1`. Vert starts at 1 |
| Several parts | The same header. Each part is the next Poly number. Vert restarts at 1 for that part |
| Export selected | The same header, in the first selected Polygon’s zone. Each included Polygon is the next Poly number, in list order |
| Other zones | A switched-on Polygon in another zone is left out, and its row says so |
| Two-column import | A file with no `Vert` or `Vertices` column adds only today’s local Polygon |
| UTM import | A four-column or five-column UTM file adds the local Polygon and a fixed twin. Poly Numbers are parts of that one shape. Parts may be open |
| Fixed Polygon | Named with ` (fixed)`. No drag marker. Drag, Re-centre, and choosing a region do not move it. Switching it off hides it |
| Library | No new projection library. The maths lives in `src/core/` |

## 3. On-screen behaviour

The visible name sits beside the switch and truncates when it is long. Its button is named `Rename ${name}`. Clicking it opens a single-line text field labelled `Name`, with the full name selected. The switch, colour, Export, and Delete stay on the row.

Enter, Tab, or a click elsewhere saves the trimmed name and closes the field. Escape puts the previous name back, including when the typed text is blank. A blank name, or a name that is only spaces, is refused. The field closes and the previous name stays. Two Polygons may share a name.

**Export** sits on every row, next to Delete. Its accessible name is `Export ${name}`. It downloads one `.csv`. If the name already ends in `.csv`, in any letter case, that is the file name, so `Field.CSV` stays `Field.CSV`. Otherwise `.csv` is added, so `Nile field` downloads as `Nile field.csv`. Characters that cannot appear in a file name (`/ \ : * ? " < > |`) become a hyphen. A name that becomes empty once those characters are replaced downloads as `polygon.csv`. The name on the row stays as typed.

A one-part Polygon writes `# UTM 36N` or `# UTM 36S`, the header `Poly,Vert,X,Y,Z`, and one row per vertex with Poly `1`. A several-part Polygon writes that same header. Each part is the next Poly number, and Vert restarts at 1. Z is 0. Values are in metres, to two decimal places, in ring order.

**Export selected** appears when two or more Polygons are switched on. It writes one five-column file in the zone of the first switched-on Polygon. Each switched-on Polygon in that zone becomes the next Poly Number, in list order. Parts of that Polygon stay in order inside that number. A switched-on Polygon in another zone is left out, and that row says “This Polygon is outside UTM zone 36N, so it was left out of the export.”

A part is drawn through its vertices and is not forced closed. Planform area adds the shoelace of each part that has at least three vertices. A part with fewer than three vertices adds no area. Rename and Export leave the centre, colour, unit, and on/off state as they are.

The fixed row uses the file name plus ` (fixed)`. It has no drag marker. Drag, Re-centre, and choosing a region leave it where it is. Switching it off hides it and leaves the centre in place. Delete, rename, colour, figures, and Export still work.

## 4. Components and data flow

The Polygon’s existing name field is the only name. Rename writes that field. A Polygon may hold several parts. Each part is an ordered list of vertices and may be open.

Export does not read the map. It uses the stored vertices, converted to metres with the unit saved on that Polygon, and the Polygon’s current centre.

1. Place those metre vertices on the globe with the existing projection, so each corner sits where it sits now.
2. Take the UTM zone from the centre’s longitude, and `N` or `S` from the centre’s latitude. Every vertex uses that zone.
3. Convert each geographic corner to easting and northing on the WGS84 ellipsoid. The scale factor is 0.9996. False easting is 500,000 m. False northing is 0 m in the northern hemisphere and 10,000,000 m in the southern hemisphere.
4. Build the file text and the download name. Z is 0.

The zone number is `floor((longitude + 180) / 6) + 1`. A result of 61 is zone 1, so longitude 180 and longitude −180 are both zone 1. A centre exactly on any other zone meridian uses the zone to the east of that meridian, which is what this formula already does.

`src/core/polygonExport.ts` holds the zone, the conversion, the inverse conversion, the file text, the blank-name rule, and the download name. It has no React. The download is a normal browser file save, the same idea as the snapshot.

Import of a UTM file reads the zone line, groups rows by Poly Number when that column exists, and skips rows that are not numbers. The local Polygon uses X and Y with the unit selected at import, and it is placed on the uppermost selected centre, or on the map centre. The fixed Polygon uses X and Y as UTM metres in the file’s zone. Its centre is the geographic place of that shape. Both rows share the parts.

## 5. Error handling

A blank name, or a name that is only spaces, is refused. The field closes and the previous name stays. Enter, Tab, and a click elsewhere all use that rule. Escape restores the previous name even when the typed text is blank.

If Export or Export selected is clicked while the name field is still open, the name is saved first, and the file uses that saved name.

A centre at latitude exactly −80° or exactly 84° still exports. A centre south of 80°S or north of 84°N does not download. The row says “This Polygon is too close to a pole for a UTM export.”

A part with one or two vertices is written and drawn. It adds no area. A Polygon with no vertices does not download. The row says “A Polygon needs at least one vertex to export.”

A two-column file with no `Vert` or `Vertices` column adds only the local Polygon. A UTM file with a missing or unreadable zone line adds the local Polygon and does not add the fixed twin. The import message says “No fixed Polygon was added because the file has no UTM zone.” Z is kept on the Polygon and is ignored for the planform. Export always writes Z as 0.

A fixed Polygon can be the first selected Polygon. Re-centre and choosing a region still do not move it. Importing an Export selected file again adds one local Polygon and one fixed twin.

## 6. Testing

Pure tests in Vitest, with no React:

- A centre at longitude 31°E and latitude 30°N is zone `36N`. A centre at 31°E and 30°S is `36S`. Longitude 180 is zone 1. A centre on a zone boundary uses the zone to the east. Equator is `N`. Latitude exactly −80° and exactly 84° still export. A centre south of 80°S or north of 84°N does not produce a file.
- A published WGS84 UTM reference point converts to that point’s easting and northing, within 1 metre. Inverse UTM of those metres returns the same geographic point, within 1 metre.
- A one-part Polygon writes `# UTM 36N`, the header `Poly,Vert,X,Y,Z`, and one row per vertex in ring order. Poly is `1`. Vert starts at 1. Z is 0. X and Y are the UTM metres where the corners sit now.
- A several-part Polygon writes that same header. Each part is the next Poly number. Vert restarts at 1 for each part. A part with two vertices is included and adds no area.
- Export selected writes one five-column file in the first selected Polygon’s zone. Selected Polygons in another zone are omitted. Order follows the list.
- A blank or whitespace name is refused and the previous name is kept.
- `Nile field` downloads as `Nile field.csv`. `Field.CSV` stays `Field.CSV`. A slash in the name becomes a hyphen in the file name. A name that sanitises to nothing downloads as `polygon.csv`.
- A two-column file adds one local Polygon. A four-column UTM file adds one local Polygon and one fixed Polygon whose centre is the geographic place of those coordinates. A five-column file adds those same two rows, and Poly Numbers 1, 2, and 3 are parts of each. A UTM file with no zone line adds only the local Polygon.

Component tests render the row and do not mount the map:

- The switch is the pill, and its accessible name is the Polygon name. The visible name is a Rename control.
- Enter, Tab, and clicking elsewhere save a new name. Escape restores the previous name. A blank name leaves the previous name.
- The fixed row has no drag marker. Its name ends with ` (fixed)`.
- Export on a switched-off row downloads the file and leaves the row in the list.
- A polar centre shows “This Polygon is too close to a pole for a UTM export.”
- Export selected leaves a foreign-zone row in the list and shows “This Polygon is outside UTM zone 36N, so it was left out of the export.”
- A missing zone line shows “No fixed Polygon was added because the file has no UTM zone.”

Manual check on the running app: rename a Polygon, press Escape, rename it again and click elsewhere, then Export. The file has the header and Z as 0. Drag the local Polygon, export again, and X and Y change. Import that file and confirm a local Polygon and a fixed twin. The fixed twin stays put after Re-centre and after choosing a region.

## 7. Out of scope

- Saving the Polygon list after the page closes.
- A `.prj` file or an EPSG code besides the `# UTM` line.
- UPS or another polar projection.
- A new projection library.
- Forcing an open part closed on the map.
