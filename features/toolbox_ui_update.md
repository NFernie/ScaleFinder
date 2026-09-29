# Toolbox UI Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Supersedes:** UI-related prompts in [`feature/toolbox.md`](../feature/toolbox.md) (Prompt workflow section). Those prompts are **reference only** for the original Toolbox ship. Use **this file** for all Toolbox UI polish and interaction work.

**Goal:** Upgrade the map Toolbox from a text list to a bento tool grid with shape icons, tool-matched cursors (including lasso radius), descriptive hover tooltips, edge pan while drawing, and polygon/ruler preview segments that render behind the pointer—then re-run the Emil Kowalski animation workflow on Toolbox motion.

**Architecture:** Keep geometry and session rules in `src/core/` (`toolboxSession.ts`, `overlayOf`). UI changes live in `src/ui/Toolbox.tsx`, optional `src/ui/ToolIcon.tsx`, `src/map/MapInteractionLayer.tsx` (edge pan + cursor overlay), and extensions to `overlayOf` / `MeasurementOverlay` for confirmed vs preview stroke. No new runtime dependencies; cursors use CSS `cursor` URLs or inline SVG data URIs sized from lasso `radiusPx`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, MapLibre GL via `react-map-gl/maplibre`.

## Design and product references

Read before any task (see [`.cursor/rules/product-design-context.mdc`](../.cursor/rules/product-design-context.mdc)):

| Document | Use for |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | Build rules, changelog, manual map testing |
| [`PRODUCT.md`](../PRODUCT.md) | Scope; Toolbox is in scope; no GIS editor creep |
| [`ScaleFinderPurpose.md`](../ScaleFinderPurpose.md) | v1 behaviour |
| [`DESIGN.md`](../DESIGN.md) | Tokens: Panel 95%, 8px/12px corners, Float shadow, Selected teal, 44px targets |
| [`WORKFLOW.md`](../WORKFLOW.md) | Skill order and one-job-per-message |
| [`docs/superpowers/specs/2026-09-28-map-toolbox-design.md`](../docs/superpowers/specs/2026-09-28-map-toolbox-design.md) | Approved tool behaviour, lasso ranges, copy |
| [`feature/toolbox.md`](../feature/toolbox.md) | Original implementation plan (core tasks still valid; **UI prompts archived**) |

Skills (maximise in this order):

1. **UI UX Pro Max** — [`ui-styling`](../.cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md), [`design-system`](../.cursor/skills/ui-ux-pro-max/design-system/SKILL.md); optional BM25: `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "bento grid tool picker" --domain ux -n 5` and `--domain icons -n 5` (full CSV not required if vendored skills suffice).
2. **Impeccable** — [`.cursor/skills/impeccable/SKILL.md`](../.cursor/skills/impeccable/SKILL.md): `shape` → `critique` → implement → `polish` → `audit` → `harden`.
3. **Emil Kowalski** — [emil-design-eng](../.cursor/skills/emilkowalski/emil-design-eng/SKILL.md), [animate](../.cursor/skills/emilkowalski/animate/SKILL.md), [review-animations](../.cursor/skills/emilkowalski/review-animations/SKILL.md), [find-animation-opportunities](../.cursor/skills/emilkowalski/find-animation-opportunities/SKILL.md), [improve-animations](../.cursor/skills/emilkowalski/improve-animations/SKILL.md), [mobile-native](../.cursor/skills/emilkowalski/mobile-native/SKILL.md).

Subagents: [`.cursor/rules/subagent-models.mdc`](../.cursor/rules/subagent-models.mdc) — only `cursor-grok-*`, `grok-*`, or `composer-*`; pass `model` explicitly.

## Global Constraints

- Operate surface: one teal accent, Night navy panels; no second accent, light theme, or shadcn.
- Toolbox popup: Panel at 95%, 12px outer corners, Float shadow `0 2px 8px rgb(0 0 0 / 0.35)`, tool targets ≥ 44px.
- Tool labels on screen: capital **P** on Polygon when meaning a drawn outline; list name `Measured polygon` unchanged.
- Lasso **Radius**: CSS pixels, default **48**, range **8–128** (from spec §2). Higher radius = larger circular search area around the brush path on the canvas (more context, slower, may bleed into neighbouring colours).
- Lasso **Contrast** (`maxChannelDelta`): default **32**, range **0–255**. Lower = stricter colour match (only pixels very close to the clicked colour). Higher = looser match (more pixels included; risk of filling unrelated areas). Per-channel max RGB delta from seed pixel.
- Drawing line unchanged: `#ffffff` 2px on `#0f172a` 4px casing; closed fill white 0.2 opacity.
- Do not animate map geometry or drag previews; only chrome (popup, bento cells, tooltips).
- Every code commit: [`CHANGELOG.md`](../CHANGELOG.md) under `## [Unreleased]`.
- MapLibre: validate cursor, edge pan, and preview stacking in **manual GUI** recording.

## Product updates (this plan)

1. **Bento grid** — Toolbox popup is a compact bento grid; each tool is a **shape icon** (e.g. square tile for Square), not a text-only row. **Tool name** appears on **hover/focus tooltip** (and `aria-label` on the cell).
2. **Tool cursors** — Map cursor matches active tool (crosshair for polygon/ruler, circle for circle, square for square, lasso-specific). **Lasso:** cursor graphic **scales with Radius** setting while lasso is drawing.
3. **Descriptive tooltips** — Hover tooltips explain what each tool does. Lasso tooltips define Radius and Contrast with high/low meaning and **8–128** / **0–255** ranges (mirror spec).
4. **Edge pan** — While a drawing tool is active, moving the pointer against the map frame edge **pans the map** so the user can keep placing points without leaving the viewport.
5. **Preview behind pointer** — For **Polygon** and **Ruler**, the rubber-band segment from the last confirmed point to the pointer is drawn **behind** the custom cursor (confirmed polyline in map layer; preview segment separate or last in stack so pointer stays visually on top).

6. **Animations (Emil pass)** — Re-review `.toolbox-pop`, bento cell hover/press, and tooltip reveal; align with DESIGN.md durations or improve with evidence from `find-animation-opportunities` / `improve-animations`.

## File structure

| Path | Responsibility |
| --- | --- |
| Create: `src/ui/ToolIcon.tsx` | SVG icons per `ToolId` (polygon, polyline, lasso ring, circle, square) |
| Create: `src/ui/ToolboxTooltips.ts` | Central tooltip title + body strings (incl. lasso Radius/Contrast) |
| Create: `src/map/mapEdgePan.ts` | Pure edge detection + pan delta (unit-testable) |
| Create: `src/map/MapToolCursor.tsx` | Cursor overlay or `cursor` style from active tool + lasso radius |
| Modify: `src/ui/Toolbox.tsx` | Bento grid layout, icons, tooltips, selected state |
| Modify: `src/core/toolboxSession.ts` | `overlayOf`: expose `previewCorner` from `session.hover` for polygon/ruler |
| Modify: `src/map/MeasurementOverlay.tsx` | Render confirmed corners and preview segment as separate features (preview under pointer stacking) |
| Modify: `src/App.tsx` | Wire edge pan on `mousemove`, cursor layer, `dragPan` rules during draw |
| Modify: `src/map/MapView.tsx` | Optional props for cursor class on canvas container |
| Modify: `src/index.css` | Bento motion, tooltip transitions, `prefers-reduced-motion` |
| Test: `src/ui/Toolbox.test.tsx` | Bento grid a11y names, tooltip attributes |
| Test: `src/core/toolboxSession.test.ts` | `overlayOf` preview when hover set |
| Test: `src/map/mapEdgePan.test.ts` | Edge threshold pan vectors |
| Modify: `DESIGN.md` | Toolbox bento + cursor sentence after ship |
| Modify: `docs/superpowers/specs/2026-09-28-map-toolbox-design.md` | § presentation: bento, cursors, edge pan (after `/brainstorming` approval) |

---

## UI update workflow (skills)

Run **one skill per message**. Do not edit product code until Prompt 1 spec addendum is approved.

| Step | Skill | Outcome |
| --- | --- | --- |
| 0 | Read product | Context only |
| 1 | `/brainstorming` | Spec addendum approved |
| 2 | UI UX Pro Max `ui-styling` + optional `search.py` ux/icons | Bento layout + icon treatment (classes only) |
| 3 | `/impeccable shape` | States: grid, tooltip, cursor, edge pan, preview layer |
| 4 | `/impeccable critique` | Hierarchy report (no edits) |
| 5 | Implement tasks below | Code |
| 6 | Emil chain | `emil-design-eng` → `find-animation-opportunities` → `animate` / `improve-animations` → `review-animations` → `mobile-native` |
| 7 | `/impeccable polish`, `audit`, `harden` | Finish |
| 8 | Manual map check | Recording under `/opt/cursor/artifacts/` |

---

## Prompt workflow

### Prompt 0 — read context (no skill)

```text
Read AGENTS.md, PRODUCT.md, ScaleFinderPurpose.md, DESIGN.md, WORKFLOW.md, features/toolbox_ui_update.md, and docs/superpowers/specs/2026-09-28-map-toolbox-design.md.
This is an Operate surface. The Toolbox already ships; this work is UI and map interaction polish only.
Do not edit files.
Skill: none.
Done when: you can list the six product updates in features/toolbox_ui_update.md and the lasso Radius and Contrast ranges.
```

### Prompt 1 — `/brainstorming` (gate)

```text
/brainstorming
Read features/toolbox_ui_update.md, DESIGN.md, src/ui/Toolbox.tsx, src/App.tsx (map handlers), and docs/superpowers/specs/2026-09-28-map-toolbox-design.md.
Design the Toolbox UI update: bento icon grid, tool-matched cursors (lasso cursor scales with radius 8–128), descriptive hover tooltips (include lasso Radius and Contrast meanings and ranges), edge pan while drawing, polygon/ruler preview segment behind the pointer.
Do not write implementation code until I approve.
Ask one question at a time. Do not reopen the five tools or core session rules.
Propose: pure edge-pan helper in src/map/mapEdgePan.ts; overlayOf splits confirmed vs preview; CSS/SVG cursors without new npm deps.
Write the approved addendum to docs/superpowers/specs/2026-09-28-map-toolbox-design.md (new subsection under presentation) or docs/superpowers/specs/2026-09-29-toolbox-ui-update.md if cleaner.
Skill: /brainstorming
Files: features/toolbox_ui_update.md, DESIGN.md
You may edit: spec file only, after I approve.
Done when: spec addendum exists and I have approved it.
```

### Prompt 2 — UI UX Pro Max (bento + icons)

```text
/ui-styling Plan the Toolbox bento grid: 2×3 or 5-cell asymmetric bento inside the existing popup panel (12px corners, Panel 95%, Float shadow).
Each cell ≥ 44px, shape icon centred, Selected teal when active, Focus teal ring.
Icons: irregular polygon, open polyline, lasso ring, circle, square — monochrome Mist/teal, no second accent.
Hover shows a tooltip with the tool name; do not put long copy inside the cell.
Optional: run python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "bento dashboard tools" --domain ux -n 3 and "tool icon grid" --domain icons -n 3; reject anything that conflicts with DESIGN.md.
Skill: ui-styling
Files: src/ui/Toolbox.tsx, DESIGN.md
You may edit: no. Report Tailwind class list and grid template.
Done when: class list fits Global Constraints in features/toolbox_ui_update.md.
```

### Prompt 3 — `/impeccable shape`

```text
/impeccable shape the Toolbox UI update from features/toolbox_ui_update.md.
Include: bento grid, icon tooltips, per-tool map cursors, lasso cursor size tied to radius, edge pan thresholds, polygon/ruler preview line behind pointer, blocked-message row unchanged.
Empty: toolbox closed. Error: blockedMessage under grid. Phone: 390px width, grid does not cover zoom.
Do not write component code.
Skill: /impeccable shape
Files: features/toolbox_ui_update.md, src/App.tsx
You may edit: no.
Done when: I agree the shape covers all six updates.
```

### Prompt 4 — `/impeccable critique`

```text
/impeccable critique the Toolbox UI update shape from the previous message.
Can users pick tools without reading text labels? Are lasso Radius and Contrast explained without opening the readout?
Do not edit files.
Skill: /impeccable critique
Files: none.
Done when: report delivered.
```

### Prompt 5 — implement

```text
Implement features/toolbox_ui_update.md starting at Task 1. Follow TDD steps. Do not restyle the sidebar.
Skill: none (post-shape build).
Files: per task Files list.
You may edit: yes, those files plus CHANGELOG.md.
Done when: task test command passes.
```

### Prompt 6 — Emil Kowalski (one skill per message)

```text
/emil-design-eng Review Toolbox bento grid, tooltip reveal, and .toolbox-pop. Compare to DESIGN.md 160ms popup and 120ms .pressable.
Table: current vs proposed durations. Reject motion on map lines and previews.
Skill: emil-design-eng
Files: src/ui/Toolbox.tsx, src/index.css
You may edit: no.
Done when: table is complete.
```

```text
/find-animation-opportunities Toolbox bento cells and tool picker only. Operate surface — subtle, no bounce.
Skill: find-animation-opportunities
Files: src/ui/Toolbox.tsx
You may edit: no.
Done when: ranked list with approve/reject per item.
```

```text
/animate Implement approved bento hover/focus micro-motion (opacity/transform only) and keep .toolbox-pop at 160ms ease-out unless review changed it.
prefers-reduced-motion: reduce snaps all Toolbox motion.
Skill: animate
Files: src/index.css, src/ui/Toolbox.tsx
You may edit: yes, those files only.
Done when: motion matches emil-design-eng table.
```

```text
/improve-animations Apply only approved tweaks from find-animation-opportunities to the Toolbox popup.
Skill: improve-animations
Files: src/index.css
You may edit: yes.
Done when: review-animations would approve.
```

```text
/review-animations Review .toolbox-pop, .pressable, and any new .toolbox-bento-* rules.
Skill: review-animations
Files: src/index.css
You may edit: no.
Done when: each rule approved or given exact replacement.
```

```text
/mobile-native Toolbox bento at 390px: 44px cells, 16px fields in LassoMenu unchanged, no grey tap flash, popup clear of zoom/notch.
Skill: mobile-native
Files: src/ui/Toolbox.tsx, src/App.tsx
You may edit: yes, only for failed checks.
Done when: checks pass.
```

### Prompt 7 — finish

```text
/impeccable polish the Toolbox bento and tooltips only. Tabular numbers unchanged elsewhere.
Skill: /impeccable polish
Files: src/ui/Toolbox.tsx, src/ui/ToolIcon.tsx
You may edit: yes, spacing and alignment only.
```

```text
/impeccable audit Toolbox bento: Focus teal #5eead4 2px offset 2px; each cell has accessible name; keyboard order Toolbox → tools.
Skill: /impeccable audit
Files: src/ui/Toolbox.tsx
You may edit: yes, a11y fixes only.
```

```text
/impeccable harden Edge pan does not run when no tool is drawing. Cursors reset when session closes. Tooltips work with keyboard focus.
Skill: /impeccable harden
Files: src/App.tsx, src/map/MapToolCursor.tsx
You may edit: yes.
```

### Prompt 8 — manual map check

```text
Dev server: http://localhost:5173/
Record a short walkthrough. Verify:
1. Bento grid shows shape icons; names on hover/focus tooltips.
2. Each tool changes the map cursor; lasso cursor grows/shrinks with Radius 8–128.
3. Polygon and Ruler: rubber-band to pointer appears behind cursor.
4. Edge pan: pointer at map edge moves the map while drawing polygon/ruler/lasso.
5. Popup motion respects reduced motion.
Skill: none.
You may edit: only to fix a failed check.
Done when: recording saved and all checks pass.
```

---

## Tooltip copy (locked for implementation)

Use in `ToolboxTooltips.ts` (short title + optional `title` attribute; longer body in `role="tooltip"`):

| Tool | Title | Body (summary) |
| --- | --- | --- |
| Polygon | Polygon | Click corners on the map. Double-click or Done to close. Area and Add to list when closed. |
| Ruler | Ruler | Click to measure distances along a path. Open chain only — no area. Done or double-click to finish. |
| Lasso | Lasso | Paint on the map to trace a region by colour. Double-click to close the stroke. Adjust Radius and Contrast in the readout while drawing. |
| Circle | Circle | First click sets centre, second sets radius. Add to list when complete. |
| Square | Square / Rectangle | Two clicks for opposite corners. Toggle square or rectangle in the readout. |

**Lasso settings (also in LassoMenu label tooltips):**

- **Radius (8–128 px):** Size of the colour-search disc around your brush. **Low (8–24):** tight, precise edges. **High (64–128):** grabs a wider area; use on large uniform regions; may include unlike colours.
- **Contrast (0–255):** How similar a pixel’s RGB must be to the seed colour. **Low (0–16):** only nearly identical colours. **High (48–255):** includes more variation; **32** is default. **255** is maximally permissive.

---

### Task 1: Spec addendum (brainstorming)

**Files:**
- Create or modify: `docs/superpowers/specs/2026-09-29-toolbox-ui-update.md` (or addendum section in `2026-09-28-map-toolbox-design.md`)
- Modify: `CHANGELOG.md`

- [ ] **Step 1:** Run Prompt 0 and Prompt 1; get user approval.
- [ ] **Step 2:** Write spec; changelog Docs bullet.
- [ ] **Step 3:** Commit `docs: toolbox UI update spec`

---

### Task 2: Bento grid and icons

**Files:**
- Create: `src/ui/ToolIcon.tsx`
- Create: `src/ui/ToolboxTooltips.ts`
- Modify: `src/ui/Toolbox.tsx`
- Test: `src/ui/Toolbox.test.tsx`

**Interfaces:**
- Produces: `ToolIcon({ tool: ToolId, className?: string })`, `TOOL_TIPS: Record<ToolId, { title: string; body: string }>`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react'
import Toolbox from './Toolbox'
import { closedSession } from '../core/toolboxSession'

it('renders bento tool buttons with accessible names', () => {
  render(<Toolbox session={{ ...closedSession(), menuOpen: true }} onToggle={() => {}} onChoose={() => {}} />)
  expect(screen.getByRole('button', { name: /polygon/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /square/i })).toBeInTheDocument()
})
```

- [ ] **Step 2:** Run `npm run test -- src/ui/Toolbox.test.tsx` — expect FAIL until bento + aria-labels exist.

- [ ] **Step 3:** Implement grid (`grid grid-cols-3 gap-2` or approved layout), `ToolIcon`, tooltips via `title` + visible on focus (`group-hover` panel or native `title` for v1-minimal).

- [ ] **Step 4:** Run tests — PASS.

- [ ] **Step 5:** Commit `feat(ui): toolbox bento grid with shape icons`

---

### Task 3: Tool-matched cursors and lasso radius

**Files:**
- Create: `src/map/MapToolCursor.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css` (cursor URLs if needed)

- [ ] **Step 1:** When `session.tool` is set, apply cursor class on map container; lasso uses `radiusPx` from `session.lasso` to set hotspot circle diameter (clamp 8–128).

- [ ] **Step 2:** Manual check: switch tools, adjust lasso radius slider, cursor size updates.

- [ ] **Step 3:** Commit `feat(ui): tool cursors with dynamic lasso radius`

---

### Task 4: Edge pan while drawing

**Files:**
- Create: `src/map/mapEdgePan.ts`
- Create: `src/map/mapEdgePan.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { edgePanDelta } from './mapEdgePan'

describe('edgePanDelta', () => {
  it('returns positive x when pointer is near right edge', () => {
    const d = edgePanDelta({ x: 980, y: 400 }, { width: 1000, height: 800 }, 24)
    expect(d.x).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2:** Run test — FAIL.

- [ ] **Step 3:** Implement threshold (e.g. 32px), max speed cap; in `handleMapMouseMove`, call `map.panBy` when `mapAcceptsPoints` is true.

- [ ] **Step 4:** Tests PASS; manual edge pan recording.

- [ ] **Step 5:** Commit `feat(map): edge pan while using drawing tools`

---

### Task 5: Polygon and ruler preview behind pointer

**Files:**
- Modify: `src/core/toolboxSession.ts` (`overlayOf`)
- Modify: `src/map/MeasurementOverlay.tsx`
- Modify: `src/core/toolboxSession.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('includes hover preview for open polygon', () => {
  const session = { ...base, polygon: { status: 'adding', corners: [a, b] }, hover: c }
  const o = overlayOf(session)
  expect(o.preview).toEqual([a, b, c])
})
```

Extend `ToolboxOverlay` with optional `preview?: LngLat[]` (confirmed line without last hover segment, or separate `previewSegment` — pick one in spec addendum).

- [ ] **Step 2:** Run `npm run test -- src/core/toolboxSession.test.ts` — FAIL.

- [ ] **Step 3:** Render preview as separate GeoJSON line layer **below** confirmed line in `MeasurementOverlay`; ensure `MapToolCursor` renders above map canvas.

- [ ] **Step 4:** PASS + manual polygon/ruler check.

- [ ] **Step 5:** Commit `feat(map): preview segment behind tool cursor`

---

### Task 6: Emil animation pass

**Files:**
- Modify: `src/index.css`, `src/ui/Toolbox.tsx`

- [ ] **Step 1:** Run Prompt 6 skills in order; apply approved CSS only.

- [ ] **Step 2:** Commit `polish(ui): toolbox motion per emil review`

---

### Task 7: Impeccable finish and DESIGN.md

**Files:**
- Modify: `DESIGN.md`
- Run Prompt 7 polish, audit, harden.

- [ ] **Step 1:** Update DESIGN.md Toolbox subsection (bento, icons, cursors).

- [ ] **Step 2:** Commit `docs: DESIGN.md toolbox bento`

---

## Self-review (plan author)

| Requirement | Task |
| --- | --- |
| Bento + icons | Task 2 |
| Tool cursors + lasso radius | Task 3 |
| Descriptive tooltips + lasso defs | Task 2 copy + LassoMenu optional `title` |
| Edge pan | Task 4 |
| Preview behind pointer | Task 5 |
| Emil animation review | Task 6 |
| Spec/brainstorm gate | Task 1 |

No TBD placeholders in task steps above.

---

## Execution handoff

Plan complete and saved to `features/toolbox_ui_update.md`.

**1. Subagent-Driven (recommended)** — fresh subagent per task; `model: composer-2.5` or `cursor-grok-4.6-medium`; two-stage review between tasks.

**2. Inline Execution** — execute tasks in one session with checkpoints after Tasks 2, 4, and 6.

Which approach?
