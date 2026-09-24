# Map ruler and polygon calculator — Design Spec

- **Status:** Approved
- **Date:** 2026-09-23
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-23-multi-polygon-list-design.md`](2026-09-23-multi-polygon-list-design.md)

## 1. Goal

Let a person measure a custom ground distance on the map, and close that path into a polygon to see its area. The measurement stays separate from the Polygon list until they choose to add it.

This is an agreed expansion. Implementation adds the ruler to `ScaleFinderPurpose.md` as in scope. Saving measurements, and saving a Polygon list, stay out of scope.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Placement | A chain of clicks on the map. Each click adds a corner |
| Readout | A floating menu over the map. The sidebar does not show measurement figures |
| Ruler | Done, while corners are still being added, keeps the open chain. The menu shows each segment and the total. No area |
| Close | Double-click, with at least three corners, closes the shape. The total includes the closing side. The menu adds the area |
| Area | Calculated in square metres. Shown with the same formatting as the sidebar figures |
| Add to list | Only a closed shape. Copies it into the Polygon list, then clears the measurement |
| Delete | Delete on the menu clears the measurement in every status, including a chain that is still being added. A second double-click deletes only a closed polygon. Nothing is added to the list |
| One at a time | Measure does not start another chain until the current one is deleted or added |
| Colour | The measurement line is white, not a Polygon swatch. Add to list assigns the next unused Polygon colour |
| Centre | The new Polygon stays where it was drawn. It does not snap to another Polygon |
| Snapshot | The line and closed shape are in the PNG. The floating menu is not |
| Sidebar | Unchanged until Add to list |

## 3. On-screen behaviour

**Measure** sits over the map, clear of the basemap menu and the zoom buttons. Turning it on opens the floating menu in that place. The sidebar does not change.

Clicks on the map add corners while the chain is still accepting them. The menu lists each segment as “Segment 1”, “Segment 2”, and so on, then “Total”, as soon as two corners exist. A closed shape adds “Area” after the total. The line is white (`#ffffff`), 2px, drawn over a 4px `#0f172a` casing so it stays visible on the basemap. A closed shape also has a white fill at 0.2 opacity. Dragging a Polygon marker still moves that Polygon and does not add a corner.

**Done** is available only while corners are still being added. It stops the chain and keeps it as a ruler. The menu shows each segment and the total. It does not show an area. **Delete** is on the menu in every status. It clears the chain, the ruler, or the closed shape, and does not add a Polygon.

A double-click, while corners are still being added and there are at least three corners, closes the shape and does not store a second copy of the last corner. The menu then shows each segment, including the closing side, the total length, and the area. **Add to list** appears only then. **Delete**, or a second double-click, removes the closed measurement and does not add a Polygon. After Done has made a ruler, a double-click does not close that ruler and does not delete it.

**Add to list** appends a Polygon named “Measured polygon”. It is switched on, stored in metres, and given the next unused swatch. Its centre is the centre of the drawn shape. The floating menu and the white line then go away. From then on, drag, colour, figures, and Delete for that shape belong to the sidebar row. Two measured polygons may share that name.

The line and the closed shape are inside the snapshot frame. The floating menu sits outside that frame, like the basemap menu, so the numbers are not in the PNG. The menu scrolls inside itself when there are many segments.

Only one measurement exists at a time. **Measure** does not start another chain until the current one is deleted or added to the list.

**Done** with fewer than two corners does not finish a ruler. The corners stay, and the menu says “Add at least two corners.” A double-click with fewer than three corners does not close a polygon and does not delete anything. The menu says “Add at least three corners to close a polygon.”

The double-click that closes a shape is not also the double-click that deletes it. While corners are still being added, double-click does not zoom the map. A click that misses the map is ignored.

Importing a file, switching a Polygon, or changing the unit control does not change the measurement. The Polygon created by **Add to list** is stored in metres, so a later change of the unit control does not resize it. A closed shape with no real area still closes, shows an area of zero, and can still be added.

## 4. Components and data flow

The app holds one measurement, or none. It does not live in the Polygon list.

| Status | Meaning |
| --- | --- |
| Adding | Clicks append corners |
| Ruler | The open chain is finished. Segments and total only |
| Polygon | The chain is closed. Segments, total, and area |

Clicks are handled only while the status is Adding. **Done** moves Adding to Ruler when there are at least two corners, and is not offered once the status is Ruler or Polygon. Double-click moves Adding to Polygon when there are at least three corners. **Delete** clears Adding, Ruler, or Polygon. A second double-click clears a Polygon only. **Add to list** runs only for a Polygon, then clears the measurement.

Segment length is the existing ground distance between two geographic corners. The ruler total is the sum of the open sides. The polygon total adds the side from the last corner back to the first.

The area is computed by turning the corners into local east/north metres around their centre, then using the same area function as an imported Polygon. The conversion is:

- Use the first corner as a temporary origin.
- Convert every corner to metres east and north from that origin.
- Take the local centroid of those metres.
- The Polygon anchor is the geographic point of that centroid.
- The Polygon’s raw vertices are those metre coordinates, in metres.

Projecting that Polygon with the existing geographic placement puts the corners back on the measured points, within geodesic tolerance. **Add to list** does not use the import rule that aligns a new Polygon to the first selected centre.

`src/core/measurement.ts` holds these rules and has no React. The floating menu is `src/ui/MeasureMenu.tsx`, placed outside the snapshot frame. The white line and the closed fill are a map layer inside the frame. The menu uses the existing length and area formatters. It does not render the sidebar figure list.

## 5. Error handling

**Done** with fewer than two corners leaves the status on Adding and shows “Add at least two corners.” A double-click with fewer than three corners leaves the status on Adding and shows “Add at least three corners to close a polygon.”

**Add to list** on a ruler does nothing. **Delete** does not modify the Polygon list. A marker click, a missed map click, and a change to import, selection, or the unit control do not modify the measurement.

A collinear or zero-area ring is valid. Its area is zero. **Measure** while a measurement already exists does not replace it.

## 6. Testing

Pure tests in Vitest, with no React:

- Each segment is the ground distance between its corners, and the total adds those segments.
- A ruler total has no closing side. A polygon total includes it.
- The area is in square metres and matches the imported-Polygon area function on the local metres.
- A closed shape becomes a Polygon whose centre is the drawn centre. Projecting it lands on the measured corners.
- Done with one corner stays Adding. A double-click with two corners does not close or delete. A second double-click deletes only a Polygon.
- Delete while Adding, and Delete on a ruler or a closed polygon, clears the measurement and does not create a Polygon.
- Add to list returns the new Polygon and clears the measurement.

Component tests render the floating menu and do not mount the map:

- A ruler shows each segment and the total, and does not show an area or **Add to list**.
- A closed polygon shows the area and **Add to list**.
- Done with one corner shows “Add at least two corners.”
- The sidebar does not show the measurement figures.
- **Add to list** adds a “Measured polygon” row and removes the floating menu.
- **Delete** removes the menu and leaves an existing Polygon row in place.

Manual check on the running map, as two separate passes. First, turn **Measure** on, click a chain, and press **Done**. The menu shows each segment and the total, and no area. **Delete** removes that ruler. Second, turn **Measure** on again, click at least three corners, and double-click to close. The menu shows the area. A second double-click removes it. Repeat the close, then **Add to list**: the shape stays where it was drawn, in its own colour, and the sidebar figures match the menu before it closed. Dragging a Polygon marker does not add a corner. The snapshot shows the line and not the floating menu.

## 7. Out of scope

- More than one measurement at a time.
- Editing a corner after the chain is finished.
- Snapping to a Polygon vertex.
- Saving the measurement after the page closes.
- Putting the measurement figures in the sidebar before **Add to list**.
- Showing the floating menu in the PNG.
