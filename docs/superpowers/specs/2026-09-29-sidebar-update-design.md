# Sidebar update — Design Spec

- **Status:** Pending review
- **Date:** 2026-09-30
- **Branch:** `cursor/sidebar-update-20260929`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Workflow:** [`features/sidebar_update.md`](../../../features/sidebar_update.md)
- **Parent specs:** [`2026-09-23-multi-polygon-list-design.md`](2026-09-23-multi-polygon-list-design.md), [`2026-09-24-gis-utm-columns-and-sidebar-resize-design.md`](2026-09-24-gis-utm-columns-and-sidebar-resize-design.md)

## 1. Goal

Make the Polygons list easier to scan, draw multi-part outlines in the thumbnail the way the map already draws them, and send switched-on Polygons back to a fixed outline’s imported centre.

Import, Polygons, and Find a region stay in that order. Planform area, Max span, and Equivalent square side keep those names. Colours, corners, and shadows stay on `DESIGN.md`. The map overlay does not change.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Extent | Starts closed. Visible label and accessible name are **Show extent** or **Hide extent** |
| Outline | Starts closed. Visible label and accessible name are **Show outline** or **Hide outline** |
| Thumbnail | One path per part. The stroke does not close. A part with three or more vertices is filled, and that fill may close. A part with two vertices is an open line with no fill |
| Import | Vertices already stored are not rewritten to force a close |
| Row order | Rotation field, then the file name on its own line, then switch, colour, Export, and Delete |
| Polygons section | Starts open. Collapsing hides the drag hint and the rows. Heading actions stay visible |
| Centre on fixed | Moves switched-on, non-fixed anchors onto the chosen fixed anchor and flies the map there. Bearing does not change. Fixed rows do not move |
| One fixed Polygon | The button does this immediately |
| Several fixed Polygons | The button opens a list of their names. Choosing one runs the action |
| Button disabled | No fixed Polygon, or no switched-on Polygon that can move |
| Tooltips | Draft table in `features/sidebar_update.md`, except Extent and Outline use the verb labels as the accessible name |
| Split | Preview draws parts. `centreSelectedOnFixed` is pure. `App` flies the map. `PolygonList` owns disclosures, the picker, and tooltips |

## 3. On-screen behaviour

**2 · Polygons** is a disclosure and starts open. The accessible name is `Polygons`. The visible text stays `2 · Polygons`. Closing it hides the sentence that begins “Drag the round marker…” and hides the rows. **Export selected** and **Re-centre** still appear only when at least two Polygons are switched on. **Centre on fixed** is always in that heading row.

Each row, top to bottom:

1. The rotation field, only when that row has one. A fixed Polygon has none.
2. The file name on its own line. It is still the rename control.
3. One line: the switch, the colour control, **Export**, and **Delete**.
4. The export note, when there is one, under that line.
5. **Show extent** or **Hide extent**. It starts as **Show extent**. Opening it shows Planform area, Max span, and Equivalent square side, with the same notes as today.
6. **Show outline** or **Hide outline**. It starts as **Show outline**. Opening it shows the thumbnail.

The verb is the state you can take next. The chevron and `aria-expanded` match the open state.

The thumbnail draws each part on its own. Turning a movable Polygon rotates each part before drawing. Parts are not flattened into one shape. The stroke follows the vertices and does not add a segment from the last vertex back to the first. A part with three or more vertices gets a fill; that fill may repeat the first vertex, as `toGeoJsonRing` does for the map. A part with two vertices has no fill. Import does not append a closing vertex.

**Centre on fixed** is disabled when the list has no fixed Polygon, or when every switched-on Polygon is fixed or there is no switched-on Polygon. A disabled press does nothing.

When the button is enabled and exactly one fixed Polygon is in the list, the press moves every switched-on Polygon that is not fixed onto that fixed Polygon’s anchor, then flies the map to that anchor. The fixed row’s own switch does not matter. Bearing, colour, names, and fixed anchors stay as they are.

When more than one fixed Polygon is in the list, the press opens a list of those names in sidebar order. Nothing moves yet. Choosing a name runs the same move and flight, then closes the list. Escape, or a pointer down outside the list, closes it and leaves anchors and the camera alone.

The flight uses `flyTo` with that anchor as the centre. Zoom stays whatever it is now. Duration is 1200ms, the same as Find a region.

Tooltips open on hover and on keyboard focus. Each is `role="tooltip"`, pointed at with `aria-describedby`, and it does not receive pointer events. The accessible name is enough to use the control without the tooltip. Touch does not need a hover tip.

| Control | Accessible name | Tooltip body |
| --- | --- | --- |
| Section heading | Polygons | Show or hide the list of outlines. |
| Switch | Show on map | Turn this Polygon on or off. Switching off keeps the row. |
| Name | Rename {name} | Rename this Polygon. |
| Colour | Colour for {name} | Colour of this outline on the map. |
| Export | Export {name} | Download this Polygon as UTM easting and northing where it sits. |
| Delete | Delete {name} | Remove this Polygon from the session. A lasso pair removes both rows. |
| Bearing | Rotation for {name} | Compass bearing of the locked edge. Type a new bearing to turn the outline. |
| Extent | Show extent or Hide extent | Planform area, longest span, and equivalent square side. |
| Outline | Show outline or Hide outline | Small drawing of each imported part. Open parts stay open. |
| Export selected | Export selected | Download switched-on Polygons in the same UTM zone as one file. |
| Re-centre | Re-centre | Move the other switched-on Polygons onto the uppermost centre. Fixed outlines stay put. |
| Centre on fixed | Centre on fixed | Move switched-on Polygons back to a fixed outline’s imported centre, and centre the map there. |
| Fixed picker row | {fixed name} | Use this fixed outline as the centre. |

`{name}` is that row’s `sourceName`. Several rows may each expose a switch named `Show on map`, and an Extent or Outline button with the same verb. Tests that need one row look inside that row. The disabled **Centre on fixed** control is wrapped so the tooltip still opens on hover and focus.

The picker uses Panel at 95%, 12px corners, and the Float shadow, because it floats over the row. Sidebar rows themselves get no shadow. Controls stay at least 44px. Name and bearing fields stay 16px text.

## 4. Components and data flow

`PolygonPreview` takes `parts: Vertex[][]`. It draws one path per part and does not read the Polygon list or the map.

`centreSelectedOnFixed(items, fixedId)` lives in `src/core/polygonList.ts` and has no React. If `fixedId` is missing or that row is not fixed, it returns the same array. Otherwise it copies that row’s anchor onto every switched-on Polygon that is not fixed, even when those anchors were already equal to it. Bearing, colour, selection, and fixed rows are unchanged. It does not know about the map.

`App` calls `centreSelectedOnFixed`. If the function returns the same array, `App` does not fly. If it returns a new list, `App` stores that list and `flyTo`s the chosen anchor, including when the coordinates were already there. If the map is not ready, the anchors still update and there is no flight.

`PolygonList` owns the section disclosure, the row order, both verb disclosures, the Centre on fixed button, the name picker, and the tooltips. It calls back with the chosen fixed id. It does not move anchors. Tooltip title and body strings live in `src/ui/sidebarTooltips.ts`.

`src/map/PolygonOverlay.tsx` stays as it is.

## 5. Error handling

Rename cancel, bearing rejection, and export notes stay as they are. There is no new error sentence for Centre on fixed.

A missing fixed id, or an id that is not fixed, does not change the list and does not fly the map. Dismissing the picker does not change the list and does not fly the map. A disabled button does not open the picker and does not move anchors.

A part with fewer than two vertices is omitted from the thumbnail. A part with two vertices is a line. Empty `parts` shows no paths.

## 6. Testing

`src/core/polygonList.test.ts`:

- A fixed id moves only switched-on, non-fixed anchors onto that anchor.
- Fixed rows, bearing, and switched-off rows stay put.
- A missing id or a non-fixed id returns the same list.

`PolygonPreview`, in a new test or the nearest existing UI test:

- Two parts do not share a stroke, and neither stroke closes.
- A part with three or more vertices has a fill.
- A part with two vertices has no fill.

`src/ui/PolygonList.test.tsx`:

- The section starts open.
- Row order is the rotation field, then the file name, then switch, colour, Export, and Delete.
- The disclosures start as **Show extent** and **Show outline**, and flip to **Hide** when opened.
- **Centre on fixed** is disabled when it cannot run.
- One fixed Polygon calls the centre callback with that id and does not open a list.
- Two fixed Polygons open the list first. Choosing a name calls the callback. Escape does not.
- Accessible names match the table in §3.

`src/App.test.tsx` no longer looks for **Hide figures** on first paint. Planform area and the preview image are absent until those disclosures are opened. The switch is named `Show on map`, not the file name. A test that centres on a fixed Polygon checks the moved anchor and that `flyTo` was asked for that centre at the current zoom.

## 7. Out of scope

- Changing the map overlay, the Toolbox, or the basemap.
- Resetting bearing when centring on a fixed Polygon.
- Moving a fixed Polygon.
- Remembering open disclosures or the picker after reload.
- New motion beyond the existing chevron and `.pressable`. A later Emil pass may add disclosure, tooltip, and picker motion.
- A second accessible name that repeats the file name on Extent, Outline, or the switch. The verb is the name, as agreed.
