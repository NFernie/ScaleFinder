# Wf schematic pin — Design Spec

- **Status:** Approved
- **Date:** 2026-10-08
- **Branch:** `cursor/wf-schematic-design-2a5d`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Hierarchy source:** [`2012 Vakarelov And Ainsworth WAVE Architectural Classification Report.pdf`](../../../2012%20Vakarelov%20And%20Ainsworth%20WAVE%20Architectural%20Classification%20Report.pdf) (Figures 7, 8, and 10)
- **Process source:** [`Ainsworth et al 2011Dynamic spatial and temporal prediction of changes in depositional processes on clastic shorelines.pdf`](../../../Ainsworth%20et%20al%202011Dynamic%20spatial%20and%20temporal%20prediction%20of%20changes%20in%20depositional%20processes%20on%20clastic%20shorelines.pdf) (Wf = wave-dominated, fluvial-influenced)
- **Plan-view source:** [`WF_element complex set.png`](../../../WF_element%20complex%20set.png)

## 1. Goal

Put one pin on the map at **44.878674, 29.515563** (decimal degrees, latitude then longitude), above Sfântu Gheorghe. Opening the pin shows a 3D schematic of a wave-dominated, fluvial-influenced shoreline and lets the user pull the four ranks apart: element, element set, element complex, and element complex set.

The schematic is a type example for that process class. Its size and compass direction are not a survey of the coast under the pin. The solids are simple shapes authored in code from the named categories in the 2012 report and from the arrangement in `WF_element complex set.png`. The user supplies no images. The img2threejs reconstruction pipeline is not used.

This is a new capability beyond the confirmed v1 list in `PRODUCT.md`. The user asked for it explicitly on 2026-10-08. `PRODUCT.md`, `ScaleFinderPurpose.md`, and `DESIGN.md` gain the sentences in section 7 during implementation, after this spec is accepted.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Place | One pin at 44.878674, 29.515563. Label: Sfântu Gheorghe. Process code: Wf |
| Role of the pin | A place marker. The schematic does not scale to the coastline and does not rotate to the shoreline |
| Ranks | Hierarchy Levels I and II only: element (E), element set (ES), element complex (EC), element complex set (ECS) |
| Cast | The bodies in section 3. No barrier, lagoon, tidal flat, crevasse, or onshore bodies |
| Mouth bars | Five mouth-bar elements. Each younger bar steps seaward and sideways, alternating outward from the channel axis, so the set is a fan |
| Beach ridges | Two flanks, one on each side of the channel. Four beach-ridge elements per flank. Each steps further alongshore, away from the channel. A swale element sits in each trough between ridges (three swales per flank) |
| Channel | One straight channel-fill element along the axis, tapering seaward. The braided texture in the screenshot is not modelled |
| Lobe solid | One lobate solid for the Wf-Lobe element complex, seaward of the mouth-bar fan, matching the blue body in the screenshot |
| Mouth-bar complex | One shallow shore-perpendicular slab under the fan and the channel, so that element complex stays visible when exploded |
| Explode | A slider from nested (0) to pulled apart (1). Rank gaps change. Parent links and the fan and flank offsets stay |
| Build | Pure hierarchy module plus a Three.js canvas. `three` is a dependency used only by this view |
| Persistence | The pin is shipped with the app. Slider position is memory only and resets when the page closes |
| Snapshot | The pin is inside the snapshot. The panel and the slider stay outside the snapshot frame |
| Out of scope | img2threejs intake, spec, and sculpt passes. Tracing the basemap. Element complex assemblage and anything above it. A second process code. A second pin. Measured thicknesses. User-supplied images. Copying the report figures or the screenshot into the canvas |

## 3. What the user sees

The pin is on the map whenever the map is open. Choosing it opens a floating panel on the map. The panel uses the Toolbox panel colour, 12px corners, and the Float shadow. The title is **Sfântu Gheorghe**. The subtitle is **Wf schematic**. The caption reads: "Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast."

The canvas shows the solids. Panel chrome stays on the existing night-navy and teal tokens. Inside the canvas only, the solids use a fixed diagram palette so the bodies can be told apart: gold beach ridges, grey swales, green mouth bars, orange channel, blue lobe. Those fills are diagram colours, not a second UI accent.

An **Explode** slider sits at the bottom of the panel. At 0 the children sit in the nested pose in this section. At 1 each rank has moved away from its parent by a fixed gap, and every name can be read. Keyboard users can focus the pin, open the panel with Enter, and operate the slider.

### Nested arrangement

Land is one direction in the schematic. Seaward is the opposite direction. The channel axis is the centre line. This follows `WF_element complex set.png`.

- **Wf element complex set** is a thin ground slab under the whole model. It is the root.
- **Wf-Lobe element complex** is the blue lobate solid on the seaward side. It contains two beach-ridge element sets, one on each flank.
- **Beach-ridge element set** (left and right) contains four beach-ridge wedges and three swale lenses. The wedges step alongshore away from the channel. Each swale lies in the trough between two wedges.
- **Wf-Mouth Bar element complex** is a shallow shore-perpendicular slab at the channel mouth, landward of the blue lobe. It contains the channel-fill element and the mouth-bar element set. The slab is visible so this complex can be told apart from the lobe when the ranks are pulled apart.
- **Mouth-bar element set** contains five mounds. From the landward apex they step seaward, and they alternate left and right with a larger sideways offset each time, so the plan is a fan.
- **Channel-fill element** is one straight body on the axis, wider on the landward end and narrower seaward, running into the fan.

A beach-ridge element is a wedge, thicker toward the landward side of that flank and thinner toward the sea. A swale is a thin lens. A mouth-bar element is one smooth mound. The lobe is one lobate slab. None of these are copies of the report drawings.

## 4. Components and data flow

| Module | Role |
| --- | --- |
| `src/core/wfSchematic.ts` | The body list, nested positions, and explode offsets. No React, no Three.js, no DOM |
| `src/core/wfSchematic.test.ts` | Hierarchy, fan, flanks, and explode |
| `src/map/WfSchematicPin.tsx` | Map marker at the coordinate. Opens the panel |
| `src/ui/WfSchematicPanel.tsx` | Panel, caption, slider, Three.js canvas, and the text fallback |
| `src/App.tsx` | Holds whether the panel is open. Passes the pin into the map |

`wfSchematic.ts` exports a constant anchor `{ lat: 44.878674, lng: 29.515563 }` and a function `sceneAt(explode)` where `explode` is a number from 0 to 1. Values outside that range clamp. Each body has `id`, `name`, `rank`, `parentId` (`null` only on the element complex set), `kind`, and a position in schematic units. Schematic units are not metres and are not placed on the map.

`sceneAt(0)` returns the nested pose in section 3. `sceneAt(1)` adds a gap along one separation axis that depends only on rank: elements move furthest from the set, then element sets, then element complexes. The element complex set stays put. Fan offsets and flank offsets are part of the nested pose, so they are still visible at 0 and at 1.

The panel reads `sceneAt` and draws one solid for each beach ridge, swale, mouth bar, the channel, the mouth-bar slab, the lobe, and the ground slab. Each element set is a label at the group origin and has no extra solid. Every body has a name in the scene. The map never reads schematic units. The marker uses the anchor only.

## 5. Error handling and copy

| Condition | Result |
| --- | --- |
| WebGL cannot start | The canvas area lists every body as text, grouped under its parent, in rank order. The caption and the slider stay. The slider has no effect on the text list |
| `explode` outside 0–1 | Clamped. The scene still returns every body |

The panel has a control named **Close** that returns focus to the pin. Escape closes the panel.

## 6. Testing

Unit tests in `src/core/wfSchematic.test.ts`:

- The root is the only body with no parent. Every other `parentId` matches a body.
- Ranks are only `element`, `element-set`, `element-complex`, and `element-complex-set`.
- There are five mouth-bar elements. Sorted from the landward apex, both the seaward coordinate and the absolute sideways coordinate increase, and the sideways signs alternate. The five points are not colinear.
- Each flank has four beach-ridge elements and three swale elements. Alongshore distance from the channel axis increases through the four ridges.
- There is one channel-fill element, one mouth-bar slab, one lobe solid, two element complexes, and one element complex set.
- `sceneAt(0)` and `sceneAt(1)` return the same ids and parent links. At 1, elements are further from the root along the separation axis than element sets, and element sets are further than element complexes. At 0, those rank gaps are 0.
- `sceneAt(-1)` equals `sceneAt(0)`, and `sceneAt(2)` equals `sceneAt(1)`.

A component test renders the pin, opens the panel, and finds the caption, the title Sfântu Gheorghe, and the names Wf-Lobe, Wf-Mouth Bar, beach ridge, swale, mouth bar, and channel fill.

The WebGL picture, the fan in the canvas, and the pin sitting on Sfântu Gheorghe are checked by eye in the running app.

## 7. Product copy, written during implementation

`PRODUCT.md` capabilities, one sentence: A Wf schematic pin at 44.878674, 29.515563 opens a type diagram of element, element set, element complex, and element complex set. The diagram is not a measured map of that coast.

`ScaleFinderPurpose.md` in-scope list, the same sentence.

`DESIGN.md`, a short subsection under the map: the pin and the panel, the caption, the explode slider, the diagram palette limited to the canvas, and the panel staying outside the snapshot.

## 8. Acceptance

1. With the map open, a pin is visible at 44.878674, 29.515563.
2. Opening it shows the caption in section 3 and the nested solids: channel on the axis, five mouth bars in a fan, beach ridges and swales stepping away on both flanks, and the blue lobe seaward of the fan.
3. Moving Explode from 0 to 1 separates the four ranks and keeps every body labelled.
4. Closing the panel leaves the pin on the map.
5. Reloading the page shows the pin again with Explode at 0.
