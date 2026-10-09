# Wf schematic panel — Design Spec

- **Status:** Agreed in conversation on 2026-10-09. Awaiting a read of this file.
- **Date:** 2026-10-09
- **Branch:** `cursor/wf-schematic-panel-design-69e0`
- **Revises:** [`2026-10-08-wf-schematic-pin-design.md`](2026-10-08-wf-schematic-pin-design.md), panel title, Explode motion, and which names are drawn. The pin, the caption, the cast, the diagram colours, and the meshes stay as that spec and [`features/schematic_module.md`](../../../features/schematic_module.md) left them.
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)

## 1. Goal

Update the Wf schematic panel. The title is the diagram, the 3D view can be resized without stretching, and the user can zoom and orbit inside the view. Explode opens the four ranks one band at a time, on a sphere around each parent, with a large gap. Names accumulate as each rank opens. One name is enough for each element kind.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Title | **Wf Schematic**. The teal subtitle is removed. The place name stays on the pin and is absent from the panel |
| Caption | Unchanged: "Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast." |
| Close | Close and Escape close the panel and return focus to the pin |
| Resize | The 3D view keeps the width-to-height ratio of its first layout. A handle on the top-left of the view drags that size. The panel's bottom-right stays fixed. Title, caption, Close, and Explode stay the same type size and match the view's width |
| Size limits | The view cannot shrink below its start size. When the current 14rem box would cross the inset, that start size is the largest box of the same ratio which fits. The panel stays at least 0.75rem inside the map frame, and clear of the safe area when that inset is larger |
| Size memory | The view size lasts until the page reloads. Closing the panel releases the WebGL context |
| Zoom | Zoom-in above zoom-out, top-right of the view, same size and stacking as the map's zoom buttons. The wheel uses the same step. No compass |
| Orbit | Dragging on the view orbits the camera around the current look-at point. Explode does not move the camera. There is no pan and no glide after release |
| Map | Pointer and wheel events on the view do not pan or zoom the map |
| Explode | Three equal bands. The gap grows in step with the thumb. A finished band stays open. The element complex set does not move |
| Sphere | Each body leaves its parent on a fixed direction shared evenly with its siblings. Full distances are 8, 6, and 5 schematic units |
| Labels | Names accumulate and keep today's words. Element labels are one Beach ridge, one Mouth bar, and one Channel fill |
| Meshes | Beach ridges, mouth bars, the channel, and the water line stay as they are. `three` stays out of `src/core/` |
| Snapshot | The pin stays inside the frame. The panel, slider, zoom stack, and resize handle stay outside |
| Persistence | Explode, zoom, and camera angle reset when the panel opens. Nothing is stored after the page closes |

## 3. What the user sees

The pin is unchanged, including its accessible name "Wf schematic, Sfântu Gheorghe". Choosing it opens the same bottom-right panel: Panel at 95%, 12px corners, a white 15% border, the Float shadow, and the 160ms toolbox pop.

The title is **Wf Schematic**. There is no subtitle and no place name in the panel. The caption, Close, and Explode slider stay. Close is 44px. Focus is Focus teal, 2px, offset 2px.

### View size

The view starts at its current box: 14rem tall, and as wide as the panel's inner width. The locked ratio is that first width divided by that first height. When that box would cross the map inset, the start size is the largest box of that ratio which fits, and that fitted box is the minimum. The corner handle is a 44px control on the top-left of the view. Dragging it changes the view. The panel's bottom-right corner stays where it is, so the panel grows and shrinks up and to the left. Arrow keys on the focused handle change the width by 16 CSS pixels per step. Up and Right grow. Down and Left shrink. Height follows the locked ratio. The drag and the keys stop at the minimum and at the map inset.

### Camera

The camera starts at `(6.5, 5.5, 7.5)`, looking at `(0, 0.4, 0.6)`. That look-at point stays fixed for the life of the open panel.

Zoom-in and zoom-out are a vertical stack on the top-right of the view, zoom-in above zoom-out, matching the map's zoom buttons in size and stacking. The stack and the resize handle are HTML over the view. A press on them does not start an orbit. Their accessible names are **Zoom in** and **Zoom out**. Each button multiplies the camera's distance from the look-at point by `1 / 1.25` or by `1.25`. One wheel detent does the same. The distance clamps to **2** and **60** schematic units. Dragging orbits around the look-at point and follows the pointer directly.

Opening the panel starts Explode at 0 and the camera at the start pose. The remembered view size is kept.

### Explode

`explode` clamps to 0–1. Progress inside a band is linear with the thumb. The band edges snap, so `t = 0`, `t = 1/3`, and `t = 2/3` are exact:

| Rank | Progress |
| --- | --- |
| Element complex set | 0 |
| Element complex | 0 at `t = 0`, 1 at `t ≥ 1/3`, otherwise `t / (1/3)` |
| Element set | 0 at `t ≤ 1/3`, 1 at `t ≥ 2/3`, otherwise `(t − 1/3) / (1/3)` |
| Element | 0 at `t ≤ 2/3`, 1 at `t = 1`, otherwise `(t − 2/3) / (1/3)` |

At the end of a band the centre of a child is this far from its parent's exploded position:

| Rank | Distance |
| --- | --- |
| Element complex | 8 |
| Element set | 6 |
| Element | 5 |

A child's position is its parent's position plus a relative step. At progress 0 the step is the nested offset, `nested(child) − nested(parent)`, so the group still holds together and rides with the parent. At progress 1 the step is `direction × distance`. In between, the step is the blend `(1 − progress) × nested offset + progress × direction × distance`.

Siblings are the direct children of one parent, sorted by id. Their directions are unit vectors and do not change with the slider:

- One child uses `(0, 1, 0)`.
- Two children use `(1, 0, 0)` and `(-1, 0, 0)`, in id order.
- Three or more use a Fibonacci sphere in id order. For index `i` of `n`, `y = 1 − (2i + 1) / n`, `r = sqrt(1 − y²)`, `θ = π(3 − sqrt(5)) i`, `x = cos θ · r`, `z = sin θ · r`.

The channel's parent is Wf-Mouth Bar, so the channel and the mouth-bar set are the two children of that complex. The channel travels in the element band. The mouth bars travel in the element band away from the mouth-bar set. Mouth-bar yaw is unchanged.

### Labels

`showLabel` on each placed body:

| When | Names on |
| --- | --- |
| `t = 0` | Wf element complex set |
| `t > 0` | Those, plus Wf-Lobe and Wf-Mouth Bar |
| `t > 1/3` | Those, plus Beach-ridge set left, Beach-ridge set right, and Mouth-bar set |
| `t > 2/3` | Those, plus Beach ridge on `e-ridge-r-0`, Mouth bar on `e-mouth-0`, and Channel fill on `e-channel` |

A name that has turned on stays on. Other beach ridges and other mouth bars stay unlabelled. The name sits on that body and travels with it.

## 4. Components and data flow

| Module | Role |
| --- | --- |
| `src/core/wfSchematic.ts` | `sceneAt(explode)` returns every body, the same ids and parents, the exploded position, and `showLabel`. No React, no Three.js, no DOM |
| `src/core/wfSchematic.test.ts` | Bands, distances, sibling directions, label thresholds, clamp |
| `src/App.tsx` | Remembers whether the panel is open and the view size. Unmounts the panel on close |
| `src/ui/WfSchematicPanel.tsx` | Title, caption, Close, Explode, resize handle, zoom buttons, text fallback. Holds Explode, which resets to 0 when the panel opens. Calls zoom on the view |
| `src/ui/WfSchematicView.tsx` | Current meshes, label sprites while `showLabel` is set, orbit, wheel zoom, and button zoom. Remounts with the panel, which restores the start camera |
| `src/map/WfSchematicPin.tsx` | Unchanged |

`PlacedBody` gains `showLabel: boolean`. `sceneAt` clamps first, then places parents before children. The view reads `sceneAt` for positions and labels. It does not invent the spread.

Orbit uses `OrbitControls` from `three/addons/controls/OrbitControls.js`, with pan and damping off. `controls.dispose()` runs in the same cleanup as the renderer, which still calls `dispose()`, `forceContextLoss()`, and removes the canvas.

The zoom buttons call into the view. Wheel and pointer events on the view call `preventDefault` and `stopPropagation`.

## 5. Error handling

| Condition | Result |
| --- | --- |
| WebGL cannot start | The view area lists every body as text, in rank order (element complex set, then element complex, then element set, then element). Within a rank the rows are sorted by id. Each row includes the parent name when the body has one. The caption and Explode stay. The slider does not change the list. Zoom and orbit are absent. The corner handle still resizes that area |
| `explode` outside 0–1 | Clamped. Every body is still returned |
| Zoom distance outside 2–60 | Clamped |
| Resize below the start size, or past the map inset | The size stops at that limit |
| A parent with one child | That child uses `(0, 1, 0)` |

The corner handle and both zoom buttons take the Focus teal ring. The pin, Enter, Close, Escape, and the slider behave as they do now.

## 6. Testing

Unit tests in `src/core/wfSchematic.test.ts`. Distances use a tolerance of `1e-6`.

- At 0, positions match the nested pose, and the only `showLabel` is the element complex set.
- At ⅓, each element complex is 8 from the element complex set. In id order those directions are `+X` then `−X`. Each element set still sits at its nested offset from its complex.
- At ⅔, each element set is 6 from its complex. Each element still sits at its nested offset from its parent.
- At 1, each element is 5 from its parent. The channel is 5 from Wf-Mouth Bar. Every mouth bar is 5 from the mouth-bar set.
- Sibling directions differ and have length 1.
- Ids and parents match at 0 and at 1. `sceneAt(-1)` matches `sceneAt(0)`. `sceneAt(2)` matches `sceneAt(1)`.
- `showLabel` is off for element complexes at 0, on after 0, and still on at 1. Element sets are off at ⅓ and on after ⅓. Element labels are off at ⅔. After ⅔ the only element ids with `showLabel` are `e-ridge-r-0`, `e-mouth-0`, and `e-channel`.

The component test opens the pin and finds a dialog named **Wf Schematic**, the caption, and the body names in the text list, including Wf-Lobe, Wf-Mouth Bar, Beach ridge, Mouth bar, and Channel fill. The place name is absent from the dialog. The list has no Swale. The element complex set is the first text entry. Close returns focus to the pin.

The sphere, the names on the solids, the corner resize, the zoom stack, and the orbit are checked by eye in the running app. The mesh shapes are not part of that check.

## 7. Product copy, written during implementation

`PRODUCT.md` and `ScaleFinderPurpose.md` stay as they are. The capability sentence already says the pin opens a type diagram and that the diagram is not a measured map of that coast.

`DESIGN.md`, replace the `### Wf schematic pin` subsection with:

A teal pin sits on the map at 44.878674, 29.515563. The hit target is 44px and uses the pressable scale. It is inside the snapshot. Choosing it opens a panel at the bottom-right of the map, outside the snapshot frame, clear of the home indicator. The panel uses Panel at 95%, 12px corners, a white 15% border, the Float shadow, and the 160ms toolbox pop. Close is 44px. Focus is Focus teal, 2px, offset 2px. The title is Wf Schematic. The caption says the diagram is a type schematic and not a measured map of this coast. The place name stays on the pin and is absent from the panel.

The 3D view keeps the width-to-height ratio of its first layout. A 44px handle on the top-left of the view resizes it. The panel's bottom-right stays fixed. The title, caption, Close, and Explode slider stay the same type size and match the view width. The view cannot shrink below its starting size. When that starting box would cross the map inset, the start size is the largest box of that ratio which fits. The panel stays at least 0.75rem inside the map edges, including the safe area. The size lasts for the session.

Zoom-in and zoom-out sit in a stack at the top-right of the view, in the same size and stacking as the map's zoom buttons. The scroll wheel zooms the same way. Dragging on the view orbits the camera. Zoom and orbit follow the pointer with no glide. The map does not pan or zoom while the pointer is on the view. Those controls stay outside the snapshot.

Explode runs from nested to pulled apart. The solids track the thumb with no extra ease. From 0 to ⅓ the element complexes leave the element complex set. From ⅓ to ⅔ the element sets leave their complexes. From ⅔ to 1 the elements leave their parents. Each group opens on a sphere around its parent. Full distances are 8, 6, and 5 schematic units. Names accumulate: the element complex set at 0, the complexes after the slider leaves 0, the element sets after ⅓, and one Beach ridge, one Mouth bar, and one Channel fill after ⅔.

Solid colours inside the canvas stay gold for beach ridges, green for mouth bars, and orange for the channel. The ground slab is a blue water line at 30% opacity. Swales, the green mouth-bar slab, and the blue lobe solid are not drawn.

## 8. Acceptance

1. The open panel's title is Wf Schematic. The place name is on the pin and absent from the panel. The caption is unchanged.
2. Dragging the top-left handle, and using its arrow keys, resizes the view with a constant ratio. The panel's bottom-right stays fixed. The view does not shrink below its start or cross the map inset. Reloading restores the start size. Closing and reopening keeps the size and starts Explode at 0 with the start camera.
3. Zoom-in, zoom-out, and the wheel change the camera distance between 2 and 60. Dragging orbits the model. The map does not pan or zoom from those events. There is no compass and no glide.
4. At 0 the solids are nested and the only name is Wf element complex set. At ⅓ each complex is 8 from the set, on opposite sides, and both complex names are on. At ⅔ each element set is 6 from its complex, and the set names are on. At 1 each element is 5 from its parent, and the only element names are one Beach ridge, one Mouth bar, and one Channel fill.
5. With WebGL unavailable, the text list shows every body in rank order with its parent. Zoom and orbit are absent. The handle still resizes the area. The slider does not change the list.
6. The pin is in the snapshot. The panel, slider, zoom stack, and handle are not.
7. The beach-ridge, mouth-bar, channel, and water-line meshes are unchanged.
