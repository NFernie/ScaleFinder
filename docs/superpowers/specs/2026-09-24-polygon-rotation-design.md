# Polygon rotation — Design Spec

- **Status:** Awaiting review
- **Date:** 2026-09-24
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-24-gis-utm-columns-and-sidebar-resize-design.md`](2026-09-24-gis-utm-columns-and-sidebar-resize-design.md)

## 1. Goal

Let a person rotate a movable Polygon around its centre without stretching it. The number they see is the compass bearing of one edge chosen when the Polygon was added. A Polygon whose name ends with ` (fixed)` cannot rotate.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Who can rotate | A movable Polygon only. A fixed Polygon has no rotate handle and no bearing field |
| Shape | Imported corners stay stored as imported. A rotation turns those metres around their own centre, so every side keeps its length |
| Reference edge | Chosen once, when the Polygon is added, including a sample or a measured shape. An edge joins two consecutive corners in file order. An open part does not add an edge from the last corner back to the first. The chosen edge is the one whose compass bearing is closest to true north. A tie uses the earliest part, then the earliest edge in that part. A shape with several parts considers every part. That edge is never recalculated |
| Number | The field shows that edge’s compass bearing, clockwise from north, from 0 up to but not including 360. It is measured after the shape is placed on the map |
| Controls | Drag a rotate handle on the reference edge, or type a bearing on the row. Both set the same rotation |
| Move | Dragging the move marker, and choosing a region, change only the centre. The rotation stays. The field updates, even if the bearing changes slightly |
| Re-centre | Moves the centre and turns the shape so the locked edge matches the bearing saved when the Polygon was added |
| Zero-length edge | If the reference edge’s two corners are the same point, the handle and the field are not shown. Re-centre only moves the centre |

## 3. On-screen behaviour

The rotate handle sits on the reference edge. It is separate from the move marker at the centre. Dragging it turns the Polygon around its centre. Side lengths stay the same.

The bearing field is on the movable row. It shows the locked edge’s compass bearing in degrees. Typing a number and pressing Enter, Tab, or clicking elsewhere turns the Polygon so that edge matches the typed bearing. The field then shows the bearing the edge actually has. Escape restores the number that was showing when the field opened.

A blank bearing, a bearing that is not a number, or a bearing outside 0 up to but not including 360 is refused. The field closes and the previous bearing stays.

Switching a Polygon off hides both handles. Delete, rename, colour, and export still work. Export uses the corners where they sit after the current rotation.

## 4. Components and data flow

Each movable Polygon stores a rotation in degrees, starting at 0, the reference edge as a part index and an edge index, and the compass bearing that edge had when the Polygon was added.

Turning happens in `src/core/` before placement. The corners rotate around their own centre in metres. The existing geographic placement then puts that centre on the Polygon’s anchor.

The bearing in the row is measured after placement. Typing a number, or dragging the rotate handle, finds the rotation that makes the measured bearing match. Re-centre sets the rotation so the measured bearing matches the saved original bearing at the new centre.

`PolygonOverlay` draws the rotate handle for a movable Polygon that has a usable reference edge, and keeps the move marker. `PolygonList` shows the bearing field on a movable row. A fixed Polygon stores no rotation and renders neither control. `App.tsx` passes the rotation through and writes it back when either control changes.

## 5. Error handling

A blank bearing, a non-numeric bearing, or a bearing outside 0 up to but not including 360 is refused. Enter, Tab, and a click elsewhere use that rule. Escape restores the number from when the field opened.

A zero-length reference edge hides the handle and the field. Re-centre then only moves the centre. A fixed Polygon ignores a rotate action. Switching a Polygon off hides both handles.

## 6. Testing

Pure tests in `src/core/`:

- Rotating the local metres keeps every side the same length and keeps the centre in place.
- The reference edge is the one closest to north when the Polygon is added, and that index does not change after a later turn.
- Typing a bearing makes that edge’s compass bearing match, within a tenth of a degree.
- Moving the centre leaves the rotation unchanged, and the measured bearing may differ slightly.
- Re-centre restores the bearing saved when the Polygon was added.
- A zero-length edge does not rotate.
- A fixed Polygon has no rotation field.

Component tests:

- A movable row has a bearing field. A fixed row does not.
- An out-of-range number leaves the previous bearing.
- The rotate handle is absent on a fixed Polygon.

Manual check: drag the rotate handle, type a bearing, drag the move marker, then use Re-centre. The shape returns to its original bearing and does not look stretched.

## 7. Out of scope

- Rotating a fixed Polygon.
- Saving the rotation after the page closes.
- A separate undo stack beyond Escape on the bearing field.
