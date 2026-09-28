# Map Toolbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Brainstorming gate:** Do not write product code, edit `PRODUCT.md`, or start Task 2 until Task 1 has produced `docs/superpowers/specs/2026-09-28-map-toolbox-design.md` and the user has approved that spec. `/brainstorming` is mandatory before every implementation task below. If the approved spec disagrees with a locked decision here, update this plan before writing code. The spec wins.

**Goal:** Replace the map Measure button with a Toolbox popup that selects Polygon (today's Measure behaviour), a distance-only Ruler, a colour-contrast Lasso, a Circle, and a Square or Rectangle.

**Architecture:** Polygon keeps `src/core/measurement.ts` unchanged. Ruler, circle, square, and lasso tracing are new pure modules in `src/core/`. One `ToolboxSession` reducer owns which tool is active and the single draft. React renders a popup and a floating readout outside the snapshot frame. Closed outlines still become session Polygons only through Add to list. The white line stays a map layer inside the frame.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, MapLibre GL via `react-map-gl/maplibre`. No new runtime dependency.

## Global Constraints

The user asked for this Toolbox on 2026-09-28 and explicitly expanded the product. That request is the authority to edit `PRODUCT.md` and `ScaleFinderPurpose.md` in Task 2. Do not add anything else.

- `PRODUCT.md` principle that conflicts until Task 2: "Compare the outline with a real region. Do not grow the tool into a general GIS editor." Task 2 replaces that sentence with the wording in the task. Do not ship the Toolbox while the old sentence is still the product rule.
- Still out of scope: user accounts, saved projects, a saved Polygon library, named CRS or EPSG reprojection, server-side rendering, collaborative editing, a tile proxy, and sending canvas pixels anywhere but the browser.
- Read `AGENTS.md`, `PRODUCT.md`, `ScaleFinderPurpose.md`, `DESIGN.md`, and `WORKFLOW.md` before any task. UI uses the tokens already in `DESIGN.md`. Do not add a second accent, a light theme, or a new corner size.
- Capital P on Polygon when a sentence means one of these outlines. The existing list name `Measured polygon` stays exactly that.
- One drawing at a time. Choosing another tool does not replace it.
- The drawing line is `#ffffff` at 2px over a 4px `#0f172a` casing. A closed shape has a white fill at 0.2 opacity. Same as `src/map/MeasurementOverlay.tsx`.
- The Toolbox, its popup, and the readout sit outside the snapshot frame, in the same top-left slot as Measure, clear of zoom and the basemap select. The line is inside the frame.
- Controls are at least 44px, 8px corners, Float shadow `0 2px 8px rgb(0 0 0 / 0.35)`, Panel at 95% for the popup and readout, 12px corners on those panels. Press uses the existing `.pressable` class (scale 0.97, 120ms ease-out). Focus ring is Focus teal `#5eead4`, 2px, offset 2px.
- Lengths and areas use `formatLength` and `formatArea` from `src/core/format.ts` and tabular numbers.
- Geometry stays in `src/core/` with no React. MapLibre is checked by hand. Unit tests do not mount the real map.
- Popup motion is opacity and `translateY(8px)` to rest, 160ms ease-out. `prefers-reduced-motion: reduce` snaps. No bounce. Circle and square previews follow the pointer with no ease.
- Subagents, including the Task tool, may only use a model slug whose name starts with `cursor-grok-`, `grok-`, or `composer-`. Pass `model` explicitly. Do not launch Claude, GPT, Gemini, or Muse. See `.cursor/rules/subagent-models.mdc`.
- Every code commit adds a `CHANGELOG.md` entry under `## [Unreleased]`.
- "Multiple clicks aloud" in the request is read as "multiple clicks allowed."

## File structure

- Create: `src/core/ruler.ts` — open distance chain. No area, no closing side.
- Create: `src/core/circle.ts` — centre, rim, 64-vertex ring.
- Create: `src/core/square.ts` — east-north rectangle or square from two corners.
- Create: `src/core/lasso.ts` — contrast flood fill, ordered outline, simplification. Pixels only.
- Create: `src/core/ringDraft.ts` — geographic ring to a metres Polygon draft.
- Create: `src/core/toolboxSession.ts` — which tool is on, and the one draft.
- Create: `src/map/sampleCanvas.ts` — read the MapLibre canvas and flip `readPixels`. No React.
- Create: `src/ui/Toolbox.tsx` — button plus popup.
- Create: `src/ui/RulerMenu.tsx`, `src/ui/ShapeMenu.tsx`, `src/ui/LassoMenu.tsx`.
- Modify: `src/ui/MeasureMenu.tsx` — used only by the Polygon tool. Behaviour unchanged.
- Modify: `src/map/MapView.tsx` — optional pointer move.
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/index.css`.
- Modify after the spec is approved: `PRODUCT.md`, `ScaleFinderPurpose.md`, `DESIGN.md` (toolbox sentence only), `CHANGELOG.md`.
- Do not change the public behaviour of `src/core/measurement.ts`.

---

## Prompt workflow

Run these as separate messages, in order. One skill per message. Paste the prompt as written. The message template from `WORKFLOW.md` is already filled in.

The full UI UX Pro Max `search.py` database is not in this repo. Use the vendored skills `ui-styling` and `design-system`. Do not call the `design` skill. It is for a brand mark, and `DESIGN.md` already exists.

### Prompt 0 — read the product before any skill

```text
Read AGENTS.md, PRODUCT.md, ScaleFinderPurpose.md, DESIGN.md, WORKFLOW.md, and feature/toolbox.md.
This is an Operate surface. Do not add features PRODUCT.md marks out of scope.
The user explicitly asked for a map Toolbox on 2026-09-28. The conflicting principle is the line "Do not grow the tool into a general GIS editor." Do not start implementation. Do not edit files.
Skill: none.
Files: the six files above.
You may edit: no.
Done when: you can name the five tools, the file that owns today's Measure rules, and the sentence Task 2 will write into PRODUCT.md.
```

### Prompt 1 — `/brainstorming` before any implementation step

Flag: every implementation task in this plan is blocked until this prompt finishes and the user approves the spec.

```text
/brainstorming
Read PRODUCT.md, DESIGN.md, WORKFLOW.md, feature/toolbox.md, src/core/measurement.ts, and src/ui/MeasureMenu.tsx.
Design a map Toolbox. Do not write implementation code. Do not edit PRODUCT.md until I approve the design.
Ask one question at a time. The five tools and the popup that replaces Measure are decided. Do not reopen them.
Confirm, one at a time, only these points already written in feature/toolbox.md:
1. Polygon keeps today's Measure behaviour, including Done, double-click close, area, and Add to list.
2. Ruler is distances only. Many clicks are allowed. It never closes and never shows area.
3. Circle is two clicks: centre, then rim. Square is two clicks with a Rectangle or Square toggle, sides along local east and north.
4. Lasso flood-fills canvas pixels whose colour is within a per-channel delta of the clicked pixel, inside a radius. If the canvas cannot be read, the menu says so. No server.
5. One drawing at a time. Session only.
Propose the approach in feature/toolbox.md as the recommendation: pure core modules plus one ToolboxSession reducer. Mention a second approach only to reject putting the rules in React.
Write the approved design to docs/superpowers/specs/2026-09-28-map-toolbox-design.md and stop. The next step is this plan, not code.
Skill: /brainstorming
Files: feature/toolbox.md, PRODUCT.md, src/core/measurement.ts
You may edit: only the spec file, after I approve.
Done when: the spec exists and I have approved it.
```

### Prompt 2 — UI UX Pro Max, after the spec is approved

`ui-styling` plans the Tailwind for a control that already has a job. `design-system` is not needed: no new colour token. Reject any suggestion of a second accent, shadcn, or a light popup.

```text
/ui-styling Style the map Toolbox popup and its tool readout.
Follow DESIGN.md: 44px height, 8px corners on buttons, 12px corners on the popup, Night field fill is Panel at 95%, Signal teal for the commit button, Selected teal when a tool is on, Focus teal ring, Float shadow, tabular numbers.
The popup lists Polygon, Ruler, Lasso, Circle, and Square. It replaces the Measure button. It must not cover the zoom control.
Do not add shadcn and do not change the palette.
Skill: ui-styling
Files: src/ui/Toolbox.tsx, src/ui/MeasureMenu.tsx, DESIGN.md
You may edit: no. Report the class list only.
Done when: the class list matches the Global Constraints in feature/toolbox.md.
```

### Prompt 3 — `/impeccable shape`

```text
/impeccable shape the Toolbox on the map.
Operate surface. Stay inside DESIGN.md. Do not change colours.
The Measure button becomes Toolbox. The popup offers Polygon, Ruler, Lasso, Circle, and Square.
Polygon follows the current Measure menu. Ruler shows segments and a total, Done, and Delete, and no area. Circle and Square show a preview, then radius or sides, area, Add to list, and Delete. Lasso shows radius, contrast, a failure sentence, and Add to list only after a ring exists.
Empty: Toolbox closed, no readout. Error: too few clicks, radius too small, no feature at that contrast, basemap cannot be sampled.
Phone: the popup stays on the map, 44px targets, and does not cover zoom. The sidebar does not gain a tool section.
Do not write component code in this message.
Skill: /impeccable shape
Files: feature/toolbox.md, src/App.tsx
You may edit: no.
Done when: the shape lists every state above and I have agreed.
```

### Prompt 4 — `/impeccable critique` (report only)

```text
/impeccable critique the Toolbox shape from the previous message.
Import, Polygons, and Find a region stay in that order in the sidebar. The Toolbox stays on the map.
Do not restyle. Do not edit files.
Skill: /impeccable critique
Files: none.
You may edit: no.
Done when: you have said whether Polygon, Ruler, Lasso, Circle, and Square are distinguishable without a second colour.
```

### Prompt 5 — implement the agreed shape

`/impeccable craft` is a deprecated alias. Do not use that name. Implementation is Task 3 onward, and only after Prompts 1–4.

```text
Implement the agreed Toolbox shape from feature/toolbox.md, task by task.
Start at the first unchecked implementation task. Follow its tests. Do not restyle the rest of the app.
Skill: none. This is the build step after /impeccable shape.
Files: the Files list of the current task.
You may edit: yes, only those files, plus CHANGELOG.md.
Done when: that task's test command passes.
```

### Prompt 6 — Emil, one skill per message, after the tools work

Do not stack these in one prompt. Do not animate dragging or the circle preview.

```text
/emil-design-eng Review the Toolbox popup and the tool readout only.
Press may scale to 0.97 in 120ms ease-out, as in DESIGN.md.
The popup may fade and rise 8px in 160ms ease-out, transform and opacity only.
Reduced motion snaps. No bounce. No shadow on sidebar rows.
Do not edit yet. Give a before/after table with exact durations.
Skill: emil-design-eng
Files: src/ui/Toolbox.tsx, src/index.css
You may edit: no.
Done when: the table covers the popup open and the press, and rejects motion on the map drawing.
```

```text
/animate Build only the Toolbox popup open: opacity 0 and translateY(8px) to rest, 160ms ease-out, transform and opacity only.
Reduced motion snaps. Do not animate the Polygon, the ruler line, or the circle preview. The ground shape follows the pointer.
Skill: animate
Files: src/index.css, src/ui/Toolbox.tsx
You may edit: yes, those two files only.
Done when: .toolbox-pop matches Task 11 and prefers-reduced-motion removes the animation.
```

```text
/review-animations Review .toolbox-pop and .pressable in src/index.css.
Approve or reject the 160ms popup and the 120ms press. Do not edit.
Skill: review-animations
Files: src/index.css
You may edit: no.
Done when: each motion is approved or given an exact replacement duration.
```

```text
/mobile-native Check the Toolbox popup, the radius and contrast fields, and the map controls.
Fields stay at 16px. Buttons must not highlight grey on tap. The popup must not sit under the notch or on the zoom control.
Do not change the desktop layout.
Skill: mobile-native
Files: src/ui/Toolbox.tsx, src/ui/LassoMenu.tsx, src/App.tsx
You may edit: yes, only if a target is under 44px or a field is under 16px.
Done when: those checks pass.
```

`animation-vocabulary`, `find-animation-opportunities`, `improve-animations`, `apple-design`, `pick-ui-library`, `ask-sonner`, and `prototype` are not part of this feature. The popup motion already has a name and a duration. There is no toast and no new library.

### Prompt 7 — finish

```text
/impeccable polish the Toolbox popup and the tool readout only.
Keep Float shadow, 12px corners, and tabular numbers. Do not move them into the sidebar. Do not change colours.
Skill: /impeccable polish
Files: src/ui/Toolbox.tsx, src/ui/MeasureMenu.tsx, src/ui/RulerMenu.tsx, src/ui/ShapeMenu.tsx, src/ui/LassoMenu.tsx
You may edit: yes, spacing and alignment only.
Done when: the menus match DESIGN.md and no other screen changed.
```

```text
/impeccable audit the Toolbox.
Focus must stay Focus teal (#5eead4), 2px, offset 2px.
Keyboard: Toolbox, then the five tools, then Done or Add to list, then Delete.
Check a 390px viewport and a desktop viewport.
Skill: /impeccable audit
Files: src/ui/Toolbox.tsx and the menus.
You may edit: yes, only for a failed focus, name, or contrast check.
Done when: each tool button has an accessible name and a 44px target.
```

```text
/impeccable harden the Toolbox.
Done with fewer than two ruler points shows "Add at least two points."
A circle or square that is too small shows "The radius is too small." or "The box is too small."
Lasso with no region shows "No feature found at that contrast."
A canvas that cannot be read shows "This basemap does not allow colour sampling."
Delete clears the drawing and does not remove a Polygon already in the list.
A bad action must leave existing Polygons in place.
Skill: /impeccable harden
Files: src/core/toolboxSession.ts, src/App.tsx, the menus.
You may edit: yes, error copy and guards only.
Done when: the messages above are the ones on screen.
```

```text
/impeccable document
The Toolbox is now on the map. Add it to DESIGN.md as a floating map control: Panel at 95%, 12px corners, Float shadow, Selected teal while a tool is on.
Do not invent a token. Update .impeccable/design.json only if document already maintains that sidecar.
Skill: /impeccable document
Files: DESIGN.md
You may edit: yes, DESIGN.md only, plus the sidecar if the command already writes it.
Done when: DESIGN.md mentions the Toolbox and the palette is unchanged.
```

Do not run `/impeccable colorize`, `/impeccable bolder`, `/impeccable delight`, or `/impeccable overdrive`.

### Prompt 8 — manual map check

```text
The dev server is http://localhost:5173/.
Check the Toolbox by hand. Do not change code unless a check fails.
1. Toolbox opens and Measure is gone.
2. Polygon: three clicks, Done shows segments and total and no area. Delete. Again, three clicks, double-click closes, area shows, Add to list creates "Measured polygon" where it was drawn.
3. Ruler: four clicks show a running total and no area. Done stops further clicks. Double-click does not close a shape.
4. Circle: two clicks. The preview follows the pointer. Add to list creates "Circle".
5. Square: Rectangle makes an east-north box. Square forces equal sides. Add to list uses "Rectangle" or "Square".
6. Lasso: a click either traces a same-colour patch or shows "This basemap does not allow colour sampling."
7. The PNG includes the white line and not the Toolbox popup.
8. At 390px the popup does not cover zoom.
Skill: none.
You may edit: only to fix a failed check.
Done when: all eight checks pass.
```

---

### Task 1: Brainstorm and approve the spec

**Files:**
- Create after approval: `docs/superpowers/specs/2026-09-28-map-toolbox-design.md`
- Modify: `CHANGELOG.md` (Docs bullet pointing at the spec)

**Interfaces:**
- Consumes: this plan's locked decisions
- Produces: an approved spec. Later tasks must match it. If it changes a signature below, edit this plan first.

> **Brainstorming gate:** This task is `/brainstorming`. Do not implement Tasks 2–12 in the same turn as the questions.

- [ ] **Step 1: Run Prompt 0, then Prompt 1**

Use the prompts in the Prompt workflow. Ask the five confirmation questions one at a time. Do not write `src/` code.

- [ ] **Step 2: Write the spec after the user agrees**

Save it to `docs/superpowers/specs/2026-09-28-map-toolbox-design.md`. Include the goal, the five tools, the one-drawing rule, the copy strings in the Global Constraints, the out-of-scope list, and the testing split (Vitest for `src/core/`, manual check for MapLibre).

- [ ] **Step 3: Stop**

Ask the user to review the spec. Do not start Task 2 until they approve it.

---

### Task 2: Record the product expansion

> **Brainstorming gate:** Start only after the Task 1 spec is approved. `/brainstorming` is not repeated as a full dialogue. If the spec changed the sentences below, use the spec's sentences.

**Files:**
- Modify: `PRODUCT.md`
- Modify: `ScaleFinderPurpose.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: approved spec
- Produces: product text that names the Toolbox. No code.

- [ ] **Step 1: Replace the map-ruler capability in `PRODUCT.md`**

Replace this bullet:

```markdown
- A map ruler. Clicks show each ground segment and the total. Double-click closes the chain and adds the area. Add to list copies that closed shape into the session. The measurement is not kept after the page closes.
```

with:

```markdown
- A Toolbox on the map, in place of the Measure button. Polygon keeps the previous ruler behaviour: clicks show each ground segment and the total, Done keeps the chain open, double-click closes it and adds the area, and Add to list copies that closed shape into the session. Ruler measures ground distance across many clicks and does not close. Circle and Square draw a closed outline from two clicks. Lasso traces a similar colour inside a radius of a click. Nothing drawn here is kept after the page closes.
```

- [ ] **Step 2: Replace the GIS-editor principle in `PRODUCT.md`**

Replace:

```markdown
- Compare the outline with a real region. Do not grow the tool into a general GIS editor.
```

with:

```markdown
- Compare the outline with a real region. The Toolbox draws a comparison outline or a ground distance on the map the user is looking at. It does not edit the basemap, reproject a named CRS, or store work after the page closes.
```

- [ ] **Step 3: Replace the matching bullet in `ScaleFinderPurpose.md`**

Replace the "A map ruler:" in-scope bullet with the same Toolbox sentence used in `PRODUCT.md`. Leave accounts, saved libraries, CRS reprojection, and server-side rendering out of scope.

- [ ] **Step 4: Changelog**

Under `## [Unreleased]` → `### Changed`, add:

```markdown
- The product record allows a map Toolbox: Polygon, Ruler, Lasso, Circle, and Square. Drawings still end when the page closes.
```

- [ ] **Step 5: Commit**

```bash
git add PRODUCT.md ScaleFinderPurpose.md CHANGELOG.md
git commit -m "docs: record the map Toolbox in the product"
```

---

### Task 3: Distance ruler

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/core/ruler.ts`
- Test: `src/core/ruler.test.ts`

**Interfaces:**
- Consumes: `haversineM` from `src/core/projection.ts`, `LngLat` from `src/core/types.ts`
- Produces:
  - `Ruler` = `{ status: 'adding' | 'done'; corners: LngLat[]; message: string | null }`
  - `beginRuler(): Ruler`
  - `addRulerCorner(ruler: Ruler, corner: LngLat): Ruler`
  - `finishDistanceRuler(ruler: Ruler): Ruler`
  - `rulerReadout(ruler: Ruler): { segments: { label: string; metres: number }[]; totalM: number }`

- [ ] **Step 1: Write the failing test**

Create `src/core/ruler.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { destinationPoint } from './projection'
import { addRulerCorner, beginRuler, finishDistanceRuler, rulerReadout } from './ruler'

const origin = { lng: 10, lat: 45 }
const east = destinationPoint(origin, 1000, 90)
const north = destinationPoint(origin, 500, 0)

describe('distance ruler', () => {
  it('sums each open segment and has no closing side', () => {
    const ruler = finishDistanceRuler(
      addRulerCorner(addRulerCorner(addRulerCorner(beginRuler(), origin), east), north),
    )
    const figures = rulerReadout(ruler)
    expect(ruler.status).toBe('done')
    expect(figures.segments.map((segment) => segment.label)).toEqual(['Segment 1', 'Segment 2'])
    expect(figures.segments[0].metres).toBeCloseTo(1000, 0)
    expect(figures.totalM).toBeCloseTo(
      figures.segments.reduce((sum, segment) => sum + segment.metres, 0),
      3,
    )
    expect(figures).not.toHaveProperty('areaM2')
  })

  it('keeps adding after many clicks until Done', () => {
    const open = [origin, east, north].reduce(
      (ruler, corner) => addRulerCorner(ruler, corner),
      beginRuler(),
    )
    expect(open.status).toBe('adding')
    expect(open.corners).toHaveLength(3)
  })

  it('does not finish a single point', () => {
    const next = finishDistanceRuler(addRulerCorner(beginRuler(), origin))
    expect(next.status).toBe('adding')
    expect(next.message).toBe('Add at least two points.')
  })

  it('ignores clicks after Done and ignores a duplicate point', () => {
    const done = finishDistanceRuler(addRulerCorner(addRulerCorner(beginRuler(), origin), east))
    expect(addRulerCorner(done, north).corners).toHaveLength(2)
    const duplicate = addRulerCorner(addRulerCorner(beginRuler(), origin), origin)
    expect(duplicate.corners).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/core/ruler.test.ts`

Expected: FAIL because `src/core/ruler.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/ruler.ts`:

```ts
import { haversineM } from './projection'
import { LngLat } from './types'

export interface RulerSegment {
  label: string
  metres: number
}

export interface Ruler {
  status: 'adding' | 'done'
  corners: LngLat[]
  message: string | null
}

export function beginRuler(): Ruler {
  return { status: 'adding', corners: [], message: null }
}

export function addRulerCorner(ruler: Ruler, corner: LngLat): Ruler {
  if (ruler.status !== 'adding') return ruler
  const last = ruler.corners[ruler.corners.length - 1]
  if (last && haversineM(last, corner) < 1) return { ...ruler, message: null }
  return {
    status: 'adding',
    corners: [...ruler.corners, { lng: corner.lng, lat: corner.lat }],
    message: null,
  }
}

export function finishDistanceRuler(ruler: Ruler): Ruler {
  if (ruler.status !== 'adding') return ruler
  if (ruler.corners.length < 2) return { ...ruler, message: 'Add at least two points.' }
  return { status: 'done', corners: ruler.corners, message: null }
}

export function rulerReadout(ruler: Ruler): { segments: RulerSegment[]; totalM: number } {
  const segments = ruler.corners.slice(1).map((corner, index) => ({
    label: `Segment ${index + 1}`,
    metres: haversineM(ruler.corners[index], corner),
  }))
  return {
    segments,
    totalM: segments.reduce((sum, segment) => sum + segment.metres, 0),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/core/ruler.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ruler.ts src/core/ruler.test.ts CHANGELOG.md
git commit -m "feat: add a distance-only ruler"
```

Add under `### Added` in `CHANGELOG.md`:

```markdown
- A distance ruler sums open ground segments and does not close into an area (`src/core/ruler.ts`).
```

---

### Task 4: Circle ring

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/core/circle.ts`
- Test: `src/core/circle.test.ts`

**Interfaces:**
- Consumes: `destinationPoint`, `haversineM`
- Produces:
  - `CIRCLE_STEPS = 64`
  - `CircleDraft` = `{ status: 'centre' | 'ready'; centre: LngLat | null; edge: LngLat | null; message: string | null }`
  - `beginCircle(): CircleDraft`
  - `setCircleCentre(draft: CircleDraft, centre: LngLat): CircleDraft`
  - `setCircleEdge(draft: CircleDraft, edge: LngLat): CircleDraft`
  - `circleRadiusM(centre: LngLat, edge: LngLat): number`
  - `circleRing(centre: LngLat, radiusM: number): LngLat[]`

- [ ] **Step 1: Write the failing test**

Create `src/core/circle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { beginCircle, CIRCLE_STEPS, circleRadiusM, circleRing, setCircleCentre, setCircleEdge } from './circle'
import { destinationPoint, haversineM } from './projection'

const centre = { lng: 10, lat: 45 }
const edge = destinationPoint(centre, 2000, 90)

describe('circle', () => {
  it('commits a second click into a 64-point ring at the clicked radius', () => {
    const ready = setCircleEdge(setCircleCentre(beginCircle(), centre), edge)
    expect(ready.status).toBe('ready')
    expect(circleRadiusM(ready.centre!, ready.edge!)).toBeCloseTo(2000, 0)
    const ring = circleRing(ready.centre!, circleRadiusM(ready.centre!, ready.edge!))
    expect(ring).toHaveLength(CIRCLE_STEPS)
    for (const point of ring) {
      expect(haversineM(centre, point)).toBeCloseTo(2000, 0)
    }
  })

  it('rejects a radius under one metre and ignores a second centre', () => {
    const placed = setCircleCentre(beginCircle(), centre)
    expect(setCircleCentre(placed, edge).centre).toEqual(centre)
    const tiny = setCircleEdge(placed, centre)
    expect(tiny.status).toBe('centre')
    expect(tiny.message).toBe('The radius is too small.')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/core/circle.test.ts`

Expected: FAIL because `src/core/circle.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/circle.ts`:

```ts
import { destinationPoint, haversineM } from './projection'
import { LngLat } from './types'

export const CIRCLE_STEPS = 64

export interface CircleDraft {
  status: 'centre' | 'ready'
  centre: LngLat | null
  edge: LngLat | null
  message: string | null
}

export function beginCircle(): CircleDraft {
  return { status: 'centre', centre: null, edge: null, message: null }
}

export function setCircleCentre(draft: CircleDraft, centre: LngLat): CircleDraft {
  if (draft.status !== 'centre' || draft.centre) return draft
  return { ...draft, centre: { lng: centre.lng, lat: centre.lat }, message: null }
}

export function setCircleEdge(draft: CircleDraft, edge: LngLat): CircleDraft {
  if (!draft.centre || draft.status !== 'centre') return draft
  if (haversineM(draft.centre, edge) < 1) return { ...draft, message: 'The radius is too small.' }
  return {
    status: 'ready',
    centre: draft.centre,
    edge: { lng: edge.lng, lat: edge.lat },
    message: null,
  }
}

export function circleRadiusM(centre: LngLat, edge: LngLat): number {
  return haversineM(centre, edge)
}

export function circleRing(centre: LngLat, radiusM: number): LngLat[] {
  const ring: LngLat[] = []
  for (let step = 0; step < CIRCLE_STEPS; step += 1) {
    ring.push(destinationPoint(centre, radiusM, (360 * step) / CIRCLE_STEPS))
  }
  return ring
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/core/circle.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/circle.ts src/core/circle.test.ts CHANGELOG.md
git commit -m "feat: build a geodesic circle from two clicks"
```

Changelog `### Added`:

```markdown
- A circle tool builds a 64-vertex ground ring from a centre and a rim (`src/core/circle.ts`).
```

---

### Task 5: Square and rectangle

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/core/square.ts`
- Test: `src/core/square.test.ts`

**Interfaces:**
- Consumes: `destinationPoint`, `haversineM`
- Produces:
  - `BoxShape = 'rectangle' | 'square'`
  - `SquareDraft` = `{ status: 'origin' | 'ready'; shape: BoxShape; origin: LngLat | null; opposite: LngLat | null; message: string | null }`
  - `beginSquare(): SquareDraft`
  - `setSquareShape(draft: SquareDraft, shape: BoxShape): SquareDraft`
  - `setSquareOrigin(draft: SquareDraft, origin: LngLat): SquareDraft`
  - `setSquareOpposite(draft: SquareDraft, opposite: LngLat): SquareDraft`
  - `squareCorners(origin: LngLat, opposite: LngLat, shape: BoxShape): LngLat[] | null`

Corners are origin, then east, then east-and-north, then north. A square uses `max(|east|, |north|)` for both sides and keeps each sign. Sides follow local east and north, not the screen.

- [ ] **Step 1: Write the failing test**

Create `src/core/square.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { destinationPoint, haversineM } from './projection'
import {
  beginSquare,
  setSquareOpposite,
  setSquareOrigin,
  setSquareShape,
  squareCorners,
} from './square'

const origin = { lng: 10, lat: 45 }

describe('square and rectangle', () => {
  it('builds an east-north rectangle from the opposite corner', () => {
    const east = destinationPoint(origin, 1000, 90)
    const opposite = destinationPoint(east, 400, 0)
    const corners = squareCorners(origin, opposite, 'rectangle')
    expect(corners).toHaveLength(4)
    expect(haversineM(corners![0], corners![1])).toBeCloseTo(1000, 0)
    expect(haversineM(corners![1], corners![2])).toBeCloseTo(400, 0)
    expect(haversineM(corners![0], corners![3])).toBeCloseTo(400, 0)
  })

  it('forces a square onto the longer side', () => {
    const east = destinationPoint(origin, 1000, 90)
    const opposite = destinationPoint(east, 400, 0)
    const corners = squareCorners(origin, opposite, 'square')
    expect(haversineM(corners![0], corners![1])).toBeCloseTo(1000, 0)
    expect(haversineM(corners![0], corners![3])).toBeCloseTo(1000, 0)
  })

  it('rejects a flat rectangle and can switch shape before the second click', () => {
    expect(squareCorners(origin, destinationPoint(origin, 1000, 90), 'rectangle')).toBeNull()
    const draft = setSquareShape(setSquareOrigin(beginSquare(), origin), 'square')
    expect(draft.shape).toBe('square')
    const flat = setSquareOpposite(draft, origin)
    expect(flat.status).toBe('origin')
    expect(flat.message).toBe('The box is too small.')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/core/square.test.ts`

Expected: FAIL because `src/core/square.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/square.ts`:

```ts
import { destinationPoint, haversineM } from './projection'
import { LngLat } from './types'

const toRad = (degrees: number) => (degrees * Math.PI) / 180

export type BoxShape = 'rectangle' | 'square'

export interface SquareDraft {
  status: 'origin' | 'ready'
  shape: BoxShape
  origin: LngLat | null
  opposite: LngLat | null
  message: string | null
}

export function beginSquare(): SquareDraft {
  return { status: 'origin', shape: 'rectangle', origin: null, opposite: null, message: null }
}

export function setSquareShape(draft: SquareDraft, shape: BoxShape): SquareDraft {
  if (draft.status !== 'origin') return draft
  return { ...draft, shape }
}

export function setSquareOrigin(draft: SquareDraft, origin: LngLat): SquareDraft {
  if (draft.status !== 'origin' || draft.origin) return draft
  return { ...draft, origin: { lng: origin.lng, lat: origin.lat }, message: null }
}

export function setSquareOpposite(draft: SquareDraft, opposite: LngLat): SquareDraft {
  if (!draft.origin || draft.status !== 'origin') return draft
  const corners = squareCorners(draft.origin, opposite, draft.shape)
  if (!corners) return { ...draft, message: 'The box is too small.' }
  return {
    ...draft,
    status: 'ready',
    opposite: { lng: opposite.lng, lat: opposite.lat },
    message: null,
  }
}

export function squareCorners(origin: LngLat, opposite: LngLat, shape: BoxShape): LngLat[] | null {
  const offset = eastNorth(origin, opposite)
  let east = offset.east
  let north = offset.north
  if (shape === 'square') {
    const side = Math.max(Math.abs(east), Math.abs(north))
    if (side < 1) return null
    east = Math.sign(east || 1) * side
    north = Math.sign(north || 1) * side
  } else if (Math.abs(east) < 1 || Math.abs(north) < 1) {
    return null
  }
  const eastPoint = destinationPoint(origin, Math.abs(east), east >= 0 ? 90 : 270)
  const far = destinationPoint(eastPoint, Math.abs(north), north >= 0 ? 0 : 180)
  const northPoint = destinationPoint(origin, Math.abs(north), north >= 0 ? 0 : 180)
  return [origin, eastPoint, far, northPoint]
}

function eastNorth(origin: LngLat, point: LngLat): { east: number; north: number } {
  const distance = haversineM(origin, point)
  if (distance === 0) return { east: 0, north: 0 }
  const φ1 = toRad(origin.lat)
  const φ2 = toRad(point.lat)
  const Δλ = toRad(point.lng - origin.lng)
  const east = Math.sin(Δλ) * Math.cos(φ2)
  const north = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const bearing = Math.atan2(east, north)
  return { east: distance * Math.sin(bearing), north: distance * Math.cos(bearing) }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/core/square.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/square.ts src/core/square.test.ts CHANGELOG.md
git commit -m "feat: build an east-north square or rectangle"
```

Changelog `### Added`:

```markdown
- Square draws a local east-north rectangle, or a square on the longer side (`src/core/square.ts`).
```

---

### Task 6: Lasso contrast trace and ring draft

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/core/lasso.ts`
- Create: `src/core/ringDraft.ts`
- Test: `src/core/lasso.test.ts`
- Test: `src/core/ringDraft.test.ts`

**Interfaces:**
- Consumes: `polygonAreaM2`, `centroid` from `src/core/geometry.ts`; `destinationPoint` from `src/core/projection.ts`
- Produces:
  - `Raster` = `{ width: number; height: number; data: Uint8ClampedArray }`
  - `Pixel` = `{ x: number; y: number }`
  - `traceContrast(raster: Raster, seed: Pixel, radiusPx: number, maxChannelDelta: number): Pixel[] | null`
  - `RingDraft` = `{ sourceName: string; raw: Vertex[]; unit: 'm'; hasZ: false; anchor: LngLat }`
  - `ringToDraft(corners: LngLat[], sourceName: string): RingDraft | null`

Contrast is the maximum of the absolute red, green, and blue differences from the seed pixel. Alpha is ignored. The fill is 4-connected and stops at `radiusPx` from the seed. Fewer than 8 filled pixels returns null. The outline is a Moore walk from the top-most, then left-most, filled pixel, simplified with Ramer–Douglas–Peucker at 1.25 pixels. The simplified ring needs at least 3 points.

- [ ] **Step 1: Write the failing tests**

Create `src/core/lasso.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { traceContrast, type Raster } from './lasso'

function solid(width: number, height: number, paint: (x: number, y: number) => [number, number, number]): Raster {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y)
      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255
    }
  }
  return { width, height, data }
}

describe('lasso contrast', () => {
  it('returns the four corners of a red block and stays inside the radius', () => {
    const raster = solid(9, 9, (x, y) => (x >= 2 && x <= 6 && y >= 2 && y <= 6 ? [200, 40, 40] : [20, 20, 20]))
    const ring = traceContrast(raster, { x: 4, y: 4 }, 10, 12)
    expect(ring?.[0]).toEqual({ x: 2, y: 2 })
    expect(ring).toEqual([
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 2, y: 6 },
    ])
  })

  it('does not cross a radius or a contrasting pixel', () => {
    const raster = solid(9, 9, (x, y) => (x >= 2 && x <= 6 && y >= 2 && y <= 6 ? [200, 40, 40] : [20, 20, 20]))
    expect(traceContrast(raster, { x: 4, y: 4 }, 1, 12)).toBeNull()
    expect(traceContrast(raster, { x: 0, y: 0 }, 10, 0)).toBeNull()
  })
})
```

Create `src/core/ringDraft.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { polygonAreaM2 } from './geometry'
import { destinationPoint, haversineM, projectToGeographic } from './projection'
import { ringToDraft } from './ringDraft'

describe('ring draft', () => {
  it('turns a geographic ring into a metres Polygon at the drawn centre', () => {
    const origin = { lng: 10, lat: 45 }
    const corners = [origin, destinationPoint(origin, 1000, 90), destinationPoint(origin, 1000, 0)]
    const draft = ringToDraft(corners, 'Lasso')
    expect(draft?.sourceName).toBe('Lasso')
    expect(draft?.unit).toBe('m')
    expect(polygonAreaM2(draft!.raw)).toBeGreaterThan(0)
    const projected = projectToGeographic(draft!.raw, draft!.anchor)
    expect(haversineM(projected[0], origin)).toBeLessThan(2)
  })

  it('returns null for fewer than three corners', () => {
    expect(ringToDraft([{ lng: 0, lat: 0 }], 'Circle')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/core/lasso.test.ts src/core/ringDraft.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/lasso.ts`:

```ts
export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface Pixel {
  x: number
  y: number
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1]
const DY = [0, 1, 1, 1, 0, -1, -1, -1]

export function traceContrast(
  raster: Raster,
  seed: Pixel,
  radiusPx: number,
  maxChannelDelta: number,
): Pixel[] | null {
  if (radiusPx < 1) return null
  if (seed.x < 0 || seed.y < 0 || seed.x >= raster.width || seed.y >= raster.height) return null
  const filled = flood(raster, seed, radiusPx, maxChannelDelta)
  let count = 0
  for (const cell of filled) count += cell
  if (count < 8) return null
  const start = topLeft(raster, filled)
  if (!start) return null
  const walked = moore(raster, filled, start)
  const simplified = simplifyRing(walked, 1.25)
  return simplified.length >= 3 ? simplified : null
}

function flood(raster: Raster, seed: Pixel, radiusPx: number, maxChannelDelta: number): Uint8Array {
  const filled = new Uint8Array(raster.width * raster.height)
  const colour = rgb(raster, seed.x, seed.y)
  const stack: Pixel[] = [seed]
  filled[seed.y * raster.width + seed.x] = 1
  const radius2 = radiusPx * radiusPx
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + ox
      const y = current.y + oy
      if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) continue
      const key = y * raster.width + x
      if (filled[key]) continue
      const dx = x - seed.x
      const dy = y - seed.y
      if (dx * dx + dy * dy > radius2) continue
      const next = rgb(raster, x, y)
      const delta = Math.max(
        Math.abs(next[0] - colour[0]),
        Math.abs(next[1] - colour[1]),
        Math.abs(next[2] - colour[2]),
      )
      if (delta > maxChannelDelta) continue
      filled[key] = 1
      stack.push({ x, y })
    }
  }
  return filled
}

function rgb(raster: Raster, x: number, y: number): [number, number, number] {
  const index = (y * raster.width + x) * 4
  return [raster.data[index], raster.data[index + 1], raster.data[index + 2]]
}

function topLeft(raster: Raster, filled: Uint8Array): Pixel | null {
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      if (filled[y * raster.width + x]) return { x, y }
    }
  }
  return null
}

function inside(raster: Raster, filled: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return false
  return filled[y * raster.width + x] === 1
}

function moore(raster: Raster, filled: Uint8Array, start: Pixel): Pixel[] {
  const points: Pixel[] = []
  let x = start.x
  let y = start.y
  let check = 6
  for (let guard = 0; guard < raster.width * raster.height; guard += 1) {
    points.push({ x, y })
    let moved = false
    for (let turn = 0; turn < 8; turn += 1) {
      const direction = (check + turn) % 8
      const nx = x + DX[direction]
      const ny = y + DY[direction]
      if (!inside(raster, filled, nx, ny)) continue
      if (nx === start.x && ny === start.y) return points
      x = nx
      y = ny
      check = (direction + 5) % 8
      moved = true
      break
    }
    if (!moved) return points
  }
  return points
}

function simplifyRing(points: Pixel[], epsilon: number): Pixel[] {
  if (points.length < 3) return points
  const simplified = rdp([...points, points[0]], epsilon)
  const last = simplified[simplified.length - 1]
  if (simplified.length > 1 && last.x === simplified[0].x && last.y === simplified[0].y) simplified.pop()
  return simplified
}

function rdp(points: Pixel[], epsilon: number): Pixel[] {
  if (points.length < 3) return points
  let farthest = 0
  let index = 0
  const end = points.length - 1
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicular(points[i], points[0], points[end])
    if (distance > farthest) {
      farthest = distance
      index = i
    }
  }
  if (farthest <= epsilon) return [points[0], points[end]]
  const left = rdp(points.slice(0, index + 1), epsilon)
  const right = rdp(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

function perpendicular(point: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / length
}
```

Create `src/core/ringDraft.ts`:

```ts
import { centroid } from './geometry'
import { destinationPoint, haversineM } from './projection'
import { LngLat, Vertex } from './types'

const toRad = (degrees: number) => (degrees * Math.PI) / 180
const toDeg = (radians: number) => (radians * 180) / Math.PI

export interface RingDraft {
  sourceName: string
  raw: Vertex[]
  unit: 'm'
  hasZ: false
  anchor: LngLat
}

export function ringToDraft(corners: LngLat[], sourceName: string): RingDraft | null {
  if (corners.length < 3) return null
  const raw = corners.map((corner) => offsetMetres(corners[0], corner))
  return {
    sourceName,
    raw,
    unit: 'm',
    hasZ: false,
    anchor: geographicCentroid(corners[0], raw),
  }
}

function geographicCentroid(origin: LngLat, points: Vertex[]): LngLat {
  const centre = centroid(points)
  const distance = Math.hypot(centre.x, centre.y)
  if (distance === 0) return { lng: origin.lng, lat: origin.lat }
  const bearing = (toDeg(Math.atan2(centre.x, centre.y)) + 360) % 360
  return destinationPoint(origin, distance, bearing)
}

function offsetMetres(origin: LngLat, point: LngLat): Vertex {
  const distance = haversineM(origin, point)
  if (distance === 0) return { x: 0, y: 0 }
  const φ1 = toRad(origin.lat)
  const φ2 = toRad(point.lat)
  const Δλ = toRad(point.lng - origin.lng)
  const east = Math.sin(Δλ) * Math.cos(φ2)
  const north = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const bearing = Math.atan2(east, north)
  return { x: distance * Math.sin(bearing), y: distance * Math.cos(bearing) }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/core/lasso.test.ts src/core/ringDraft.test.ts`

Expected: PASS. The red block is 5 by 5, so the fill has more than 8 pixels, the Moore walk starts at `(2, 2)`, and simplification leaves the four corners in clockwise order.

- [ ] **Step 5: Commit**

```bash
git add src/core/lasso.ts src/core/lasso.test.ts src/core/ringDraft.ts src/core/ringDraft.test.ts CHANGELOG.md
git commit -m "feat: trace a colour patch into a ground ring"
```

Changelog `### Added`:

```markdown
- Lasso traces pixels of a similar colour inside a radius into an ordered ring (`src/core/lasso.ts`).
```

---

### Task 7: Toolbox session

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/core/toolboxSession.ts`
- Test: `src/core/toolboxSession.test.ts`

**Interfaces:**
- Consumes: `beginMeasurement`, `addCorner`, `finishRuler`, `applyDoubleClick`, `measuredPolygonDraft` from `src/core/measurement.ts`; ruler, circle, square, and `ringToDraft`
- Produces:
  - `ToolId = 'polygon' | 'ruler' | 'lasso' | 'circle' | 'square'`
  - `ToolboxSession`
  - `closedSession(): ToolboxSession`
  - `toggleMenu(session: ToolboxSession): ToolboxSession`
  - `chooseTool(session: ToolboxSession, tool: ToolId): ToolboxSession`
  - `acceptClick(session: ToolboxSession, corner: LngLat): { session: ToolboxSession; sample: boolean }`
  - `acceptDoubleClick(session: ToolboxSession, corner: LngLat): ToolboxSession`
  - `acceptHover(session: ToolboxSession, corner: LngLat): ToolboxSession`
  - `deleteDraft(session: ToolboxSession): ToolboxSession`
  - `doneDraft(session: ToolboxSession): ToolboxSession`
  - `setLassoSettings(session: ToolboxSession, radiusPx: number, maxChannelDelta: number): ToolboxSession`
  - `setSquareMode(session: ToolboxSession, shape: BoxShape): ToolboxSession`
  - `commitLasso(session: ToolboxSession, corners: LngLat[], message: string | null): ToolboxSession`
  - `takeDraft(session: ToolboxSession): { session: ToolboxSession; draft: { sourceName: string; raw: Vertex[]; unit: 'm'; hasZ: false; anchor: LngLat } | null }`
  - `overlayOf(session: ToolboxSession): { corners: LngLat[]; closed: boolean }`

`LassoDraft` defaults are `radiusPx: 48` and `maxChannelDelta: 32`. `chooseTool` closes the popup. A second tool while a draft exists sets `blockedMessage` to `Delete the current drawing before choosing another tool.` and does not change the draft. Polygon double-click uses `applyDoubleClick`. Ruler double-click calls `finishDistanceRuler` and does not add a closing side. `sample` is true only when the active tool is Lasso and its status is `aim`. `takeDraft` returns null for a ruler and for any shape that is not ready. Source names are `Measured polygon` (via the existing helper), `Circle`, `Rectangle`, `Square`, and `Lasso`.

- [ ] **Step 1: Write the failing test**

Create `src/core/toolboxSession.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { destinationPoint } from './projection'
import {
  acceptClick,
  acceptDoubleClick,
  chooseTool,
  closedSession,
  commitLasso,
  deleteDraft,
  doneDraft,
  takeDraft,
  toggleMenu,
} from './toolboxSession'

const a = { lng: 10, lat: 45 }
const b = destinationPoint(a, 1000, 90)
const c = destinationPoint(b, 1000, 0)

describe('toolbox session', () => {
  it('opens the menu and starts Polygon without replacing a draft', () => {
    const open = toggleMenu(closedSession())
    expect(open.menuOpen).toBe(true)
    const polygon = chooseTool(open, 'polygon')
    expect(polygon.menuOpen).toBe(false)
    expect(polygon.tool).toBe('polygon')
    expect(polygon.polygon?.status).toBe('adding')
    const blocked = chooseTool(polygon, 'ruler')
    expect(blocked.tool).toBe('polygon')
    expect(blocked.blockedMessage).toBe('Delete the current drawing before choosing another tool.')
  })

  it('keeps Polygon on the current close and add path', () => {
    let session = chooseTool(closedSession(), 'polygon')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptClick(session, c).session
    session = acceptDoubleClick(session, c)
    expect(session.polygon?.status).toBe('polygon')
    const taken = takeDraft(session)
    expect(taken.draft?.sourceName).toBe('Measured polygon')
    expect(taken.session.tool).toBeNull()
  })

  it('finishes a ruler without an area draft', () => {
    let session = chooseTool(closedSession(), 'ruler')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptDoubleClick(session, b)
    expect(session.ruler?.status).toBe('done')
    expect(takeDraft(session).draft).toBeNull()
    expect(doneDraft(acceptClick(chooseTool(closedSession(), 'ruler'), a).session).ruler?.message).toBe(
      'Add at least two points.',
    )
  })

  it('asks the map to sample a lasso click and stores the ring', () => {
    const session = chooseTool(closedSession(), 'lasso')
    const click = acceptClick(session, a)
    expect(click.sample).toBe(true)
    const traced = commitLasso(click.session, [a, b, c], null)
    expect(traced.lasso?.status).toBe('ready')
    expect(takeDraft(traced).draft?.sourceName).toBe('Lasso')
    const missed = commitLasso(click.session, [], 'No feature found at that contrast.')
    expect(missed.lasso?.message).toBe('No feature found at that contrast.')
    expect(takeDraft(missed).draft).toBeNull()
  })

  it('clears a drawing without returning a draft', () => {
    const session = acceptClick(chooseTool(closedSession(), 'ruler'), a).session
    const cleared = deleteDraft(session)
    expect(cleared.tool).toBeNull()
    expect(cleared.ruler).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/core/toolboxSession.test.ts`

Expected: FAIL because `src/core/toolboxSession.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/toolboxSession.ts`:

```ts
import { beginCircle, circleRadiusM, circleRing, CircleDraft, setCircleCentre, setCircleEdge } from './circle'
import { beginLasso, commitLassoRing, LassoDraft, setLassoAim } from './lasso'
import {
  addCorner,
  applyDoubleClick,
  beginMeasurement,
  finishRuler,
  measuredPolygonDraft,
  Measurement,
} from './measurement'
import { ringToDraft, RingDraft } from './ringDraft'
import { addRulerCorner, beginRuler, finishDistanceRuler, Ruler } from './ruler'
import {
  beginSquare,
  BoxShape,
  setSquareOpposite,
  setSquareOrigin,
  setSquareShape,
  squareCorners,
  SquareDraft,
} from './square'
import { LngLat } from './types'

export type ToolId = 'polygon' | 'ruler' | 'lasso' | 'circle' | 'square'

export interface ToolboxSession {
  menuOpen: boolean
  tool: ToolId | null
  blockedMessage: string | null
  polygon: Measurement | null
  ruler: Ruler | null
  circle: CircleDraft | null
  square: SquareDraft | null
  lasso: LassoDraft | null
  hover: LngLat | null
}

export function closedSession(): ToolboxSession {
  return {
    menuOpen: false,
    tool: null,
    blockedMessage: null,
    polygon: null,
    ruler: null,
    circle: null,
    square: null,
    lasso: null,
    hover: null,
  }
}

export function toggleMenu(session: ToolboxSession): ToolboxSession {
  return { ...session, menuOpen: !session.menuOpen, blockedMessage: null }
}

export function chooseTool(session: ToolboxSession, tool: ToolId): ToolboxSession {
  if (session.tool && session.tool !== tool) {
    return { ...session, blockedMessage: 'Delete the current drawing before choosing another tool.' }
  }
  if (session.tool === tool) return { ...session, menuOpen: false, blockedMessage: null }
  const next = { ...closedSession(), tool, menuOpen: false }
  if (tool === 'polygon') next.polygon = beginMeasurement()
  if (tool === 'ruler') next.ruler = beginRuler()
  if (tool === 'circle') next.circle = beginCircle()
  if (tool === 'square') next.square = beginSquare()
  if (tool === 'lasso') next.lasso = beginLasso()
  return next
}

export function acceptClick(session: ToolboxSession, corner: LngLat): { session: ToolboxSession; sample: boolean } {
  if (session.tool === 'polygon' && session.polygon) {
    return { session: { ...session, polygon: addCorner(session.polygon, corner) }, sample: false }
  }
  if (session.tool === 'ruler' && session.ruler) {
    return { session: { ...session, ruler: addRulerCorner(session.ruler, corner) }, sample: false }
  }
  if (session.tool === 'circle' && session.circle) {
    const circle = session.circle.centre
      ? setCircleEdge(session.circle, corner)
      : setCircleCentre(session.circle, corner)
    return { session: { ...session, circle, hover: circle.status === 'ready' ? null : session.hover }, sample: false }
  }
  if (session.tool === 'square' && session.square) {
    const square = session.square.origin
      ? setSquareOpposite(session.square, corner)
      : setSquareOrigin(session.square, corner)
    return { session: { ...session, square, hover: square.status === 'ready' ? null : session.hover }, sample: false }
  }
  if (session.tool === 'lasso' && session.lasso?.status === 'aim') {
    return { session, sample: true }
  }
  return { session, sample: false }
}

export function acceptDoubleClick(session: ToolboxSession, corner: LngLat): ToolboxSession {
  if (session.tool === 'polygon' && session.polygon) {
    const polygon = applyDoubleClick(session.polygon, corner)
    if (!polygon) return deleteDraft(session)
    return { ...session, polygon }
  }
  if (session.tool === 'ruler' && session.ruler) {
    return { ...session, ruler: finishDistanceRuler(session.ruler) }
  }
  return session
}

export function acceptHover(session: ToolboxSession, corner: LngLat): ToolboxSession {
  if (session.circle?.status === 'centre' && session.circle.centre) return { ...session, hover: corner }
  if (session.square?.status === 'origin' && session.square.origin) return { ...session, hover: corner }
  return session
}

export function deleteDraft(session: ToolboxSession): ToolboxSession {
  return closedSession()
}

export function doneDraft(session: ToolboxSession): ToolboxSession {
  if (session.polygon) return { ...session, polygon: finishRuler(session.polygon) }
  if (session.ruler) return { ...session, ruler: finishDistanceRuler(session.ruler) }
  return session
}

export function setLassoSettings(session: ToolboxSession, radiusPx: number, maxChannelDelta: number): ToolboxSession {
  if (!session.lasso || session.lasso.status !== 'aim') return session
  return { ...session, lasso: setLassoAim(session.lasso, radiusPx, maxChannelDelta) }
}

export function setSquareMode(session: ToolboxSession, shape: BoxShape): ToolboxSession {
  if (!session.square) return session
  return { ...session, square: setSquareShape(session.square, shape) }
}

export function commitLasso(session: ToolboxSession, corners: LngLat[], message: string | null): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: commitLassoRing(session.lasso, corners, message), hover: null }
}

export function takeDraft(session: ToolboxSession): { session: ToolboxSession; draft: RingDraft | null } {
  if (session.polygon) {
    const measured = measuredPolygonDraft(session.polygon)
    if (!measured) return { session, draft: null }
    return { session: closedSession(), draft: measured }
  }
  if (session.circle?.status === 'ready' && session.circle.centre && session.circle.edge) {
    const radius = circleRadiusM(session.circle.centre, session.circle.edge)
    const draft = ringToDraft(circleRing(session.circle.centre, radius), 'Circle')
    return { session: draft ? closedSession() : session, draft }
  }
  if (session.square?.status === 'ready' && session.square.origin && session.square.opposite) {
    const corners = squareCorners(session.square.origin, session.square.opposite, session.square.shape)
    const name = session.square.shape === 'square' ? 'Square' : 'Rectangle'
    const draft = corners ? ringToDraft(corners, name) : null
    return { session: draft ? closedSession() : session, draft }
  }
  if (session.lasso?.status === 'ready') {
    const draft = ringToDraft(session.lasso.corners, 'Lasso')
    return { session: draft ? closedSession() : session, draft }
  }
  return { session, draft: null }
}

export function overlayOf(session: ToolboxSession): { corners: LngLat[]; closed: boolean } {
  if (session.polygon) {
    return { corners: session.polygon.corners, closed: session.polygon.status === 'polygon' }
  }
  if (session.ruler) return { corners: session.ruler.corners, closed: false }
  if (session.circle?.centre) {
    const edge = session.circle.edge ?? session.hover
    if (!edge) return { corners: [], closed: false }
    const radius = circleRadiusM(session.circle.centre, edge)
    if (radius < 1) return { corners: [], closed: false }
    return { corners: circleRing(session.circle.centre, radius), closed: true }
  }
  if (session.square?.origin) {
    const opposite = session.square.opposite ?? session.hover
    if (!opposite) return { corners: [], closed: false }
    return { corners: squareCorners(session.square.origin, opposite, session.square.shape) ?? [], closed: true }
  }
  if (session.lasso) return { corners: session.lasso.corners, closed: session.lasso.corners.length >= 3 }
  return { corners: [], closed: false }
}
```

The session imports `beginLasso`, `setLassoAim`, and `commitLassoRing`. Add them to `src/core/lasso.ts` in this same step, and extend `src/core/lasso.test.ts` with the cases below. Do not put React in that file.

```ts
export interface LassoDraft {
  status: 'aim' | 'ready'
  radiusPx: number
  maxChannelDelta: number
  corners: LngLat[]
  message: string | null
}

export function beginLasso(): LassoDraft {
  return { status: 'aim', radiusPx: 48, maxChannelDelta: 32, corners: [], message: null }
}

export function setLassoAim(draft: LassoDraft, radiusPx: number, maxChannelDelta: number): LassoDraft {
  if (draft.status !== 'aim') return draft
  return {
    ...draft,
    radiusPx: clamp(radiusPx, 8, 128),
    maxChannelDelta: clamp(maxChannelDelta, 0, 255),
  }
}

export function commitLassoRing(draft: LassoDraft, corners: LngLat[], message: string | null): LassoDraft {
  if (message || corners.length < 3) {
    return { ...draft, status: 'aim', corners: [], message: message ?? 'No feature found at that contrast.' }
  }
  return { ...draft, status: 'ready', corners, message: null }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
```

`lasso.ts` must import `LngLat` from `./types`. Add this test to `src/core/lasso.test.ts`:

```ts
it('clamps the aim settings and keeps a failed pick in aim', () => {
  const aim = setLassoAim(beginLasso(), 4, 400)
  expect(aim.radiusPx).toBe(8)
  expect(aim.maxChannelDelta).toBe(255)
  const missed = commitLassoRing(aim, [], 'No feature found at that contrast.')
  expect(missed.status).toBe('aim')
  expect(missed.message).toBe('No feature found at that contrast.')
})
```

Import `beginLasso`, `commitLassoRing`, and `setLassoAim` in that test.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/core/toolboxSession.test.ts src/core/lasso.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/toolboxSession.ts src/core/toolboxSession.test.ts src/core/lasso.ts src/core/lasso.test.ts CHANGELOG.md
git commit -m "feat: keep one Toolbox drawing at a time"
```

Changelog `### Added`:

```markdown
- The Toolbox session holds one Polygon, Ruler, Lasso, Circle, or Square draft (`src/core/toolboxSession.ts`).
```

---

### Task 8: Canvas sampling helpers

> **Brainstorming gate:** Do not start until the Task 1 spec is approved.

**Files:**
- Create: `src/map/sampleCanvas.ts`
- Test: `src/map/sampleCanvas.test.ts`

**Interfaces:**
- Consumes: `Pixel` and `Raster` from `src/core/lasso.ts`
- Produces:
  - `CanvasSampleError`
  - `flipBottomUp(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray`
  - `bufferPixel(cssX: number, cssY: number, canvasWidth: number, canvasHeight: number, clientWidth: number, clientHeight: number): Pixel`
  - `bufferToCss(pixel: Pixel, canvasWidth: number, canvasHeight: number, clientWidth: number, clientHeight: number): { x: number; y: number }`
  - `radiusInBuffer(radiusCss: number, canvasWidth: number, clientWidth: number): number`
  - `sampleBasemap(map: MapLibreMap): Promise<Raster>` where `MapLibreMap` has `getCanvas(): HTMLCanvasElement` and `once(type: 'idle', listener: () => void): void`

`readPixels` is bottom-up. `flipBottomUp` makes row 0 the top. `sampleBasemap` waits for `idle`, then uses the existing WebGL context. On failure it draws the canvas into an offscreen 2D canvas. A `SecurityError`, a missing context, or an empty canvas throws `CanvasSampleError` with message `This basemap does not allow colour sampling.`

- [ ] **Step 1: Write the failing test**

Create `src/map/sampleCanvas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bufferPixel, bufferToCss, flipBottomUp, radiusInBuffer } from './sampleCanvas'

describe('canvas sample geometry', () => {
  it('flips a bottom-up buffer so the first row is the top', () => {
    const data = new Uint8ClampedArray([1, 1, 1, 1, 2, 2, 2, 2])
    expect(Array.from(flipBottomUp(data, 1, 2))).toEqual([2, 2, 2, 2, 1, 1, 1, 1])
  })

  it('converts CSS pixels to buffer pixels and back', () => {
    expect(bufferPixel(10, 20, 200, 100, 100, 50)).toEqual({ x: 20, y: 40 })
    expect(bufferToCss({ x: 20, y: 40 }, 200, 100, 100, 50)).toEqual({ x: 10, y: 20 })
    expect(radiusInBuffer(48, 200, 100)).toBe(96)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/map/sampleCanvas.test.ts`

Expected: FAIL because `src/map/sampleCanvas.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/map/sampleCanvas.ts`:

```ts
import { Pixel, Raster } from '../core/lasso'

export class CanvasSampleError extends Error {
  constructor() {
    super('This basemap does not allow colour sampling.')
    this.name = 'CanvasSampleError'
  }
}

interface MapLibreMap {
  getCanvas(): HTMLCanvasElement
  once(type: 'idle', listener: () => void): void
}

export function flipBottomUp(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const row = width * 4
  for (let y = 0; y < height; y += 1) {
    const source = (height - 1 - y) * row
    out.set(data.subarray(source, source + row), y * row)
  }
  return out
}

export function bufferPixel(
  cssX: number,
  cssY: number,
  canvasWidth: number,
  canvasHeight: number,
  clientWidth: number,
  clientHeight: number,
): Pixel {
  return {
    x: Math.round(cssX * scale(canvasWidth, clientWidth)),
    y: Math.round(cssY * scale(canvasHeight, clientHeight)),
  }
}

export function bufferToCss(
  pixel: Pixel,
  canvasWidth: number,
  canvasHeight: number,
  clientWidth: number,
  clientHeight: number,
): { x: number; y: number } {
  return {
    x: (pixel.x * clientWidth) / canvasWidth,
    y: (pixel.y * clientHeight) / canvasHeight,
  }
}

export function radiusInBuffer(radiusCss: number, canvasWidth: number, clientWidth: number): number {
  return radiusCss * scale(canvasWidth, clientWidth)
}

export async function sampleBasemap(map: MapLibreMap): Promise<Raster> {
  await new Promise<void>((resolve) => map.once('idle', () => resolve()))
  const canvas = map.getCanvas()
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) throw new CanvasSampleError()
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return { width, height, data: flipBottomUp(new Uint8ClampedArray(pixels), width, height) }
  } catch (error) {
    if (error instanceof CanvasSampleError) throw error
    return sampleByCopy(canvas)
  }
}

function sampleByCopy(canvas: HTMLCanvasElement): Raster {
  try {
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    const context = copy.getContext('2d')
    if (!context) throw new CanvasSampleError()
    context.drawImage(canvas, 0, 0)
    const image = context.getImageData(0, 0, copy.width, copy.height)
    return { width: copy.width, height: copy.height, data: image.data }
  } catch {
    throw new CanvasSampleError()
  }
}

function scale(canvasSize: number, clientSize: number): number {
  return clientSize === 0 ? 1 : canvasSize / clientSize
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/map/sampleCanvas.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/map/sampleCanvas.ts src/map/sampleCanvas.test.ts CHANGELOG.md
git commit -m "feat: read basemap pixels for the lasso"
```

Changelog `### Added`:

```markdown
- Lasso can read the map canvas locally, or report that the basemap cannot be sampled (`src/map/sampleCanvas.ts`).
```

---

### Task 9: Toolbox popup and the Polygon tool

> **Brainstorming gate:** Do not start until Prompts 2, 3, and 4 have been run and the shape is agreed. Then implement. Do not restyle the sidebar.

**Files:**
- Create: `src/ui/Toolbox.tsx`
- Create: `src/ui/Toolbox.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/map/MapView.tsx` — add optional `onMapMouseMove`
- Modify: `src/test/MapViewStub.tsx` — no mouse-move control is required for this task

**Interfaces:**
- Consumes: `ToolboxSession`, `toggleMenu`, `chooseTool`, `acceptClick`, `acceptDoubleClick`, `doneDraft`, `deleteDraft`, `takeDraft`, `overlayOf`
- Produces: a `Toolbox` button, `aria-expanded`, and five tool buttons named `Polygon`, `Ruler`, `Lasso`, `Circle`, and `Square`

Polygon still renders `MeasureMenu`. There is no button named `Measure`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/Toolbox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { closedSession, chooseTool, toggleMenu, ToolboxSession } from '../core/toolboxSession'
import Toolbox from './Toolbox'

function Harness() {
  const [session, setSession] = useState<ToolboxSession>(closedSession())
  return (
    <Toolbox
      session={session}
      onToggle={() => setSession((current) => toggleMenu(current))}
      onChoose={(tool) => setSession((current) => chooseTool(current, tool))}
    />
  )
}

it('replaces Measure with a popup of five tools', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('button', { name: 'Measure' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  expect(screen.getByRole('button', { name: 'Polygon' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ruler' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lasso' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Circle' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Square' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Polygon' }))
  expect(screen.getByRole('button', { name: 'Toolbox' })).toHaveAttribute('aria-pressed', 'true')
})
```

In `src/App.test.tsx`, replace every `getByRole('button', { name: 'Measure' })` with a helper that opens the Toolbox and chooses Polygon:

```tsx
async function choosePolygon(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  await user.click(screen.getByRole('button', { name: 'Polygon' }))
}
```

The two existing measurement tests keep the same assertions about Done, segments, area, `Measured polygon`, and Delete.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/ui/Toolbox.test.tsx src/App.test.tsx`

Expected: FAIL because Toolbox does not exist and the app still says Measure.

- [ ] **Step 3: Write the popup**

Create `src/ui/Toolbox.tsx`:

```tsx
import { ToolId, ToolboxSession } from '../core/toolboxSession'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'polygon', label: 'Polygon' },
  { id: 'ruler', label: 'Ruler' },
  { id: 'lasso', label: 'Lasso' },
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
]

interface Props {
  session: ToolboxSession
  onToggle: () => void
  onChoose: (tool: ToolId) => void
}

export default function Toolbox({ session, onToggle, onChoose }: Props) {
  const active = session.tool !== null
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={session.menuOpen}
        aria-pressed={active}
        onClick={onToggle}
        className={`pressable pointer-events-auto min-h-11 rounded-lg border px-3 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.35)] ${
          active ? 'border-accent bg-accent-strong text-teal-50' : 'border-white/15 bg-surface/95 text-white'
        }`}
      >
        Toolbox
      </button>
      {session.menuOpen && (
        <div className="toolbox-pop pointer-events-auto flex w-full flex-col gap-2 rounded-xl border border-white/15 bg-surface/95 p-2 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              aria-pressed={session.tool === tool.id}
              onClick={() => onChoose(tool.id)}
              className={`pressable min-h-11 rounded-lg border px-3 text-left text-sm ${
                session.tool === tool.id
                  ? 'border-accent bg-accent-strong text-teal-50'
                  : 'border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {tool.label}
            </button>
          ))}
          {session.blockedMessage && (
            <p role="status" className="px-1 text-sm text-slate-300">
              {session.blockedMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

In `src/App.tsx`, replace the `measurement` state and the Measure handlers with this session. Remove the `measurement` import from `src/core/measurement`.

```tsx
const [session, setSession] = useState<ToolboxSession>(closedSession())

const handleMapClick = useCallback((event: { lngLat: { lng: number; lat: number }; originalEvent: { target: EventTarget | null } }) => {
  const target = event.originalEvent.target
  if (target instanceof Element && target.closest('.maplibregl-marker')) return
  const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
  setSession((current) => acceptClick(current, corner).session)
}, [])

const handleMapDoubleClick = useCallback((event: { lngLat: { lng: number; lat: number } }) => {
  const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
  setSession((current) => acceptDoubleClick(current, corner))
}, [])

const handleDone = useCallback(() => {
  setSession((current) => doneDraft(current))
}, [])

const handleDelete = useCallback(() => {
  setSession(closedSession())
}, [])

const handleAdd = useCallback(() => {
  setSession((current) => {
    const taken = takeDraft(current)
    if (!taken.draft) return current
    const draft = taken.draft
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sourceName: draft.sourceName,
        raw: draft.raw,
        unit: draft.unit,
        hasZ: draft.hasZ,
        selected: true,
        anchor: draft.anchor,
        colour: nextColour(prev.map((item) => item.colour)),
      },
    ])
    return taken.session
  })
}, [])
```

`onMapClick` is set when Polygon or Ruler status is `adding`, Circle status is `centre`, Square status is `origin`, or Lasso status is `aim`. `doubleClickZoom` is false in those same cases. `MeasurementOverlay` receives `overlayOf(session)`. `MeasureMenu` renders only when `session.polygon` is set, with `onDone={handleDone}`, `onDelete={handleDelete}`, and `onAdd={handleAdd}`. Replace the Measure button block with:

```tsx
<Toolbox
  session={session}
  onToggle={() => setSession((current) => toggleMenu(current))}
  onChoose={(tool) => setSession((current) => chooseTool(current, tool))}
/>
```

Keep that block in the existing top-left `pointer-events-none` wrapper. Clicks are accepted only while the active draft is still taking points: Polygon or Ruler `adding`, Circle `centre`, Square `origin`, Lasso `aim`. Double-click zoom stays off in those same statuses.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/ui/Toolbox.test.tsx src/App.test.tsx`

Expected: PASS, including the two measurement tests under the Polygon tool.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Toolbox.tsx src/ui/Toolbox.test.tsx src/App.tsx src/App.test.tsx CHANGELOG.md
git commit -m "feat: replace Measure with the Toolbox"
```

Changelog `### Changed`:

```markdown
- The map Measure button is now Toolbox. Polygon keeps the previous measure behaviour.
```

---

### Task 10: Ruler, circle, and square on the map

> **Brainstorming gate:** Do not start until the Task 1 spec is approved and Task 9 is committed.

**Files:**
- Create: `src/ui/RulerMenu.tsx`
- Create: `src/ui/ShapeMenu.tsx`
- Test: `src/ui/RulerMenu.test.tsx`
- Test: `src/ui/ShapeMenu.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/map/MapView.tsx`
- Modify: `src/test/MapViewStub.tsx`

**Interfaces:**
- Consumes: `rulerReadout`, `circleRadiusM`, `squareCorners`, `formatLength`, `formatArea`, `polygonAreaM2`, `ringToDraft`
- Produces: menus with `Done`, `Delete measurement`, `Add to list`, and a `Rectangle` / `Square` toggle named by those words

- [ ] **Step 1: Write the failing tests**

`src/ui/RulerMenu.test.tsx` renders a done ruler of two corners and expects `Segment 1`, `Total`, `Delete measurement`, and no `Area` or `Add to list`. An adding ruler of one corner, after Done, expects `Add at least two points.`

`src/ui/ShapeMenu.test.tsx` renders a ready circle and expects `Radius`, `Area`, and `Add to list`. It renders a square draft in `origin` and expects buttons named `Rectangle` and `Square`.

`src/App.test.tsx` adds:

```tsx
it('measures a ruler without adding it to the Polygon list', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  await user.click(screen.getByRole('button', { name: 'Ruler' }))
  await user.click(screen.getByTestId('map'))
  await user.click(screen.getByTestId('map'))
  expect(screen.getByText('Segment 1')).toBeInTheDocument()
  expect(screen.queryByText('Area')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Done' }))
  await user.click(screen.getByTestId('map'))
  expect(screen.getAllByText(/Segment/)).toHaveLength(1)
})
```

Add `onMapMouseMove` to `MapView` and forward it from the stub only if a test needs it. Circle preview is covered by `overlayOf` in Task 7, so the stub does not need a hover button in this task.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/ui/RulerMenu.test.tsx src/ui/ShapeMenu.test.tsx src/App.test.tsx`

Expected: FAIL because the menus are not rendered from App.

- [ ] **Step 3: Write the menus and wire them**

Create `src/ui/RulerMenu.tsx`:

```tsx
import { formatLength } from '../core/format'
import { Ruler, rulerReadout } from '../core/ruler'

interface Props {
  ruler: Ruler
  onDone: () => void
  onDelete: () => void
}

export default function RulerMenu({ ruler, onDone, onDelete }: Props) {
  const figures = rulerReadout(ruler)
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <div className="min-h-0 max-h-64 overflow-y-auto overscroll-contain">
        {figures.segments.length > 0 && (
          <ul className="flex flex-col gap-1">
            {figures.segments.map((segment) => (
              <li key={segment.label} className="flex items-baseline justify-between gap-3">
                <span className="text-slate-300">{segment.label}</span>
                <span className="tabular-nums">{formatLength(segment.metres)}</span>
              </li>
            ))}
            <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-white/10 pt-1 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatLength(figures.totalM)}</span>
            </li>
          </ul>
        )}
        {ruler.message && <p role="status" className="text-slate-300">{ruler.message}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {ruler.status === 'adding' && (
          <button type="button" onClick={onDone} className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105">
            Done
          </button>
        )}
        <button type="button" aria-label="Delete measurement" onClick={onDelete} className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-red-400 hover:bg-white/5">
          Delete
        </button>
      </div>
    </div>
  )
}
```

Create `src/ui/ShapeMenu.tsx`:

```tsx
import { formatArea, formatLength } from '../core/format'
import { BoxShape } from '../core/square'

interface Props {
  title: string
  lengthLabel: string
  lengthM: number | null
  areaM2: number | null
  message: string | null
  canAdd: boolean
  shape?: BoxShape
  onShape?: (shape: BoxShape) => void
  onAdd: () => void
  onDelete: () => void
}

export default function ShapeMenu({ title, lengthLabel, lengthM, areaM2, message, canAdd, shape, onShape, onAdd, onDelete }: Props) {
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <p className="font-medium">{title}</p>
      {shape && onShape && (
        <div className="flex gap-2">
          {(['rectangle', 'square'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={shape === option}
              onClick={() => onShape(option)}
              className={`pressable min-h-11 flex-1 rounded-lg border px-3 text-sm ${shape === option ? 'border-accent bg-accent-strong text-teal-50' : 'border-white/15 text-white'}`}
            >
              {option === 'rectangle' ? 'Rectangle' : 'Square'}
            </button>
          ))}
        </div>
      )}
      {lengthM !== null && (
        <p className="flex justify-between gap-3"><span>{lengthLabel}</span><span className="tabular-nums">{formatLength(lengthM)}</span></p>
      )}
      {areaM2 !== null && (
        <p className="flex justify-between gap-3"><span>Area</span><span className="tabular-nums">{formatArea(areaM2)}</span></p>
      )}
      {message && <p role="status" className="text-slate-300">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {canAdd && (
          <button type="button" onClick={onAdd} className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105">
            Add to list
          </button>
        )}
        <button type="button" aria-label="Delete measurement" onClick={onDelete} className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-red-400 hover:bg-white/5">
          Delete
        </button>
      </div>
    </div>
  )
}
```

For a ready circle, `lengthLabel` is `Radius` and `lengthM` is `circleRadiusM`. `areaM2` is `polygonAreaM2` of the metres from `ringToDraft`. `canAdd` is true only when `takeDraft` would return a draft; call `handleAdd` from Task 9. For a square, `lengthLabel` is `Side`, and `lengthM` is the longer side of `squareCorners` (the first-to-second and first-to-fourth distances). Pass `shape={session.square.shape}` and `onShape={(shape) => setSession((current) => setSquareMode(current, shape))}`.

`MapView` gains `onMapMouseMove?: (event: MapLayerMouseEvent) => void` and passes it to `onMouseMove`. App calls `acceptHover` with the event lngLat.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/ui/RulerMenu.test.tsx src/ui/ShapeMenu.test.tsx src/App.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/RulerMenu.tsx src/ui/RulerMenu.test.tsx src/ui/ShapeMenu.tsx src/ui/ShapeMenu.test.tsx src/App.tsx src/App.test.tsx src/map/MapView.tsx CHANGELOG.md
git commit -m "feat: show ruler, circle, and square on the map"
```

Changelog `### Added`:

```markdown
- Ruler, Circle, and Square can be chosen from the Toolbox. Circle and Square can be added to the Polygon list.
```

---

### Task 11: Lasso on the map

> **Brainstorming gate:** Do not start until the Task 1 spec is approved and Task 10 is committed.

**Files:**
- Create: `src/ui/LassoMenu.tsx`
- Test: `src/ui/LassoMenu.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `setLassoSettings`, `commitLasso`, `sampleBasemap`, `bufferPixel`, `bufferToCss`, `radiusInBuffer`, `traceContrast`, `CanvasSampleError`
- Produces: number fields named `Radius` and `Contrast`, default values 48 and 32

- [ ] **Step 1: Write the failing test**

`LassoMenu.test.tsx` expects spinbuttons or number fields named `Radius` and `Contrast`, the sentence `Click a feature on the map.`, and no Add to list while status is `aim`. A ready draft with three corners expects Add to list.

`App.test.tsx`:

```tsx
it('tells the user when the basemap cannot be sampled', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  await user.click(screen.getByRole('button', { name: 'Lasso' }))
  expect(screen.getByLabelText('Radius')).toHaveValue(48)
  expect(screen.getByLabelText('Contrast')).toHaveValue(32)
  await user.click(screen.getByTestId('map'))
  expect(await screen.findByRole('status')).toHaveTextContent('This basemap does not allow colour sampling.')
  expect(screen.queryByRole('switch', { name: 'Lasso' })).not.toBeInTheDocument()
})
```

The stub map has no `getMap`, so App must take that error path.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/ui/LassoMenu.test.tsx src/App.test.tsx`

Expected: FAIL because Lasso has no menu.

- [ ] **Step 3: Write the menu and the click sampler**

Create `src/ui/LassoMenu.tsx`:

```tsx
import { LassoDraft } from '../core/lasso'

interface Props {
  lasso: LassoDraft
  onSettings: (radiusPx: number, maxChannelDelta: number) => void
  onAdd: () => void
  onDelete: () => void
}

export default function LassoMenu({ lasso, onSettings, onAdd, onDelete }: Props) {
  const aiming = lasso.status === 'aim'
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <label className="flex items-center justify-between gap-3">
        Radius
        <input
          aria-label="Radius"
          type="number"
          min={8}
          max={128}
          inputMode="numeric"
          disabled={!aiming}
          value={lasso.radiusPx}
          onChange={(event) => onSettings(Number(event.target.value), lasso.maxChannelDelta)}
          className="min-h-11 w-24 rounded-lg border border-white/10 bg-black/30 px-3 text-base text-slate-100"
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        Contrast
        <input
          aria-label="Contrast"
          type="number"
          min={0}
          max={255}
          inputMode="numeric"
          disabled={!aiming}
          value={lasso.maxChannelDelta}
          onChange={(event) => onSettings(lasso.radiusPx, Number(event.target.value))}
          className="min-h-11 w-24 rounded-lg border border-white/10 bg-black/30 px-3 text-base text-slate-100"
        />
      </label>
      {aiming && !lasso.message && <p className="text-slate-300">Click a feature on the map.</p>}
      {lasso.message && <p role="status" className="text-slate-300">{lasso.message}</p>}
      <div className="flex flex-wrap gap-2">
        {lasso.status === 'ready' && (
          <button type="button" onClick={onAdd} className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105">
            Add to list
          </button>
        )}
        <button type="button" aria-label="Delete measurement" onClick={onDelete} className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-red-400 hover:bg-white/5">
          Delete
        </button>
      </div>
    </div>
  )
}
```

Replace the Task 9 map click handler when `acceptClick` returns `sample: true`. Ignore marker clicks first. If `mapRef.current` has no `getMap`, commit the basemap sentence. Otherwise sample, trace, and commit:

```tsx
const CANNOT_SAMPLE = 'This basemap does not allow colour sampling.'

async function sampleLasso(session: ToolboxSession, point: { x: number; y: number }) {
  const map = mapRef.current && 'getMap' in mapRef.current ? mapRef.current.getMap() : null
  if (!map || !session.lasso) {
    setSession(commitLasso(session, [], CANNOT_SAMPLE))
    return
  }
  try {
    const raster = await sampleBasemap(map)
    const canvas = map.getCanvas()
    const seed = bufferPixel(point.x, point.y, raster.width, raster.height, canvas.clientWidth, canvas.clientHeight)
    const radius = radiusInBuffer(session.lasso.radiusPx, raster.width, canvas.clientWidth)
    const ring = traceContrast(raster, seed, radius, session.lasso.maxChannelDelta)
    if (!ring) {
      setSession(commitLasso(session, [], 'No feature found at that contrast.'))
      return
    }
    const corners = ring.map((pixel) => {
      const css = bufferToCss(pixel, raster.width, raster.height, canvas.clientWidth, canvas.clientHeight)
      const lngLat = map.unproject([css.x, css.y])
      return { lng: lngLat.lng, lat: lngLat.lat }
    })
    setSession(commitLasso(session, corners, null))
  } catch {
    setSession(commitLasso(session, [], CANNOT_SAMPLE))
  }
}
```

`onSettings` calls `setLassoSettings`. Add to list uses `takeDraft`, which names the row `Lasso`. The stub map has no `getMap`, so the App test hits `CANNOT_SAMPLE`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/ui/LassoMenu.test.tsx src/App.test.tsx src/core/lasso.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/LassoMenu.tsx src/ui/LassoMenu.test.tsx src/App.tsx src/App.test.tsx CHANGELOG.md
git commit -m "feat: pick a map feature with the lasso"
```

Changelog `### Added`:

```markdown
- Lasso picks a same-colour patch around a click and can add that outline to the Polygon list.
```

---

### Task 11b: Popup motion

> **Brainstorming gate:** Do not start until Prompts 6's `emil-design-eng` table is done. Then run the `/animate` prompt. This task is the code for that prompt.

The heading stays Task 11 in execution order after the Lasso task. The id `11b` keeps the Lasso task's number stable.

**Files:**
- Modify: `src/index.css`
- Modify: `src/ui/Toolbox.tsx` — the popup already has `toolbox-pop` from Task 9

- [ ] **Step 1: Add the motion**

Append to `src/index.css`:

```css
.toolbox-pop {
  animation: toolbox-pop 160ms ease-out;
}

@keyframes toolbox-pop {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toolbox-pop {
    animation: none;
  }
}
```

- [ ] **Step 2: Run review and the suite**

Run Prompt 6's `review-animations` message, then:

```bash
npm run test
npm run lint
npm run typecheck
```

Expected: all pass. The review either approves 160ms or names one replacement. Apply that replacement if it still uses only opacity and transform.

- [ ] **Step 3: Commit**

```bash
git add src/index.css CHANGELOG.md
git commit -m "feat: open the Toolbox popup in 160ms"
```

Changelog `### Added`:

```markdown
- The Toolbox popup fades and rises 8px in 160ms, and snaps when reduced motion is on.
```

---

### Task 12: Polish, audit, and the manual map check

> **Brainstorming gate:** Do not start until Tasks 9–11b are committed. Run Prompts 7 and 8. Do not treat this task as a redesign.

**Files:**
- Modify: only files the polish, audit, harden, or document prompts must touch
- Modify: `DESIGN.md` via `/impeccable document`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run Prompt 7 in four separate messages**

Order: polish, audit, harden, document. One skill each. Then run Prompt 6's `mobile-native` message if it was not already run.

- [ ] **Step 2: Run the full checks**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: each command exits 0.

- [ ] **Step 3: Run Prompt 8 on http://localhost:5173/**

Record the eight checks. The Polygon check is the regression for the old Measure behaviour. The snapshot must show the white line and not the popup.

- [ ] **Step 4: Commit any fixes from those passes**

```bash
git add -u
git commit -m "fix: polish the Toolbox after the map check"
```

Skip the commit if the checks changed nothing.

---

## Self-review

Spec coverage against the request:

| Request | Where it is implemented |
| --- | --- |
| Polygon keeps current Measure behaviour | Task 7 `applyDoubleClick` / `measuredPolygonDraft`; Task 9 reuses `MeasureMenu` |
| Ruler, many clicks, distance only | Task 3 and Task 10 |
| Lasso, colour contrast and a radius | Task 6, Task 8, Task 11 |
| Circle | Task 4 and Task 10 |
| Square and rectangle | Task 5 and Task 10 |
| Popup on the map, Measure removed | Task 9 |
| UI UX Pro Max, Impeccable, Emil | Prompt workflow, Prompts 2–7 |
| `/brainstorming` before implementation | Prompt 1 and the gate on Tasks 2–12 |
| Subagent model limit | Global Constraints |

Placeholder scan: task code, commands, and expected results are written in full. Prompt 8 is a manual script, not a code step.

Type names used later match the Produces lines: `ToolboxSession`, `chooseTool`, `acceptClick`, `traceContrast`, `ringToDraft`, `sampleBasemap`, `CanvasSampleError`.
