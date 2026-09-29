# Lasso brush — Design Spec

- **Status:** Awaiting review
- **Date:** 2026-09-29
- **Branch:** `cursor/toolbox-merge-main-3678`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-28-map-toolbox-design.md`](2026-09-28-map-toolbox-design.md)
- **Plan to update after approval:** [`feature/toolbox.md`](../../../feature/toolbox.md)

This spec amends the Lasso only. Polygon, Ruler, Circle, and Square stay as in the parent spec.

## 1. Goal

Replace the Lasso's single click with a live brush. The user draws a free curve by dragging, and may add corners by clicking. Similar colours within the radius of that stroke join one region. The colour compared at each sample is the colour under the pointer at that sample, so the accepted colour may change along the stroke. Double-click closes the guide stroke. **Add to list** stores the colour outline as a movable Polygon and leaves a fixed copy of that outline on the map.

The user explicitly expanded the Lasso on 2026-09-29. The parent sentence "Lasso traces a similar colour inside a radius of a click" is replaced by this spec. `PRODUCT.md` and `ScaleFinderPurpose.md` are updated in the same implementation, not before this spec is accepted.

Nothing drawn is kept after the page closes. Pixels are not sent off the device.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Gesture | A drag follows a free curve. A click with no drag adds a corner. Both are allowed on one stroke |
| Include | Similar colours within the radius join the region. Contrasting colours stay out. There is no subtract mode |
| Colour reference | Each sample uses the colour under the pointer at that sample. The region is the union of those patches |
| Radius | Screen pixels. Default 48. Clamp 8–128. Same control as today |
| Contrast | Maximum of the absolute red, green, and blue differences. Alpha is ignored. Default 32. Clamp 0–255. Every channel must be within the limit |
| Live | The colour outline grows while the stroke is open. Samples along a drag are frequent enough to look continuous, not every pixel |
| Settings | Radius and Contrast change only while the stroke is open. They apply to later samples. They do not rebuild the ring already drawn |
| Double-click | With at least 3 guide points, closes the guide from the last point back to the first and does not append a new point. Freezes the colour ring when one exists. Fewer than 3 guide points does not close |
| Add to list | Offered only when a colour ring exists. Stores the colour outline, not the guide. Writes two rows that share a `pairId` |
| Movable row | Named `Lasso`. Stored in metres at the drawn centre. Can be dragged and rotated. Next unused swatch. Does not use the import alignment rule |
| Fixed row | Named `Lasso (fixed)`. Same outline, centre, and swatch. `fixed: true`. No drag handle, no bearing, and it does not move on re-centre or region search |
| Delete pair | Deleting either row deletes every row with that `pairId` |
| Guide after add | The guide stroke is removed. The fixed outline stays until the pair is deleted |
| One drawing | Unchanged. Another tool while a draft exists shows `Delete the current drawing before choosing another tool.` |
| Pan | While the Lasso status is `drawing`, a pointer drag extends the stroke and does not pan the map |
| Snapshot | The guide and the colour outline are inside the snapshot. The Toolbox and the readout stay outside it |
| Persistence | Nothing is kept after the page closes |
| Out of scope | Subtract mode. A radius in ground metres. A locked compass bearing. Changing Polygon, Ruler, Circle, or Square |

A single click no longer finishes the Lasso. One click adds one corner and one sample. Closing still needs a double-click and at least 3 guide points.

## 3. On-screen behaviour

Lasso stays in the Toolbox popup. The readout keeps Radius, Contrast, the failure sentence, **Add to list**, and **Delete**.

Pressing on the map starts the guide and samples that pixel. Dragging extends a free curve. A click adds a corner. Around each sample, pixels inside the radius join when their colour is close to the colour under that sample. Patches that touch become one part. A sample far enough to leave a gap becomes another part of the same Polygon.

Two lines are on the map while the draft exists. The guide is the stroke. The colour outline is the boundary of the joined patches. Both use the parent line style: `#ffffff` at 2px over a 4px `#0f172a` casing. A closed shape uses white fill at 0.2 opacity.

Double-click with at least 3 guide points closes the guide and freezes the colour outline when one exists. **Add to list** then adds the movable and fixed rows and removes the guide. **Delete** on the readout clears the guide, the colour outline, and the message, and does not remove Polygons already in the list.

## 4. Components and data flow

| Module | Role |
| --- | --- |
| `src/core/lasso.ts` | Brush union on a pixel buffer, outline, and parts. The existing single-seed flood fill stays for its tests. The menu path uses the brush |
| `src/core/toolboxSession.ts` | Guide points, colour ring, open or closed stroke, one-drawing rule |
| `src/core/ringDraft.ts` | Colour ring to a metres Polygon draft. Unchanged role |
| `src/core/polygonList.ts` | `pairId` on a row. Delete removes the pair |
| `src/map/sampleCanvas.ts` | Read the map canvas in the browser. Unchanged role |
| `src/ui/LassoMenu.tsx` | Radius, Contrast, messages, **Add to list**, **Delete** |
| `src/App.tsx` | Pointer down, move, click, and double-click feed the session. Samples the canvas. Writes the pair on **Add to list** |

`LassoDraft` keeps `radiusPx`, `maxChannelDelta`, and `message`. The guide points are the samples. Each stored point is one brush sample. A drag stores points often enough to look continuous. Status is `drawing` while the stroke is open and `closed` after a double-click that had at least 3 guide points. `drawing` replaces today's `aim`. `closed` replaces today's `ready`.

The brush function takes the raster, the sample pixels, the radius, and the contrast. It returns the colour ring as one or more parts, or null when the joined fill is under 8 pixels or the simplified ring is under 3 points. Simplification stays Ramer–Douglas–Peucker at 1.25 pixels. The fill at each sample is 4-connected and stops at the radius, using that sample's own colour.

Map pointer events call the session. The session does not read pixels. `App` reads the canvas and passes samples in. While status is `drawing`, a pointer drag extends the guide and does not pan the map.

**Add to list** uses `ringToDraft` twice from the frozen colour ring: once named `Lasso`, once named `Lasso (fixed)` with `fixed: true`. Both store the same `pairId`. The guide is not copied into either row.

## 5. Error handling and copy

| Condition | Result |
| --- | --- |
| Canvas cannot be read | `This basemap does not allow colour sampling.` The guide stays. No colour outline is added. **Add to list** stays hidden |
| One sample fills fewer than 8 pixels | That sample adds nothing. The stroke continues |
| Double-click and the joined region has no ring of at least 3 points | The guide closes when it has at least 3 points. The readout shows `No feature found at that contrast.` **Add to list** stays hidden |
| Double-click with fewer than 3 guide points | The stroke stays open. The readout shows `Add at least three corners to close a polygon.` |
| Another tool chosen while a draft exists | `Delete the current drawing before choosing another tool.` |
| **Delete** on the readout | Clears the draft only |
| **Delete** on either list row of a pair | Removes both rows |

Radius and Contrast ignore edits while status is `closed`.

## 6. Testing

Vitest, with no map:

- `src/core/lasso.test.ts`. Two samples of the same colour that touch become one ring. Two samples of different colours, each matching only its own patch, both join the mask. A pixel farther than the radius stays out. A contrasting pixel inside the radius stays out. Fewer than 8 filled pixels returns null. A gap between patches becomes two parts. The existing single-seed flood-fill tests stay.
- `src/core/toolboxSession.test.ts`. A drag point and a click both append guide points while `drawing`. Radius and Contrast change only then. Double-click with fewer than 3 guide points leaves the stroke open and sets `Add at least three corners to close a polygon.` Double-click with a colour ring closes the guide. **Add to list** returns a movable draft named `Lasso` and a fixed draft named `Lasso (fixed)` with the same `pairId`. The guide is not in either draft. Deleting either id removes the pair.

Polygon, Ruler, Circle, and Square tests stay.

On the map, by hand: drag a free curve and see the colour outline grow; add a corner with a click; double-click and see the guide close; **Add to list** leaves a fixed outline on the map and a rotatable Lasso in the list; delete either row and both are gone. A basemap that cannot be sampled shows `This basemap does not allow colour sampling.`

## 7. Doc updates during implementation

After this spec is accepted, update `feature/toolbox.md` for this Lasso change only. In the same implementation, replace the single-click Lasso sentence in `PRODUCT.md` and `ScaleFinderPurpose.md` with the brush, the closed guide, and the fixed plus movable pair. Do not add a colour token. `DESIGN.md` already describes the Toolbox line, panel, and type.
