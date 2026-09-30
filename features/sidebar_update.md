# Sidebar UI Update

> **For the next session:** This file is the workflow. It is not the approved spec and it is not the implementation plan.
>
> Do not change product code from this file. Prompt 1 (`/brainstorming`) writes the spec and stops for approval. After that approval, start a `/writing-plans` session. Do not commit product code before that plan exists.

**Goal:** Update the Polygons section of the sidebar: Extent and the outline thumbnail start closed, multi-part outlines draw like the map, the file name sits on its own line, the list can collapse, selected Polygons can be sent back to a fixed outline’s imported centre, and each control has a short hover tooltip.

**Architecture (proposed, lock in the spec):** List layout and disclosures stay in `src/ui/PolygonList.tsx`. The thumbnail stays in `src/ui/PolygonPreview.tsx` and must draw one path per part. The “move selected outlines onto this centre” rule stays pure in `src/core/polygonList.ts` (`stackSelectedOn` already does the move). `src/App.tsx` only wires the button, the fixed-outline picker, and the existing map `flyTo`. No new runtime dependencies.

**Tech stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, MapLibre GL via `react-map-gl/maplibre`.

## Design and product references

Read before any prompt (see [`.cursor/rules/product-design-context.mdc`](../.cursor/rules/product-design-context.mdc)):

| Document | Use for |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | Build rules, changelog, tests |
| [`PRODUCT.md`](../PRODUCT.md) | Several Polygons per session; fixed twin stays at the imported place; nothing kept after reload |
| [`ScaleFinderPurpose.md`](../ScaleFinderPurpose.md) | v1 comparison job |
| [`DESIGN.md`](../DESIGN.md) | Panel, Inset, 8px controls, 12px groups, 44px targets, Float shadow only over the map or over a row, no shadow on a sidebar row, 120ms `.pressable` |
| [`WORKFLOW.md`](../WORKFLOW.md) | Skill order and one job per message |
| [`docs/superpowers/specs/2026-09-23-multi-polygon-list-design.md`](../docs/superpowers/specs/2026-09-23-multi-polygon-list-design.md) | List, one open figure note, Re-centre |
| [`docs/superpowers/specs/2026-09-24-gis-utm-columns-and-sidebar-resize-design.md`](../docs/superpowers/specs/2026-09-24-gis-utm-columns-and-sidebar-resize-design.md) | `Poly,Vert,X,Y,Z` parts; fixed twin |
| [`docs/superpowers/specs/2026-09-23-scalefindr-copy-and-figure-notes-design.md`](../docs/superpowers/specs/2026-09-23-scalefindr-copy-and-figure-notes-design.md) | Figure note copy and flip behaviour. Do not rewrite the three metrics |

Skills, in this order:

1. **UI UX Pro Max** — [`ui-styling`](../.cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md). Optional BM25: `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "disclosure panel tooltip" --domain ux -n 5`. Reject any hit that adds a second accent, a light theme, or a shadow on a sidebar row.
2. **Impeccable** — [`.cursor/skills/impeccable/SKILL.md`](../.cursor/skills/impeccable/SKILL.md): `shape` → `critique` → (after the plan) implement → `polish` → `audit` → `harden`.
3. **Emil Kowalski** — [emil-design-eng](../.cursor/skills/emilkowalski/emil-design-eng/SKILL.md), [find-animation-opportunities](../.cursor/skills/emilkowalski/find-animation-opportunities/SKILL.md), [animate](../.cursor/skills/emilkowalski/animate/SKILL.md), [improve-animations](../.cursor/skills/emilkowalski/improve-animations/SKILL.md), [review-animations](../.cursor/skills/emilkowalski/review-animations/SKILL.md), [mobile-native](../.cursor/skills/emilkowalski/mobile-native/SKILL.md).

Subagents: [`.cursor/rules/subagent-models.mdc`](../.cursor/rules/subagent-models.mdc) — only `cursor-grok-*`, `grok-*`, or `composer-*`. Pass `model` explicitly.

## What the sidebar does today

Section **2 · Polygons** in `src/ui/PolygonList.tsx` is not collapsible. When two or more Polygons are switched on, the heading row shows **Export selected** and **Re-centre**.

Each row, top to bottom:

1. One wrapping line: on/off switch, name (rename), colour, Export, Delete.
2. Bearing control, movable rows only (the rotation field).
3. **Hide figures** / **Show figures**. Figures start **open** (`figuresOpen[id] ?? true`).
4. `PolygonPreview`, always visible.

`PolygonPreview` flattens every part into one SVG `<polygon>`. That joins separate polylines and always closes the stroke. The map does not do that. `PolygonOverlay` draws each ring on its own. The line layer follows the vertices and does not add a closing segment. The fill, for a ring of three or more vertices, uses `toGeoJsonRing`, which repeats the first point for the fill only. Import (`parseUtmTable`) already keeps each `Poly` value as its own part and does not append a closing vertex. The unwanted close is the thumbnail, not the parser.

**Re-centre** (`reCentreSelected`) copies the uppermost switched-on centre onto the other switched-on Polygons and leaves fixed rows where they are. **Find a region** uses `stackSelectedOn` and `map.flyTo`. There is no control that sends outlines back to a fixed twin’s imported UTM centre.

## Global constraints

- Operate surface. One teal accent. Night navy panels. No second accent, no light theme, no shadcn.
- Sidebar rows sit on Panel. Do not put a shadow on those rows. A tooltip or a picker that floats over a row may use the Float shadow (`0 2px 8px rgb(0 0 0 / 0.35)`), same as figure notes.
- Controls stay at least 44px. Corners stay 8px on controls and 12px on a group or a popup.
- Section order stays Import, Polygons, Find a region. Do not restyle the Toolbox or the map canvas.
- Do not rename Planform area, Max span, or Equivalent square side. Only the disclosure that currently says “figures” becomes **Extent**.
- Fixed Polygons do not move, rotate, or get a bearing field. Drag, Re-centre, region search, and Centre on fixed leave them in place.
- Do not animate map geometry. Camera motion stays the existing `flyTo`. Sidebar motion is chrome only: disclosure, tooltip, picker.
- `prefers-reduced-motion: reduce` snaps sidebar motion. No bounce.
- Every product-code commit later: [`CHANGELOG.md`](../CHANGELOG.md) under `## [Unreleased]`. This workflow file does not authorise that commit by itself.

## Product updates

1. **Extent starts closed.** The disclosure label is the word **Extent**, not “Hide figures” / “Show figures”. `aria-expanded` tells open from closed. Default is closed for every row, including after import. The three metrics and their notes are unchanged once opened.
2. **Outline thumbnail starts closed.** A second disclosure, label **Outline**, sits under Extent and starts closed. Opening it shows the thumbnail. The thumbnail draws **one path per part**. Fill matches the map: an open part with three or more vertices is filled. That same open part shows a visible break in the stroke: no closing edge, and the stroke stops 8px short of the first and last vertices in the preview. A closed part (first vertex equals last) is filled and stroked with no gap. A part of two vertices is a line with no fill and no inset. Stored vertices are not rewritten on import.
3. **File name on its own line.** Top to bottom inside a row: rotation field (when the row has one), then the file name on its own line, then one line of switch, colour, Export, and Delete. A fixed row has no rotation field, so the name is first. The name stays the rename control. Export notes stay under that controls line.
4. **Polygons list collapses.** The heading **2 · Polygons** toggles the rows and the “Drag the round marker…” hint. Default is **open** (see the human-intervention note). Export selected, Re-centre, and Centre on fixed stay in the heading row so they remain available while the rows are hidden.
5. **Centre on fixed.** Moves every switched-on, non-fixed Polygon onto the anchor of a chosen fixed Polygon (`stackSelectedOn` or a thin wrapper that checks the id is `fixed`), then `flyTo` that anchor. Rotation is unchanged. One fixed Polygon: the button does this immediately. More than one: a popup lists those fixed names; choosing one runs the action and closes the popup. Escape and a pointer down outside close the popup without moving anything. The button is shown only when at least one fixed Polygon exists and at least one switched-on Polygon is not fixed. Otherwise it is absent, not disabled.
6. **Tooltips.** Hover and keyboard focus show a short title and one sentence (`role="tooltip"`, `aria-describedby`). The control’s accessible name stays the short title so existing tests and screen readers keep a stable name. Touch does not need a hover tip to use the control. Tips use `pointer-events: none` so they do not block the next control. Pattern to copy: `src/ui/Toolbox.tsx` tooltip, not a new visual system.

### Draft tooltip copy (Prompt 1 locks this)

| Control | Accessible name | Body |
| --- | --- | --- |
| Section heading | Polygons | Show or hide the list of outlines. |
| Switch | Show on map | Turn this Polygon on or off. Switching off keeps the row. |
| Name | Rename {name} | Rename this Polygon. |
| Colour | Colour for {name} | Colour of this outline on the map. |
| Export | Export {name} | Download this Polygon as UTM easting and northing where it sits. |
| Delete | Delete {name} | Remove this Polygon from the session. A lasso pair removes both rows. |
| Bearing | Rotation for {name} | Compass bearing of the locked edge. Type a new bearing to turn the outline. |
| Extent | Extent | Planform area, longest span, and equivalent square side. |
| Outline | Outline | Small drawing of each imported part. Open parts stay open. |
| Export selected | Export selected | Download switched-on Polygons in the same UTM zone as one file. |
| Re-centre | Re-centre | Move the other switched-on Polygons onto the uppermost centre. Fixed outlines stay put. |
| Centre on fixed | Centre on fixed | Move switched-on Polygons back to a fixed outline’s imported centre, and centre the map there. |
| Fixed picker row | {fixed name} | Use this fixed outline as the centre. |

## Decisions a person should still make

These are the working assumptions above. Prompt 1 asks them one at a time. Do not reopen tokens, section order, or the three metric names.

| Topic | Assumption in this file | Why a person might change it |
| --- | --- | --- |
| Thumbnail fill | Match the map: fill parts with 3+ vertices; do not close the stroke | “Don’t close” could mean no fill either |
| Centre on fixed | Move anchors and `flyTo`. Do not reset bearing | “Centres” might mean camera only |
| List default | Section starts open | Could start closed to match Extent and Outline |
| Disclosure words | Visible labels **Extent** and **Outline** | Could stay verb phrases (“Show extent”) |

## How useful a person is in the brainstorm

The six updates are already a brief. Sitting through a general brainstorm would mostly repeat `DESIGN.md`.

A person is worth having for Prompt 1, and only for the table above. The thumbnail is the sharp one: the map line stays open, the map fill closes, and the sidebar currently does a third thing (one closed shape across every part). Those are different pictures, and the wrong one will be obvious on a real multi-`Poly` file and invisible in a styling discussion. Centre on fixed is the other product call, because “returns” and “centres” can mean the outlines, the camera, or both, and bearing reset was not asked for. Whether the whole list starts open is one yes or no.

A person is not useful for palette, type, corner radius, shadow, or choosing a component library. They are not useful in the Emil chain unless a proposed duration leaves the 120ms press / 160ms popup timings already in `DESIGN.md`. After the three answers, Prompts 2–4 and the later plan can run without them until the manual check on a multi-part file.

## File structure (for the later plan)

| Path | Responsibility |
| --- | --- |
| Modify: `src/ui/PolygonList.tsx` | Row order, Extent and Outline disclosures default closed, section disclosure default open, Centre on fixed, tooltips |
| Modify: `src/ui/PolygonPreview.tsx` | Draw `parts: Vertex[][]`; map fill; 8px stroke break on an open part |
| Create: `src/ui/sidebarTooltips.ts` | Title and body strings from the locked table |
| Modify: `src/core/polygonList.ts` | `centreSelectedOnFixed(items, fixedId)` — no React |
| Modify: `src/App.tsx` | Pass fixed ids, run the move, `flyTo` the fixed anchor |
| Test: `src/ui/PolygonList.test.tsx` | Default closed, row order, picker, tooltip names |
| Test: `src/ui/PolygonPreview` test if added | Two parts do not share one closing edge |
| Test: `src/core/polygonList.test.ts` | Centre on fixed leaves fixed rows and rotation alone |
| Modify: `src/App.test.tsx` | “Hide figures” becomes Extent, closed until opened; preview not in the document until Outline is opened |
| Modify: `DESIGN.md` | One short Polygons-list sentence after the UI ships |
| Create after Prompt 1 approval: `docs/superpowers/specs/2026-09-29-sidebar-update-design.md` | Approved behaviour only |

Do not edit those source files in Prompts 1–4.

## UI update workflow

Run **one skill per message**. Product code waits until the spec is approved and `/writing-plans` has written the plan.

| Step | Skill | Outcome |
| --- | --- | --- |
| 0 | Read product | Context only |
| 1 | `/brainstorming` | Spec approved. No product code |
| 2 | UI UX Pro Max `ui-styling` | Tailwind for disclosures, name line, picker, tooltips. No edits |
| 3 | `/impeccable shape` | States for the six updates. No edits |
| 4 | `/impeccable critique` | Hierarchy report. No edits |
| 5 | `/writing-plans` | Plan from the approved spec. Still no product code in that session unless the plan skill itself only writes the plan file |
| 6 | Implement the plan | Code, tests, changelog |
| 7 | Emil chain | Disclosure, tooltip, picker only |
| 8 | `/impeccable polish`, `audit`, `harden` | Finish |
| 9 | Manual check | Multi-part file, Centre on fixed, phone width |

## Prompt workflow

### Prompt 0 — read context (no skill)

```text
Read AGENTS.md, PRODUCT.md, ScaleFinderPurpose.md, DESIGN.md, WORKFLOW.md, features/sidebar_update.md, and src/ui/PolygonList.tsx.
This is an Operate surface. The Polygons list already ships. This work is the six sidebar updates in features/sidebar_update.md.
Do not edit files.
Skill: none.
Done when: you can state the current default of the figures disclosure, how PolygonPreview draws parts, and what Re-centre does to a fixed Polygon.
```

### Prompt 1 — `/brainstorming` (gate)

```text
/brainstorming
Read features/sidebar_update.md, DESIGN.md, src/ui/PolygonList.tsx, src/ui/PolygonPreview.tsx, src/map/PolygonOverlay.tsx, and src/core/polygonList.ts.
Design the six sidebar updates in features/sidebar_update.md.
Ask one question at a time. Ask only the open decisions in “Decisions a person should still make”. Do not reopen colours, section order, or the three metric names.
Working assumptions, unless I change them:
- Extent and Outline start closed. Visible labels are Extent and Outline.
- The thumbnail draws one path per part, does not close the stroke, and fills a part of three or more vertices the way the map fill does. Import does not rewrite vertices.
- Row order: rotation field, then file name, then switch / colour / Export / Delete.
- The Polygons section starts open. Heading actions stay visible when the rows are hidden.
- Centre on fixed moves switched-on non-fixed anchors onto the chosen fixed anchor and flies the map there. It does not change bearing. One fixed Polygon acts immediately. Several open a name list. The button is disabled when it cannot run.
- Tooltips use the draft table, hover and keyboard focus, role="tooltip".
Do not write implementation code until I approve.
Write the approved spec to docs/superpowers/specs/2026-09-29-sidebar-update-design.md.
Skill: /brainstorming
Files: features/sidebar_update.md, DESIGN.md
You may edit: the spec file only, after I approve.
Done when: the spec exists and I have approved it.
```

### Prompt 2 — UI UX Pro Max (layout and tooltips)

```text
/ui-styling Plan the Polygons row from the approved sidebar spec.
Extent and Outline are full-width disclosures, 44px, Inset or surface-overlay fill, 8px corners, chevron on the right. Both start closed.
The file name is its own line under the rotation field and above the switch, colour, Export, and Delete. Those four stay one line and wrap only if the sidebar is dragged narrow.
Centre on fixed matches Export selected and Re-centre (secondary button, 44px). The fixed-name picker is Panel at 95%, 12px corners, Float shadow, 44px rows. It is not a sidebar row, so the shadow is allowed.
Tooltips match the Toolbox tip: Panel at 95%, 8px corners, Float shadow, title plus one sentence, pointer-events none. Focus ring is Focus teal, 2px, offset 2px.
Optional: python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "disclosure panel tooltip" --domain ux -n 3. Reject anything that conflicts with DESIGN.md.
Skill: ui-styling
Files: src/ui/PolygonList.tsx, DESIGN.md
You may edit: no. Report the Tailwind class list.
Done when: the class list fits Global constraints in features/sidebar_update.md.
```

### Prompt 3 — `/impeccable shape`

```text
/impeccable shape the sidebar update from the approved spec and features/sidebar_update.md.
Include: Extent closed, Outline closed, multi-part thumbnail, file name line, collapsible Polygons section, Centre on fixed with one fixed Polygon and with several, disabled state, tooltips on hover and focus.
Empty: no Polygons yet. Error: export note under the controls line, unchanged. Phone: 390px, picker stays inside the sidebar, map zoom stays clear.
Do not write component code.
Skill: /impeccable shape
Files: features/sidebar_update.md, src/ui/PolygonList.tsx
You may edit: no.
Done when: I agree the shape covers all six updates.
```

### Prompt 4 — `/impeccable critique`

```text
/impeccable critique the sidebar shape from the previous message.
Can someone see area without a wall of figures? Can they tell an open polyline from a closed ring in the thumbnail? Is Centre on fixed distinct from Re-centre?
Do not edit files.
Skill: /impeccable critique
Files: none.
Done when: report delivered.
```

### Prompt 5 — `/writing-plans` (still no product code)

```text
/writing-plans
Read the approved spec docs/superpowers/specs/2026-09-29-sidebar-update-design.md and features/sidebar_update.md.
Write the implementation plan to docs/superpowers/plans/2026-09-29-sidebar-update.md.
Use the file structure in features/sidebar_update.md. Geometry and “which anchor” rules stay in src/core/polygonList.ts. UI stays in src/ui/.
Do not edit src/ until I say to implement.
Skill: /writing-plans
Done when: the plan file exists and each task has a test command.
```

### Prompt 6 — implement (only after the plan)

```text
Implement docs/superpowers/plans/2026-09-29-sidebar-update.md starting at Task 1. Follow TDD. Do not restyle the Toolbox or the map canvas.
Update the App test that looks for "Hide figures": Extent starts closed, and the preview image is absent until Outline is opened.
Skill: none (post-plan build).
Files: per task Files list.
You may edit: yes, those files plus CHANGELOG.md.
Done when: the task test command passes.
```

### Prompt 7 — Emil Kowalski (one skill per message)

```text
/emil-design-eng Review the Polygons section disclosure, Extent, Outline, the fixed-name picker, and sidebar tooltips. Compare to DESIGN.md 120ms .pressable and the 160ms Toolbox popup. The chevron already rotates in 150ms.
Table: current vs proposed durations. Reject motion on map lines, polygon drag, and flyTo.
Skill: emil-design-eng
Files: src/ui/PolygonList.tsx, src/index.css
You may edit: no.
Done when: table is complete.
```

```text
/find-animation-opportunities Polygons disclosures, tooltips, and the Centre on fixed picker only. Operate surface — subtle, no bounce.
Skill: find-animation-opportunities
Files: src/ui/PolygonList.tsx
You may edit: no.
Done when: ranked list with approve or reject per item.
```

```text
/animate Implement approved disclosure and picker motion (opacity and transform only). Tooltips may fade and rise a few pixels, same idea as .toolbox-bento-tip. prefers-reduced-motion snaps all of it.
Skill: animate
Files: src/index.css, src/ui/PolygonList.tsx
You may edit: yes, those files only.
Done when: motion matches the emil-design-eng table.
```

```text
/improve-animations Apply only approved tweaks from find-animation-opportunities to the sidebar disclosures and picker.
Skill: improve-animations
Files: src/index.css
You may edit: yes.
Done when: review-animations would approve.
```

```text
/review-animations Review the new sidebar disclosure, tooltip, and picker rules, plus .pressable.
Skill: review-animations
Files: src/index.css
You may edit: no.
Done when: each rule is approved or given an exact replacement.
```

```text
/mobile-native Polygons list at 390px: 44px controls, 16px text on the name and bearing fields, picker inside the sidebar, no grey tap flash. Tooltips must not be the only way to learn a control’s name.
Skill: mobile-native
Files: src/ui/PolygonList.tsx
You may edit: yes, only for failed checks.
Done when: checks pass.
```

### Prompt 8 — finish

```text
/impeccable polish the Polygons list disclosures, name line, and tooltips only. Do not change figure equations or map colours.
Skill: /impeccable polish
Files: src/ui/PolygonList.tsx, src/ui/PolygonPreview.tsx
You may edit: yes, spacing and alignment only.
```

```text
/impeccable audit the Polygons list: Focus teal #5eead4 2px offset 2px; Extent, Outline, and Centre on fixed have accessible names; keyboard order is heading, heading actions, then each row.
Skill: /impeccable audit
Files: src/ui/PolygonList.tsx
You may edit: yes, a11y fixes only.
```

```text
/impeccable harden Centre on fixed does nothing to fixed rows. The picker closes on Escape and on a pointer down outside. A two-vertex part has no fill and no closing stroke. Disclosures stay closed on first paint.
Skill: /impeccable harden
Files: src/ui/PolygonList.tsx, src/ui/PolygonPreview.tsx, src/core/polygonList.ts
You may edit: yes.
```

### Prompt 9 — manual check

```text
Dev server: http://localhost:5173/
Record a short walkthrough. Verify:
1. A new Polygon shows Extent and Outline closed. Opening Extent shows Planform area, Max span, and Equivalent square side.
2. A file with two Poly values shows two separate strokes in Outline, with no line joining the end of one to the start of the other.
3. The file name is on its own line between the rotation field and the switch / colour / Export / Delete line.
4. 2 · Polygons collapses the rows and leaves Centre on fixed in the heading.
5. With one fixed Polygon, Centre on fixed stacks the switched-on outlines on that UTM centre and moves the map there. With two fixed Polygons, a list appears first. Bearing values do not change.
6. Hover and keyboard focus show the tooltip sentences. Reduced motion snaps the disclosure and the picker.
Skill: none.
You may edit: only to fix a failed check.
Done when: recording saved and all checks pass.
```
