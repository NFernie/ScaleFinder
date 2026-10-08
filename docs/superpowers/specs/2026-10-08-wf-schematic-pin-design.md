# Wf schematic pin — Design Spec

- **Status:** Approved. Revised the same day: swales, the mouth-bar slab, and the lobe solid are not drawn. Beach ridges taper off the channel, follow a sigmoid centreline whose tips turn slightly seaward, keep their crests above the water line, and meet the channel top on the most seaward ridge. Mouth bars are half spheroids in a filled V, dome up, with an exaggerated seaward sigmoid. The channel is a half cylinder, flat side up, trimmed to the beach ridges. The ground slab is a translucent blue water line on the channel base.
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
| Mouth bars | Nine half-spheroid mouth-bar elements in a filled V directly in front of the channel, dome upward. The apex is one centre bar. The next row is one left and one right. Each of those adds an outer bar, a bar toward the far side of the axis, and one more bar on its own arm. The two bars nearest the axis overlap. Each bar is 50% thicker than the previous sheet and 50% longer along +Z, with the extra length on the seaward side. The base follows an exaggerated sigmoid, so the seaward rim is lowest. The landward base of the channel bar matches the base of the most seaward beach ridge. Each bar farther seaward steps down by 5% of the bar thickness and yaws outward by another 1°, toward +X on the right and −X on the left. The channel bar stays straight. The stack stays below the water line |
| Beach ridges | Two flanks, one on each side of the channel. Four beach-ridge elements per flank. Each is thick against the channel and thinner at the alongshore tip. The centreline swings landward, then the tip turns slightly seaward. The whole crest stays above the water line. The most seaward crest meets the top of the channel. Each landward ridge sits 2% of the reference crest height above the next seaward ridge, and the bases keep those elevations. Fore-aft width is half the previous thickness. The seaward face is a sigmoid, and the base sits seaward of the crest. No swales |
| Channel | One half cylinder on the axis, flat face up, curved face down, half the thickness of the earlier full cylinder. It runs seaward and its seaward tip meets the thick end of the most seaward beach ridge. The braided texture in the screenshot is not modelled |
| Lobe solid | Not drawn. Wf-Lobe stays the element-complex label over the two beach-ridge sets |
| Mouth-bar complex | Not drawn as a slab. Wf-Mouth Bar stays the element-complex label over the channel and the mouth-bar set |
| Explode | A slider from nested (0) to pulled apart (1). Rank gaps change. Parent links and the fan and flank offsets stay |
| Build | Pure hierarchy module plus a Three.js canvas. `three` is a dependency used only by this view |
| Persistence | The pin is shipped with the app. Slider position is memory only and resets when the page closes |
| Snapshot | The pin is inside the snapshot. The panel and the slider stay outside the snapshot frame |
| Out of scope | img2threejs intake, spec, and sculpt passes. Tracing the basemap. Element complex assemblage and anything above it. A second process code. A second pin. Measured thicknesses. User-supplied images. Copying the report figures or the screenshot into the canvas |

## 3. What the user sees

The pin is on the map whenever the map is open. Choosing it opens a floating panel on the map. The panel uses the Toolbox panel colour, 12px corners, and the Float shadow. The title is **Sfântu Gheorghe**. The subtitle is **Wf schematic**. The caption reads: "Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast."

The canvas shows the solids. Panel chrome stays on the existing night-navy and teal tokens. Inside the canvas only, the solids use a fixed diagram palette so the bodies can be told apart: gold beach ridges, green mouth bars, orange channel, and a blue water line at 30% opacity. Those fills are diagram colours, not a second UI accent.

An **Explode** slider sits at the bottom of the panel. At 0 the children sit in the nested pose in this section. At 1 each rank has moved away from its parent by a fixed gap, and every name can be read. Keyboard users can focus the pin, open the panel with Enter, and operate the slider.

### Nested arrangement

Land is one direction in the schematic. Seaward is the opposite direction. The channel axis is the centre line. This follows `WF_element complex set.png`.

- **Wf element complex set** is a thin blue water line under the model, at 30% opacity. Its top meets the base of the channel. It is the root.
- **Wf-Lobe element complex** is a label over the beach-ridge sets. It has no solid. It contains two beach-ridge element sets, one on each flank.
- **Beach-ridge element set** (left and right) contains four beach-ridge wedges and no swales. Each wedge is thick where it meets the channel and thin at the alongshore tip. The centreline bends so the tip lies landward of the channel end and the arc stays seaward of the straight chord. The seaward face is a sigmoid, concave toward the sea through its upper half, and the base sits seaward of the crest. Each landward wedge sits 2% of the ridge height above the next seaward wedge. The next wedge overlaps the previous and sits further seaward.
- **Wf-Mouth Bar element complex** is a label. It has no slab. It contains the channel-fill element and the mouth-bar element set.
- **Mouth-bar element set** contains nine half spheroids directly in front of the channel, below the water line, dome upward. The long axis of each bar points seaward and is 50% longer than before, extended on the seaward side. The plan is a filled V: one centre bar at the channel, then one left and one right, then from each of those an outer bar, a bar across the axis, and one more bar on that arm. The two bars nearest the axis overlap. Each bar’s base follows an exaggerated sigmoid, so its seaward rim is its lowest point. The landward base of the centre bar is at the same height as the base of the most seaward beach ridge. Each bar farther seaward sits lower by 5% of the bar thickness and yaws outward by another 1°, so the last bars have the largest angle. The channel bar stays straight.
- **Channel-fill element** is one half cylinder on the axis. The flat face is up and the curve hangs down. The seaward tip lines up with the thick end of the most seaward beach ridge.

None of these are copies of the report drawings. Figure 10’s Wf-Lobe crescents are the shape reference for the ridges. Figures 7 and 8 are the stacking reference.

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

The panel reads `sceneAt` and draws one solid for each beach ridge, each mouth bar, the channel, and the ground slab. Wf-Lobe, Wf-Mouth Bar, and each element set are labels and have no extra solid. Every body has a name in the scene. The map never reads schematic units. The marker uses the anchor only.

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
- There are nine mouth-bar elements in a filled V. The centre bar is the most landward. Left and right arms widen seaward. Two bars near the axis overlap. The centre bar’s landward base matches the most seaward beach ridge’s base. As seaward position increases, each bar is 5% of the bar thickness lower and yaws outward by another 1°. The channel bar stays straight. The bars stay below the water line. Their landward edge stays put and the long axis is 50% longer seaward. Thickness is 50% greater than the previous sheet.
- Each flank has four beach-ridge elements and no swales. Their seaward positions increase. Each ridge’s outline is thickest at the channel and thinner at the tip. The centreline swings landward, then the tip turns slightly seaward, and the tip stays landward of the channel end. The crest at every station sits above the water line. The most seaward ridge’s thick-end crest is at the channel top. The base sits seaward of the crest. The seaward face is landward of its chord in the upper half and seaward of it in the lower half. Each landward ridge is 2% of the reference crest height above the next seaward ridge. Fore-aft width is half the previous thickness.
- There is one channel-fill element on the axis. Its seaward tip meets the thick end of the most seaward beach ridge. Its radius is half the previous cylinder. The water line’s top is the channel base. Two element complexes have no solid of their own, and there is one element complex set.
- `sceneAt(0)` and `sceneAt(1)` return the same ids and parent links. At 1, elements are further from the root along the separation axis than element sets, and element sets are further than element complexes. At 0, those rank gaps are 0.
- `sceneAt(-1)` equals `sceneAt(0)`, and `sceneAt(2)` equals `sceneAt(1)`.

A component test renders the pin, opens the panel, and finds the caption, the title Sfântu Gheorghe, and the names Wf-Lobe, Wf-Mouth Bar, beach ridge, mouth bar, and channel fill. It does not find a swale.

The WebGL picture, the fan in the canvas, and the pin sitting on Sfântu Gheorghe are checked by eye in the running app.

## 7. Product copy, written during implementation

`PRODUCT.md` capabilities, one sentence: A Wf schematic pin at 44.878674, 29.515563 opens a type diagram of element, element set, element complex, and element complex set. The diagram is not a measured map of that coast.

`ScaleFinderPurpose.md` in-scope list, the same sentence.

`DESIGN.md`, a short subsection under the map: the pin and the panel, the caption, the explode slider, the diagram palette limited to the canvas, and the panel staying outside the snapshot.

## 8. Acceptance

1. With the map open, a pin is visible at 44.878674, 29.515563.
2. Opening it shows the caption in section 3 and the nested solids: an orange half-cylinder channel on the axis, flat side up, a blue water line at the channel base, nine green flat mouth-bar ovals in a filled V below that line, and gold beach ridges on both flanks, thick at the channel, tips landward, overlapping seaward. No swales, no green slab, and no blue lobe solid.
3. Moving Explode from 0 to 1 separates the four ranks and keeps every body labelled.
4. Closing the panel leaves the pin on the map.
5. Reloading the page shows the pin again with Explode at 0.
