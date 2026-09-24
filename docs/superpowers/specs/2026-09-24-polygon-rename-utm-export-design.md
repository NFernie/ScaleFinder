# Polygon rename and UTM export — Design Spec

- **Status:** Draft (awaiting review of this file)
- **Date:** 2026-09-24
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-23-multi-polygon-list-design.md`](2026-09-23-multi-polygon-list-design.md)

## 1. Goal

Let a person rename a Polygon in the session list, and download that Polygon as a two-column CSV of UTM easting and northing where its vertices sit on the globe at export time.

This is an agreed expansion. Implementation adds rename and this UTM export to `ScaleFinderPurpose.md` as in scope. Saving a Polygon list, and teaching the importer to place a UTM file back on the same spot, stay out of scope.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Name | One name per Polygon. It is the row label and the download name |
| Rename | Click the visible name. Enter, Tab, or a click elsewhere saves the trimmed name. Escape restores the previous name |
| Blank name | A blank name, or a name of only spaces, is refused. The field closes and the previous name stays |
| Switch | The switch is the pill alone. Its accessible name is the Polygon name. Renaming does not change on/off |
| Coordinates | UTM easting and northing, in metres, for each vertex at its current globe position |
| Zone | The zone of the Polygon’s current centre. Every vertex uses that one zone |
| Hemisphere | `N` when the centre latitude is zero or north. `S` when it is south |
| File | First line `# UTM 36N` or `# UTM 36S`, then one `easting,northing` row per vertex |
| Import again | The existing importer skips the `#` line and reads the numbers as a local shape |
| Availability | A switched-off Polygon can be renamed and exported |
| Library | No new projection library. The maths lives in `src/core/` |

## 3. On-screen behaviour

The visible name sits beside the switch and truncates when it is long. Its button is named `Rename ${name}`. Clicking it opens a single-line text field labelled `Name`, with the full name selected. The switch, colour, Export, and Delete stay on the row.

Enter, Tab, or a click elsewhere saves the trimmed name and closes the field. Escape puts the previous name back, including when the typed text is blank. A blank name, or a name that is only spaces, is refused. The field closes and the previous name stays. Two Polygons may share a name.

**Export** sits on every row, next to Delete. Its accessible name is `Export ${name}`. It downloads one `.csv` for that Polygon. If the name already ends in `.csv`, in any letter case, that is the file name, so `Field.CSV` stays `Field.CSV`. Otherwise `.csv` is added, so `Nile field` downloads as `Nile field.csv`. Characters that cannot appear in a file name (`/ \ : * ? " < > |`) become a hyphen. A name that becomes empty once those characters are replaced downloads as `polygon.csv`. The name on the row stays as typed.

The file starts with `# UTM 36N` or `# UTM 36S`, from the zone and hemisphere of that Polygon’s current centre. Equator is `N`. Then each vertex is one row of easting and northing, in metres, to two decimal places, in ring order. The first vertex is not written again at the end.

Rename and Export leave the centre, colour, unit, and on/off state as they are.

## 4. Components and data flow

The Polygon’s existing name field is the only name. Rename writes that field.

Export does not read the map. It uses the stored vertices, converted to metres with the unit saved on that Polygon, and the Polygon’s current centre.

1. Place those metre vertices on the globe with the existing projection, so each corner sits where it sits now.
2. Take the UTM zone from the centre’s longitude, and `N` or `S` from the centre’s latitude. Every vertex uses that zone.
3. Convert each geographic corner to easting and northing on the WGS84 ellipsoid. The scale factor is 0.9996. False easting is 500,000 m. False northing is 0 m in the northern hemisphere and 10,000,000 m in the southern hemisphere.
4. Build the file text and the download name.

The zone number is `floor((longitude + 180) / 6) + 1`. A result of 61 is zone 1, so longitude 180 and longitude −180 are both zone 1. A centre exactly on any other zone meridian uses the zone to the east of that meridian, which is what this formula already does.

`src/core/polygonExport.ts` holds the zone, the conversion, the file text, the blank-name rule, and the download name. It has no React. The download is a normal browser file save, the same idea as the snapshot.

## 5. Error handling

A blank name, or a name that is only spaces, is refused. The field closes and the previous name stays. Enter, Tab, and a click elsewhere all use that rule. Escape restores the previous name even when the typed text is blank.

If Export is clicked while the name field is still open, the name is saved first, and the file uses that saved name.

A centre at latitude exactly −80° or exactly 84° still exports. A centre south of 80°S or north of 84°N does not download. The row says “This Polygon is too close to a pole for a UTM export.”

A shape with fewer than three corners does not download. The row says “A Polygon needs at least three corners to export.”

Rename and a successful export leave the centre, colour, unit, and on/off state as they are. Importing the file again still treats the numbers as a local shape. The `# UTM 36N` line is skipped by the existing importer.

## 6. Testing

Pure tests in Vitest, with no React:

- A centre at longitude 31°E and latitude 30°N is zone `36N`. A centre at 31°E and 30°S is `36S`. Longitude 180 is zone 1. A centre on a zone boundary uses the zone to the east. Equator is `N`.
- A published WGS84 UTM reference point converts to that point’s easting and northing, within 1 metre.
- Export places the Polygon’s own vertices on the globe at its current centre, then writes `# UTM 36N` and one `easting,northing` row per vertex, to two decimal places, in ring order. The first vertex is not repeated.
- A southern centre uses false northing, so northings are in the 10,000,000 m range.
- A vertex across a zone boundary is still written in the centre’s zone.
- A blank or whitespace name is refused and the previous name is kept.
- `Nile field` downloads as `Nile field.csv`. `Field.CSV` stays `Field.CSV`. A slash in the name becomes a hyphen in the file name. A name that sanitises to nothing downloads as `polygon.csv`.
- A centre south of 80°S or north of 84°N does not produce a file. Fewer than three corners does not produce a file.

Component tests render the row and do not mount the map:

- The switch is the pill, and its accessible name is the Polygon name. The visible name is a Rename control.
- Enter, Tab, and clicking elsewhere save a new name. Escape restores the previous name. A blank name leaves the previous name.
- Export on a switched-off row downloads the file and leaves the row in the list. The centre, colour, and on/off state stay as they are.
- A polar centre shows “This Polygon is too close to a pole for a UTM export.”

Manual check on the running app: rename a Polygon, press Escape, rename it again and click elsewhere, then Export. The file starts with the UTM comment and two columns. Drag that Polygon, export again, and the easting and northing change with the new place on the globe. Import that file and confirm it loads as a local shape.

## 7. Out of scope

- Saving the Polygon list after the page closes.
- Placing an exported UTM file back on the same globe position on import.
- A `.prj` file, an EPSG code, or more than two numeric columns.
- UPS or another polar projection.
- Exporting several Polygons as one file.
- A new projection library.
