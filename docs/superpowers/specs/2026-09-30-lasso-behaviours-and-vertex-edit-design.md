# Lasso behaviours and vertex edit — Design Spec

- **Status:** Pending review
- **Date:** 2026-09-30
- **Branch:** `cursor/lasso-behaviours-vertex-edit-53a3`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent specs:** [`2026-09-29-lasso-brush-design.md`](2026-09-29-lasso-brush-design.md), [`2026-09-29-toolbox-ui-update.md`](2026-09-29-toolbox-ui-update.md)
- **Design system:** [`DESIGN.md`](../../../DESIGN.md)

This spec adds two Lasso behaviours and a vertex edit on a closed draft. Dynamic, the parent brush, stays. Polygon, Ruler, Circle, and Square stay as they are, except the vertex edit on a closed Polygon draft.

The user approved the behaviour on 2026-09-30. `PRODUCT.md` and `ScaleFinderPurpose.md` are updated in the implementation, not before this spec is accepted.

Nothing drawn is kept after the page closes. Pixels are not sent off the device.

## 1. Goal

The Lasso keeps today's brush and gains two more behaviours, chosen in the Lasso readout before the first point. A closed Polygon or a closed Lasso can gain or lose a vertex before **Add to list**.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Behaviours | **Dynamic**, **Static**, and **Outline**. Default is Dynamic |
| When | The choice can be changed while Lasso is selected and no point exists. After the first point the three buttons stay visible and disabled until **Delete** |
| Dynamic | Unchanged. Each sample uses the colour under the pointer at that sample |
| Static | Same radius, contrast, and radius limit. Every sample is compared with the colour under the first point. Later pointer colours do not replace it |
| Outline | The stroke is the Polygon. Click adds a corner, drag follows the pointer, double-click closes. No colour sample. Radius and Contrast are hidden |
| Add to list | Still stores a movable `Lasso` and a fixed `Lasso (fixed)` that share a `pairId`. Dynamic and Static store the colour outline. Outline stores the closed stroke |
| Vertex edit | Only after Polygon or Lasso is closed, and only before **Add to list**. Not on list rows. Not on Ruler, Circle, or Square. Not while the stroke is still open |
| What is edited | Polygon corners. For Dynamic and Static, the colour outline, not the guide. For Outline, the closed stroke |
| Menu | Right-click within 12 CSS pixels of a side or a corner opens **Add vertex** and **Delete vertex**. A farther click does nothing |
| Add vertex | Inserts the closest point on the nearest side. Distance is in screen pixels |
| Delete vertex | Removes the nearest corner in screen pixels. A part that would fall below 3 corners is left unchanged |
| After an edit | The brush is not run again. **Add to list** stores the edited outline. Polygon area in the readout updates from the edited corners. A Lasso readout has no area line; the list shows the area of the edited ring |
| Unchanged | One drawing at a time. Nothing is kept after the page closes. Pixels stay on the device |

`PRODUCT.md` currently describes only the Dynamic brush. That sentence, and the matching sentence in `ScaleFinderPurpose.md`, are updated in the implementation after this spec is accepted.

## 3. On-screen behaviour

The Toolbox grid stays five icons. The new choices live in the Lasso readout, using the same pressed-button row as Rectangle and Square. Order is **Dynamic**, **Static**, **Outline**. The chosen button uses Selected teal. Each is at least 44px tall. On a narrow readout the row wraps. The panel, type, and corners stay as in `DESIGN.md`.

Each button has a hover and focus tooltip:

| Button | Tooltip |
| --- | --- |
| Dynamic | Each sample uses the colour under the pointer. The accepted colour can change along the stroke. |
| Static | Every sample is compared with the colour under the first point. Later colours do not replace it. |
| Outline | Click and drag the outline. The stroke is the Polygon. Map colour is ignored. |

Before the first point, all three can be chosen. After it, they stay visible, the chosen one stays pressed, and all three are disabled at 40% opacity until **Delete**. The tooltip still shows from a wrapper around the disabled button.

Dynamic and Static keep Radius and Contrast, with the tooltips they have now. Outline hides both. The Lasso icon tooltip becomes: "Choose Dynamic, Static, or Outline in the readout, then paint on the map. Double-click to close."

Dynamic and Static keep the radius-ring cursor. Outline uses the Polygon crosshair. Edge pan while drawing is unchanged.

The map lines stay white, 2px, on a 4px dark casing, with a closed fill at 0.2 opacity. Dynamic and Static still show the guide and the colour outline. Editing vertices moves only the colour outline. The guide stays on the map until **Add to list** or **Delete**. Outline shows the stroke while drawing. After Outline closes, the map shows the closed stroke only, including after a vertex edit.

While a Polygon or Lasso draft is closed and has an editable ring of at least 3 corners, each corner of that ring is an 8px white dot drawn in HTML over the map, not as a map layer. The dots sit on Polygon corners, or on Lasso `parts`. They do not sit on the guide. The dots and the menu stay out of the snapshot. The line and fill stay in it. When the colour outline is missing, no dots and no hint are shown.

A right-click within 12 CSS pixels of a side or a corner opens a menu at that point. It has two rows, **Add vertex** and **Delete vertex**, each at least 44px, on the same floating panel as the readout. The first row takes keyboard focus. If the menu would leave the map frame, it flips inward. Choosing either row, pressing Escape, clicking elsewhere, or moving the map closes it. The browser menu is suppressed only when this menu opens. A touch long-press is out of scope.

When that editable ring exists, the readout adds: "Right-click a side or corner to add or delete a vertex."

## 4. Components and data flow

The Lasso choice lives on the draft. Choosing Lasso already starts an empty drawing, so the choice can be changed until the first point is stored.

| Module | Role |
| --- | --- |
| `src/core/lasso.ts` | Adds `behaviour`: `dynamic`, `static`, or `outline`. Default is `dynamic`. Static also stores `reference`, the red, green, and blue of the first sample. Alpha is ignored |
| `src/core/ringHit.ts` | Pure hit test. Screen points in, nearest side, nearest corner, and the point on that side. No map library |
| `src/core/ringEdit.ts` | Insert a point on a side, or remove a corner when at least 3 remain |
| `src/core/measurement.ts` | Polygon edits only while the status is the closed polygon |
| `src/core/toolboxSession.ts` | Passes the choice, the click, the close, and the vertex edit through. Outline clicks do not ask for a canvas sample |
| `src/ui/LassoMenu.tsx` | The three buttons, their tooltips, and hiding Radius and Contrast for Outline |
| `src/ui/VertexMenu.tsx` | The two-row menu |
| `src/ui/ToolboxTooltips.ts` | The new Lasso tooltip and the three behaviour tooltips |
| `src/App.tsx` | Projects corners to pixels, opens the menu, and unprojects the inserted point. The menu position is React state, not session state |

`setLassoBehaviour` works only while the stroke has no points. The first point leaves the choice where it is.

Dynamic still calls `traceBrush` with no reference colour. Each sample compares with the colour under its own pixel.

Static reads the first sample once and stores that colour. Every later flood compares with that stored colour, still inside that sample's own radius and contrast. If the pixel under a later sample is outside the contrast of the stored colour, that sample adds nothing. The flood does not enter the disc through that pixel. A patch under 8 pixels still adds nothing. If the first sample cannot be read, `reference` stays empty and later samples do not invent a colour.

Outline does not read the canvas. On close, with at least 3 points, `parts` becomes a one-ring copy of that stroke. The overlay draws `parts` and does not also draw the guide, so the line stays single. The guide remains in the draft and is not drawn. Dynamic and Static still draw both the guide and `parts`.

A right-click projects the editable rings and calls the hit test with 12 CSS pixels. Polygon uses its corners, including the side that closes the last corner to the first. A closed Lasso uses `parts`. The nearest side is the segment with the smallest screen distance. The nearest corner is the vertex with the smallest screen distance, and it may sit on a different part from the side. Equal distances use the earlier part, then the earlier index. The menu stores the part, the side, and the corner. **Add vertex** unprojects the closest point on that side and inserts it there. **Delete vertex** removes that corner. Neither action runs the brush again. **Add to list** reads `parts` for every Lasso behaviour, including Outline, and still writes the movable and fixed pair.

## 5. Error handling and copy

Existing sentences stay word for word.

| Condition | Result |
| --- | --- |
| Canvas cannot be read, Dynamic or Static | `This basemap does not allow colour sampling.` The guide stays. No colour outline is added. Static does not store a reference colour. **Add to list** stays hidden |
| A Dynamic or Static sample fills fewer than 8 pixels | That sample adds nothing. The stroke continues |
| A Static sample pixel is outside the contrast of the first colour | That sample adds nothing. The stroke continues |
| Double-click, Dynamic or Static, guide has at least 3 points, and the colour outline does not | The guide closes. The readout shows `No feature found at that contrast.` **Add to list** stays hidden |
| Double-click with fewer than 3 points, any Lasso behaviour | The stroke stays open. The readout shows `Add at least three corners to close a polygon.` |
| Outline double-click with at least 3 points | The stroke closes. That stroke is the outline. No colour message |
| Another tool while a draft exists | `Delete the current drawing before choosing another tool.` |
| **Delete** on the readout | Clears the draft only. The next Lasso starts at Dynamic |
| Behaviour, Radius, or Contrast changed after the first point | The draft is unchanged |
| **Delete vertex** would leave that part with fewer than 3 corners | That part is unchanged. The readout shows `A Polygon needs at least three corners.` |
| **Add vertex** lands within 1 CSS pixel of a corner that is already there | The outline is unchanged. No message |
| Right-click farther than 12 CSS pixels, or while the stroke is still open | No menu. The browser menu is not suppressed |

Outline never shows the canvas sentence or `No feature found at that contrast.` Polygon keeps its own close sentence, `Add at least three corners to close a Polygon.` The new three-corner sentence is only for a vertex delete.

## 6. Testing

Vitest, with no map:

- `src/core/lasso.test.ts`. The existing Dynamic tests stay. Static keeps a red reference: a later sample on red is included, a later sample on blue adds nothing, and a pixel outside that sample's radius stays out. A gap between red patches is two parts, as it is for Dynamic. A failed first read leaves the reference empty. Outline close with three points stores that stroke and does not ask for a colour ring. Two points stay open with `Add at least three corners to close a polygon.` Changing the behaviour after the first point does nothing.
- `src/core/ringHit.test.ts`. A click within 12 CSS pixels returns the nearest side, the point on that side, and the nearest corner. A click at 13 pixels returns nothing. Equal distances use the earlier part, then the earlier index.
- `src/core/ringEdit.test.ts`. Insert lengthens the ring between that side's ends. Removing a corner from four leaves three. Removing one from three leaves the ring as it was.
- `src/core/measurement.ts` tests. Insert and delete run only on a closed Polygon. A delete that would leave two corners keeps three and sets `A Polygon needs at least three corners.` The area changes after a successful insert.
- `src/core/toolboxSession.test.ts`. An Outline click does not ask for a sample. A Dynamic click does. Outline **Add to list** returns `Lasso` and `Lasso (fixed)` from the stroke, with one `pairId`. A vertex edit on a closed Lasso changes the outline and leaves the guide in the draft. An edit while the stroke is open does nothing.
- `src/ui/LassoMenu.test.tsx`. Three buttons, their tooltips, and no Radius or Contrast when the behaviour is Outline. After the first point the buttons are disabled.

On the map, by hand: choose each behaviour and draw; Static stays on the first colour when the stroke crosses a second colour; Outline draws the path you drag and ignores the basemap colour; double-click, then right-click a side to add a corner and a corner to delete one; a click away from the line does nothing; **Add to list** keeps the edited shape and the fixed copy. Polygon gets the same vertex menu after it is closed. The menu and the corner dots stay out of the snapshot. The line stays in it.

## 7. Doc updates during implementation

After this spec is accepted, update the Lasso sentence in `PRODUCT.md` and `ScaleFinderPurpose.md` so it names Dynamic, Static, and Outline, and mentions vertex edit before **Add to list**. Add the behaviour row and the vertex menu to the Toolbox section of `DESIGN.md`. No new colour token.

## 8. Out of scope

- Editing a Polygon already in the list
- Vertex edit on Ruler, Circle, or Square
- Vertex edit while the stroke is still open
- A touch long-press in place of right-click
- Subtract mode
- Running the brush again after a vertex edit
- A radius in ground metres
- User accounts, saved projects, and anything kept after the page closes
