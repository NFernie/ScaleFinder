# Wf schematic panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Wf schematic panel so its title is Wf Schematic, the 3D view resizes with a locked ratio, zoom and orbit stay inside the view, and Explode opens the four ranks on a sphere with accumulated labels.

**Architecture:** `sceneAt` in `src/core/wfSchematic.ts` owns positions and `showLabel`. A pure frame helper owns resize and zoom-step math. The panel owns chrome. The Three.js view applies `sceneAt`, shows the chosen names, and runs orbit and zoom. Mesh builders stay as they are. UI skills run one per task, after the core tests, and a written class lock beats a skill that wants a new palette.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, Vitest, Testing Library, `three` `^0.186.1` only inside `src/ui/WfSchematicView.tsx`, `OrbitControls` from `three/addons/controls/OrbitControls.js`.

## Global Constraints

- Title text is `Wf Schematic`. The teal subtitle is removed. The place name stays on the pin and is absent from the panel.
- Caption stays exactly: `Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.`
- Close and Escape close the panel and return focus to `#wf-schematic-pin`.
- The view keeps the width-to-height ratio of its first layout. The handle is on the top-left. The panel's bottom-right stays fixed. Title, caption, Close, and Explode stay the same type size.
- Start size is 14rem tall (224px) and 328px wide (the 22rem panel minus 12px padding on each side). If that box would cross the inset, the start size is the largest box of that ratio which fits, and that fitted box is the minimum.
- The panel stays at least 0.75rem (12px) inside the map frame, and clear of the safe area when that inset is larger.
- View size lasts until the page reloads. Closing the panel unmounts the view and releases the WebGL context.
- Zoom-in sits above zoom-out, top-right of the view, 29×29px, matching MapLibre's zoom buttons. The wheel uses the same step. There is no compass.
- Each zoom step multiplies distance by `1.25` (out) or `1 / 1.25` (in). Distance clamps to 2 and 60 schematic units.
- The camera starts at `(6.5, 5.5, 7.5)` looking at `(0, 0.4, 0.6)`. That look-at stays fixed. Dragging orbits. There is no pan and no glide.
- Pointer and wheel events on the view do not pan or zoom the map.
- Explode clamps to 0–1. Band edges snap: element-complex progress is 0 at `t = 0` and 1 at `t ≥ 1/3`; element-set progress is 0 at `t ≤ 1/3` and 1 at `t ≥ 2/3`; element progress is 0 at `t ≤ 2/3` and 1 at `t = 1`. Inside a band, progress is linear with the thumb.
- Full distances from the parent's exploded position: element complex 8, element set 6, element 5. The element complex set does not move.
- One child uses direction `(0, 1, 0)`. Two children use `(1, 0, 0)` then `(-1, 0, 0)` in id order. Three or more use the Fibonacci sphere in the spec.
- `showLabel` is on for the element complex set at 0, for both complexes when `t > 0`, for the three element sets when `t > 1/3`, and for `e-ridge-r-0`, `e-mouth-0`, and `e-channel` when `t > 2/3`. Names that turn on stay on. Other ridges and mouth bars stay unlabelled.
- Beach-ridge, mouth-bar, channel, and water-line meshes stay as they are. `three` is not imported from `src/core/`.
- The pin stays inside the snapshot. The panel, slider, zoom stack, and resize handle stay outside it.
- Explode, zoom, and camera angle reset when the panel opens. Nothing is stored after the page closes.
- Panel chrome uses Panel `#131c2e` at 95% (`bg-surface-raised/95`), 12px corners, white 15% border, Float shadow `0 2px 8px rgb(0 0 0 / 0.35)`, and `.toolbox-pop` (160ms ease-out). Close and the resize handle are at least 44px. Focus is `#5eead4`, 2px, offset 2px. Press uses `.pressable` (scale 0.97, 120ms ease-out). Reduced motion snaps.
- Diagram fills stay inside the canvas: gold beach ridges, green mouth bars, orange channel, blue water line at 30% opacity.
- Do not add shadcn, a second accent, a light theme, GSAP, or a motion library. Do not run `search.py`. Do not run img2threejs or the threejs geometry skills. Do not ease Explode, orbit, or zoom.
- Subagents use a model whose name starts with `cursor-grok-`, `grok-`, or `composer-`. Pass `model` explicitly. One skill per task. Read `PRODUCT.md`, `DESIGN.md`, and `docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md` before any UI task.
- `PRODUCT.md` and `ScaleFinderPurpose.md` stay unchanged. `DESIGN.md`'s `### Wf schematic pin` subsection is replaced only in Task 14, using the paragraph in the spec.

## File structure

- `src/core/wfSchematic.ts` — positions and `showLabel`. No DOM.
- `src/core/wfSchematic.test.ts` — bands, distances, directions, labels, clamp. Existing nested-pose tests stay.
- `src/ui/schematicFrame.ts` — resize clamp and zoom-step math. No React.
- `src/ui/schematicFrame.test.ts` — those two functions.
- `src/ui/WfSchematicPanel.tsx` — title, caption, Close, slider, text list, handle, zoom buttons.
- `src/ui/WfSchematicPanel.test.tsx` — dialog name, caption, text list, focus, resize key.
- `src/ui/WfSchematicView.tsx` — meshes unchanged, labels follow `showLabel`, orbit, wheel and button zoom.
- `src/App.tsx` — remembers the view size across close and reopen.
- `src/index.css` — only if Task 10 adds a label fade. Do not add a second motion system.
- `DESIGN.md` — Task 14 only.
- `src/map/WfSchematicPin.tsx` — unchanged.

---

### Task 1: Sphere layout and labels

**Files:**
- Modify: `src/core/wfSchematic.ts` (`PlacedBody`, delete `RANK_LIFT`, replace `sceneAt`)
- Test: `src/core/wfSchematic.test.ts` (replace the test named `separates ranks along Y and clamps explode`)

**Interfaces:**
- Consumes: existing `BODIES`, `Rank`, `SceneBody`, `nested`
- Produces: `sceneAt(explode: number): PlacedBody[]` where `PlacedBody` adds `showLabel: boolean`. Positions at `0` equal `nested`. Later tasks read `showLabel` and `position` only.

This task is geometry. Do not read or run UI UX Pro Max, Impeccable, or Emil skills.

- [ ] **Step 1: Replace the Y-lift test with the failing sphere tests**

Delete the test `separates ranks along Y and clamps explode`. Add this test in its place:

```ts
it('opens ranks on a sphere and accumulates one label per element kind', () => {
  const at = (t: number) => sceneAt(t)
  const byId = (bodies: ReturnType<typeof sceneAt>, id: string) => bodies.find((body) => body.id === id)!
  const length = (point: { x: number; y: number; z: number }) =>
    Math.hypot(point.x, point.y, point.z)
  const delta = (
    bodies: ReturnType<typeof sceneAt>,
    childId: string,
    parentId: string,
  ) => {
    const child = byId(bodies, childId).position
    const parent = byId(bodies, parentId).position
    return {
      x: child.x - parent.x,
      y: child.y - parent.y,
      z: child.z - parent.z,
    }
  }
  const apart = (bodies: ReturnType<typeof sceneAt>, childId: string, parentId: string) =>
    length(delta(bodies, childId, parentId))

  const nested = at(0)
  for (const body of nested) {
    expect(body.position).toEqual(body.nested)
  }
  expect(nested.filter((body) => body.showLabel).map((body) => body.id)).toEqual(['ecs'])

  const third = at(1 / 3)
  const root = byId(third, 'ecs').position
  expect(byId(third, 'ec-lobe').position).toEqual({ x: root.x + 8, y: root.y, z: root.z })
  expect(byId(third, 'ec-mouth').position).toEqual({ x: root.x - 8, y: root.y, z: root.z })
  const nestedSet = delta(nested, 'es-ridge-l', 'ec-lobe')
  const heldSet = delta(third, 'es-ridge-l', 'ec-lobe')
  expect(heldSet.x).toBeCloseTo(nestedSet.x, 6)
  expect(heldSet.y).toBeCloseTo(nestedSet.y, 6)
  expect(heldSet.z).toBeCloseTo(nestedSet.z, 6)
  expect(third.filter((body) => body.rank === 'element-set' && body.showLabel)).toHaveLength(0)
  expect(third.filter((body) => body.rank === 'element-complex' && body.showLabel).map((body) => body.id).sort()).toEqual([
    'ec-lobe',
    'ec-mouth',
  ])

  const twoThirds = at(2 / 3)
  expect(apart(twoThirds, 'es-ridge-l', 'ec-lobe')).toBeCloseTo(6, 6)
  expect(apart(twoThirds, 'es-ridge-r', 'ec-lobe')).toBeCloseTo(6, 6)
  expect(apart(twoThirds, 'es-mouth', 'ec-mouth')).toBeCloseTo(6, 6)
  const nestedRidge = delta(nested, 'e-ridge-r-0', 'es-ridge-r')
  const heldRidge = delta(twoThirds, 'e-ridge-r-0', 'es-ridge-r')
  expect(heldRidge.x).toBeCloseTo(nestedRidge.x, 6)
  expect(heldRidge.y).toBeCloseTo(nestedRidge.y, 6)
  expect(heldRidge.z).toBeCloseTo(nestedRidge.z, 6)
  expect(twoThirds.filter((body) => body.rank === 'element' && body.showLabel)).toHaveLength(0)
  expect(twoThirds.filter((body) => body.showLabel && body.rank === 'element-set')).toHaveLength(3)

  const full = at(1)
  for (const body of full.filter((item) => item.rank === 'element')) {
    expect(apart(full, body.id, body.parentId!)).toBeCloseTo(5, 6)
  }
  expect(apart(full, 'e-channel', 'ec-mouth')).toBeCloseTo(5, 6)
  for (const body of full.filter((item) => item.kind === 'mouth-bar')) {
    expect(apart(full, body.id, 'es-mouth')).toBeCloseTo(5, 6)
  }
  const mouths = full.filter((body) => body.parentId === 'es-mouth')
  const dirs = mouths.map((body) => delta(full, body.id, 'es-mouth'))
  for (const dir of dirs) expect(length(dir)).toBeCloseTo(5, 6)
  const unique = new Set(dirs.map((dir) => `${dir.x.toFixed(4)},${dir.y.toFixed(4)},${dir.z.toFixed(4)}`))
  expect(unique.size).toBe(mouths.length)
  expect(full.filter((body) => body.rank === 'element' && body.showLabel).map((body) => body.id).sort()).toEqual([
    'e-channel',
    'e-mouth-0',
    'e-ridge-r-0',
  ])
  expect(full.map((body) => body.id)).toEqual(nested.map((body) => body.id))
  expect(full.map((body) => body.parentId)).toEqual(nested.map((body) => body.parentId))
  expect(at(-1)).toEqual(at(0))
  expect(at(2)).toEqual(at(1))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/wfSchematic.test.ts`

Expected: FAIL because `showLabel` is missing and the complexes are not 8 units apart on X.

- [ ] **Step 3: Replace the lift with the sphere**

Delete `RANK_LIFT`. Add `showLabel` to `PlacedBody`. Replace `sceneAt` with the functions below. Leave every mesh constant, `beachRidgeStations`, `beachRidgeRing`, `channelSpan`, and `BODIES` unchanged.

```ts
export interface PlacedBody extends SceneBody {
  position: { x: number; y: number; z: number }
  showLabel: boolean
}

const RANK_DISTANCE: Record<Rank, number> = {
  'element-complex-set': 0,
  'element-complex': 8,
  'element-set': 6,
  element: 5,
}

function bandProgress(rank: Rank, t: number): number {
  if (rank === 'element-complex-set') return 0
  if (rank === 'element-complex') {
    if (t <= 0) return 0
    if (t >= 1 / 3) return 1
    return t / (1 / 3)
  }
  if (rank === 'element-set') {
    if (t <= 1 / 3) return 0
    if (t >= 2 / 3) return 1
    return (t - 1 / 3) / (1 / 3)
  }
  if (t <= 2 / 3) return 0
  if (t >= 1) return 1
  return (t - 2 / 3) / (1 / 3)
}

function labelVisible(body: SceneBody, t: number): boolean {
  if (body.rank === 'element-complex-set') return true
  if (body.rank === 'element-complex') return t > 0
  if (body.rank === 'element-set') return t > 1 / 3
  return t > 2 / 3 && (body.id === 'e-ridge-r-0' || body.id === 'e-mouth-0' || body.id === 'e-channel')
}

function siblingDirection(id: string, siblingIds: string[]): { x: number; y: number; z: number } {
  const ids = [...siblingIds].sort()
  const index = ids.indexOf(id)
  const count = ids.length
  if (count <= 1) return { x: 0, y: 1, z: 0 }
  if (count === 2) return index === 0 ? { x: 1, y: 0, z: 0 } : { x: -1, y: 0, z: 0 }
  const y = 1 - (2 * index + 1) / count
  const radius = Math.sqrt(1 - y * y)
  const theta = Math.PI * (3 - Math.sqrt(5)) * index
  return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius }
}

export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const byId = new Map(BODIES.map((body) => [body.id, body]))
  const children = new Map<string, string[]>()
  for (const body of BODIES) {
    if (!body.parentId) continue
    const list = children.get(body.parentId) ?? []
    list.push(body.id)
    children.set(body.parentId, list)
  }
  const placed = new Map<string, { x: number; y: number; z: number }>()
  const place = (id: string): { x: number; y: number; z: number } => {
    const cached = placed.get(id)
    if (cached) return cached
    const body = byId.get(id)!
    if (!body.parentId) {
      const position = { x: body.nested.x, y: body.nested.y, z: body.nested.z }
      placed.set(id, position)
      return position
    }
    const parent = place(body.parentId)
    const parentBody = byId.get(body.parentId)!
    const progress = bandProgress(body.rank, t)
    const direction = siblingDirection(body.id, children.get(body.parentId) ?? [])
    const distance = RANK_DISTANCE[body.rank]
    const step = {
      x: (1 - progress) * (body.nested.x - parentBody.nested.x) + progress * direction.x * distance,
      y: (1 - progress) * (body.nested.y - parentBody.nested.y) + progress * direction.y * distance,
      z: (1 - progress) * (body.nested.z - parentBody.nested.z) + progress * direction.z * distance,
    }
    const position = { x: parent.x + step.x, y: parent.y + step.y, z: parent.z + step.z }
    placed.set(id, position)
    return position
  }
  return BODIES.map((body) => ({
    ...body,
    position: place(body.id),
    showLabel: labelVisible(body, t),
  }))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core/wfSchematic.test.ts`

Expected: PASS, including the existing mouth-bar, ridge, and channel tests, because `sceneAt(0)` still returns `nested`.

- [ ] **Step 5: Commit**

```bash
git add src/core/wfSchematic.ts src/core/wfSchematic.test.ts
git commit -m "feat(core): explode the Wf schematic on a sphere by rank"
```

---

### Task 2: Frame and zoom math

**Files:**
- Create: `src/ui/schematicFrame.ts`
- Test: `src/ui/schematicFrame.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces:

```ts
export const FRAME_START = { width: 328, height: 224 }
export const FRAME_INSET_PX = 12
export const FRAME_KEY_STEP_PX = 16
export const ZOOM_MIN = 2
export const ZOOM_MAX = 60
export const ZOOM_STEP = 1.25

export function fitSchematicFrame(input: {
  width: number
  ratio: number
  minWidth: number
  maxWidth: number
  maxHeight: number
}): { width: number; height: number }

export function zoomDistance(distance: number, direction: 'in' | 'out'): number
```

No UI skills. This file has no React and no `three`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { fitSchematicFrame, FRAME_START, zoomDistance } from './schematicFrame'

describe('schematicFrame', () => {
  const ratio = FRAME_START.width / FRAME_START.height

  it('grows with the ratio and stops at the start size and the inset', () => {
    expect(fitSchematicFrame({ width: 400, ratio, minWidth: 328, maxWidth: 800, maxHeight: 600 })).toEqual({
      width: 400,
      height: 400 / ratio,
    })
    expect(fitSchematicFrame({ width: 100, ratio, minWidth: 328, maxWidth: 800, maxHeight: 600 })).toEqual({
      width: 328,
      height: 224,
    })
    const capped = fitSchematicFrame({ width: 900, ratio, minWidth: 328, maxWidth: 500, maxHeight: 600 })
    expect(capped.width).toBe(500)
    expect(capped.height).toBeCloseTo(500 / ratio)
    const short = fitSchematicFrame({ width: 900, ratio, minWidth: 328, maxWidth: 800, maxHeight: 200 })
    expect(short.height).toBeCloseTo(200)
    expect(short.width).toBeCloseTo(200 * ratio)
  })

  it('steps zoom between 2 and 60', () => {
    expect(zoomDistance(10, 'in')).toBeCloseTo(10 / 1.25)
    expect(zoomDistance(10, 'out')).toBeCloseTo(12.5)
    expect(zoomDistance(2, 'in')).toBe(2)
    expect(zoomDistance(60, 'out')).toBe(60)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/schematicFrame.test.ts`

Expected: FAIL because `./schematicFrame` cannot be resolved.

- [ ] **Step 3: Write the helper**

```ts
export const FRAME_START = { width: 328, height: 224 }
export const FRAME_INSET_PX = 12
export const FRAME_KEY_STEP_PX = 16
export const ZOOM_MIN = 2
export const ZOOM_MAX = 60
export const ZOOM_STEP = 1.25

export function fitSchematicFrame(input: {
  width: number
  ratio: number
  minWidth: number
  maxWidth: number
  maxHeight: number
}): { width: number; height: number } {
  const minHeight = input.minWidth / input.ratio
  let width = Math.max(input.width, input.minWidth)
  let height = width / input.ratio
  if (width > input.maxWidth) {
    width = input.maxWidth
    height = width / input.ratio
  }
  if (height > input.maxHeight) {
    height = input.maxHeight
    width = height * input.ratio
  }
  if (width < input.minWidth || height < minHeight) {
    return { width: input.minWidth, height: minHeight }
  }
  return { width, height }
}

export function zoomDistance(distance: number, direction: 'in' | 'out'): number {
  const next = direction === 'in' ? distance / ZOOM_STEP : distance * ZOOM_STEP
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/schematicFrame.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/schematicFrame.ts src/ui/schematicFrame.test.ts
git commit -m "feat(ui): clamp the Wf schematic frame and zoom step"
```

---

### Task 3: UI styling report

**Files:**
- Read: `.cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md`
- Read: `DESIGN.md` (`### Wf schematic pin` and the tokens above it)
- Read: `src/ui/WfSchematicPanel.tsx`, `src/index.css` (`.pressable`, `.toolbox-pop`)
- Modify: none

**Interfaces:**
- Consumes: the class lock in Global Constraints
- Produces: a report only. Task 6 uses the lock, not a new palette from this report.

**Skill:** UI UX Pro Max `ui-styling`. You may edit: no.

Prompt to follow after reading the skill:

```text
/ui-styling Report Tailwind classes for the Wf schematic panel only.
Follow DESIGN.md and docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md.
Panel: bg-surface-raised/95, rounded-xl, border-white/15, shadow 0 2px 8px rgb(0 0 0 / 0.35), toolbox-pop.
Close and the resize handle: min 44px, pressable, focus ring #5eead4 2px offset 2px.
Zoom stack: 29px buttons, zoom in above zoom out, white MapLibre-style group, Focus teal ring.
Do not add shadcn. Do not change the palette. Do not edit files.
```

- [ ] **Step 1: Read the skill and write the report**

List the classes you would use for the title, caption, handle, zoom stack, and text list. If a suggestion adds a second accent, a light theme, or shadcn, reject it in the report and keep the Global Constraints lock.

- [ ] **Step 2: Do not commit**

The deliverable is the report in the task message.

---

### Task 4: Shape the panel

**Files:**
- Read: `.cursor/skills/impeccable/SKILL.md` and `.cursor/skills/impeccable/reference/shape.md`
- Read: the approved spec
- Modify: none

**Interfaces:**
- Consumes: Task 3's report and the spec
- Produces: a one-page brief Task 6 must follow. No new behaviour.

**Skill:** `/impeccable shape`. You may edit: no. This is an Operate surface. The design is already approved. Do not interview and do not ask the user questions.

Prompt:

```text
/impeccable shape the Wf schematic panel.
The approved spec is docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md.
Confirm the title, the top-left resize handle, the top-right zoom stack, the bottom Explode slider, the text fallback, and the bottom-right anchor.
States: closed, open nested, open exploded, WebGL unavailable, resize at minimum, resize at the map inset, zoom at 2 and at 60.
Do not add a feature. Do not edit files. Return the brief only.
```

- [ ] **Step 1: Write the brief**

Cover layout, the WebGL-off state, keyboard (Enter on the pin, Escape, slider keys, handle arrow keys, zoom buttons), and the phone inset. Flag any sentence that disagrees with the spec. The spec wins.

- [ ] **Step 2: Do not commit**

---

### Task 5: Critique the brief

**Files:**
- Read: `.cursor/skills/impeccable/reference/critique.md`
- Modify: none

**Interfaces:**
- Consumes: Task 4's brief
- Produces: a hierarchy note. Task 6 still uses the spec if the critique disagrees.

**Skill:** `/impeccable critique`. You may edit: no.

Prompt:

```text
/impeccable critique the Wf schematic panel brief from the previous task.
Order is title, caption, view, then Explode. The map stays the primary surface.
Do not restyle. Do not edit files. Report hierarchy problems only.
```

- [ ] **Step 1: Write the critique**

A short list. If it asks for a new colour, a second title, or motion on Explode, reject that item.

- [ ] **Step 2: Do not commit**

---

### Task 6: Panel chrome

**Files:**
- Modify: `src/ui/WfSchematicPanel.tsx`
- Modify: `src/ui/WfSchematicPanel.test.tsx`
- Modify: `src/App.tsx` (the `wfOpen` state and the panel mount near the bottom-right overlay)
- Modify: `src/ui/WfSchematicView.tsx` only to accept `width`, `height`, and `cameraRef` props. Keep the current scene. Task 7 fills the camera.

**Interfaces:**
- Consumes: `fitSchematicFrame`, `FRAME_START`, `FRAME_INSET_PX`, `FRAME_KEY_STEP_PX` from `src/ui/schematicFrame.ts`; `sceneAt` from Task 1
- Produces: `WfSchematicPanel` props `{ open: boolean; frame: { width: number; height: number } | null; onFrame: (frame: { width: number; height: number }) => void; onClose: () => void }`. The view exports `SchematicCameraHandle = { zoomBy(direction: 'in' | 'out'): void }` via `forwardRef`. Until Task 7, `zoomBy` is a no-op.

**Skill:** none. Implement the lock. Do not restyle from Task 3 if it disagrees.

- [ ] **Step 1: Update the failing component test**

Replace the dialog assertions. Keep the pin, the caption, the body names, the absence of Swale, and Close returning focus.

```ts
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode, useState } from 'react'
import WfSchematicPin from '../map/WfSchematicPin'
import WfSchematicPanel from './WfSchematicPanel'

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null)
  return (
    <>
      <WfSchematicPin onOpen={() => setOpen(true)} />
      <WfSchematicPanel open={open} frame={frame} onFrame={setFrame} onClose={() => setOpen(false)} />
    </>
  )
}

it('lists the Wf bodies when the panel is open', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  const dialog = screen.getByRole('dialog', { name: 'Wf Schematic' })
  expect(within(dialog).queryByText('Sfântu Gheorghe')).not.toBeInTheDocument()
  expect(within(dialog).queryByText('Wf schematic')).not.toBeInTheDocument()
  expect(
    within(dialog).getByText(
      'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.',
    ),
  ).toBeInTheDocument()
  const items = within(dialog).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Wf element complex set')
  expect(within(dialog).getByText('Wf-Lobe')).toBeInTheDocument()
  expect(within(dialog).getByText('Wf-Mouth Bar')).toBeInTheDocument()
  expect(within(dialog).getAllByText('Beach ridge').length).toBeGreaterThan(0)
  expect(within(dialog).queryByText('Swale')).not.toBeInTheDocument()
  expect(within(dialog).getAllByText('Mouth bar').length).toBeGreaterThan(0)
  expect(within(dialog).getByText('Channel fill')).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  const frame = within(dialog).getByTestId('wf-schematic-frame')
  expect(frame).toHaveStyle({ width: '328px', height: '224px' })
  frame.focus()
  await user.click(within(dialog).getByRole('button', { name: 'Resize schematic view' }))
  await user.keyboard('{ArrowRight}')
  expect(frame).toHaveStyle({ width: '344px' })
  const slider = within(dialog).getByRole('slider', { name: 'Explode' })
  slider.focus()
  await user.keyboard('{End}')
  expect(within(dialog).getAllByText('Mouth bar').length).toBeGreaterThan(1)
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  expect(screen.getByTestId('wf-schematic-frame')).toHaveStyle({ width: '344px' })
})
```

`user.clear` on a range input may throw. If it does, delete that line. `{End}` on the focused slider is what sets Explode to 1. The list must still show every mouth bar.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: FAIL because the dialog is still named Sfântu Gheorghe and the frame test id is missing.

- [ ] **Step 3: Build the panel and remember its size**

Keep the existing Three.js scene in `WfSchematicView`. Add the props and a no-op zoom handle. Do not remove meshes, lights, or the dispose path. Task 7 replaces the no-op.

```tsx
export type SchematicCameraHandle = {
  zoomBy: (direction: 'in' | 'out') => void
}

const WfSchematicView = forwardRef<
  SchematicCameraHandle,
  { explode: number; width: number; height: number }
>(function WfSchematicView({ explode, width, height }, ref) {
  useImperativeHandle(ref, () => ({ zoomBy() {} }), [])
  // existing host, with style={{ width, height }} instead of className "h-56 w-full"
})
```

Panel behaviour:

- `aria-label` and the `h2` are `Wf Schematic`. Delete the subtitle paragraph. Keep the existing Escape listener that focuses `#wf-schematic-pin` and calls `onClose`.
- The section's width is `frameWidth + 24` so the 12px padding stays and the title matches the view.
- The frame div has `data-testid="wf-schematic-frame"`, `style={{ width, height }}`, and `className="relative"`.
- Text fallback uses `sceneAt(0)` sorted by rank (`element-complex-set`, `element-complex`, `element-set`, `element`) then by id. Each row is a `li`. Parent suffix stays ` · inside ${parent.name}` when `parentId` is set. The slider does not change this list.
- Zoom buttons render only when `webglAvailable()` is true. They call `cameraRef.current?.zoomBy('in' | 'out')`. They are `type="button"`, `aria-label` `Zoom in` and `Zoom out`, `h-[29px] w-[29px]`, white background, `#333` text, `pressable`, Focus teal ring. The stack is `absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_0_0_2px_rgb(0_0_0/0.1)]`. A press does not hit the canvas.
- The resize handle is always rendered. `aria-label="Resize schematic view"`, `type="button"`, 44px, `absolute left-0 top-0 z-10`, `pressable`, Focus teal ring. ArrowRight and ArrowUp add `FRAME_KEY_STEP_PX` to the width. ArrowLeft and ArrowDown subtract it. Then `fitSchematicFrame`.
- Pointer drag on the handle: `setPointerCapture`, width change is `startWidth - (clientX - startX)` because the bottom-right is fixed and dragging left grows the view. Height comes from `fitSchematicFrame`. `preventDefault` and `stopPropagation`.
- Maximum width and height come from the panel's offset parent: `parentWidth - 24 - FRAME_INSET_PX * 2` and the same for height, also minus `safe-area-inset` via `env()` already on the wrapper. When the parent rect is 0, skip the max and use `Number.POSITIVE_INFINITY`.
- On first open, if `frame` is null, call `onFrame(FRAME_START)` unless the max is smaller, in which case call `onFrame` with the fitted box and use that as `minWidth` too.
- `touch-action: none` on the frame. `-webkit-tap-highlight-color: transparent` on the handle and zoom buttons.

`App.tsx`:

```tsx
const [wfFrame, setWfFrame] = useState<{ width: number; height: number } | null>(null)
```

Pass `frame={wfFrame}` and `onFrame={setWfFrame}`. Keep the wrapper:

```tsx
<div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-10">
```

The panel still unmounts when `wfOpen` is false. `wfFrame` stays in `App`, so reopen keeps the size. Explode state lives in the panel and resets because the panel remounts.

- [ ] **Step 4: Run the component test**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/WfSchematicPanel.tsx src/ui/WfSchematicPanel.test.tsx src/ui/WfSchematicView.tsx src/App.tsx
git commit -m "feat(ui): title, resize, and zoom chrome for the Wf schematic"
```

---

### Task 7: Camera, orbit, and labels

**Files:**
- Modify: `src/ui/WfSchematicView.tsx`

**Interfaces:**
- Consumes: `sceneAt` (`position`, `showLabel`, `yaw`), `zoomDistance`, `ZOOM_MIN`, `ZOOM_MAX`, `SchematicCameraHandle`
- Produces: a view that places every body from `sceneAt`, hides sprites when `showLabel` is false, orbits around `(0, 0.4, 0.6)`, and zooms from the buttons and the wheel

**Skill:** none. Do not import a geometry skill. Do not change `geometryFor`, `beachRidgeGeometry`, `halfChannelGeometry`, `mouthBarGeometry`, or the material colours.

- [ ] **Step 1: Extend the existing view**

Keep the renderer, lights, mesh loop, `ResizeObserver`, and the dispose path (`dispose`, `forceContextLoss`, remove the canvas). Add:

```ts
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ZOOM_MAX, ZOOM_MIN, zoomDistance } from './schematicFrame'

const TARGET = new THREE.Vector3(0, 0.4, 0.6)

function setCameraDistance(camera: THREE.PerspectiveCamera, distance: number) {
  const offset = camera.position.clone().sub(TARGET)
  const length = offset.length() || 1
  offset.multiplyScalar(distance / length)
  camera.position.copy(TARGET).add(offset)
}
```

After creating the camera at `(6.5, 5.5, 7.5)` and `lookAt(TARGET)`:

```ts
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.copy(TARGET)
controls.enablePan = false
controls.enableZoom = false
controls.enableDamping = false
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
controls.minDistance = ZOOM_MIN
controls.maxDistance = ZOOM_MAX
controls.update()
```

Store each label sprite on the group as `group.userData.label`. In the animation tick, `place` from `sceneAt` and set `sprite.visible = body.showLabel`. Do not ease `position`.

`useImperativeHandle` replaces the no-op:

```ts
zoomBy(direction: 'in' | 'out') {
  const distance = camera.position.distanceTo(TARGET)
  setCameraDistance(camera, zoomDistance(distance, direction))
  controls.update()
}
```

Wheel listener on `renderer.domElement`, `{ passive: false }`:

```ts
function onWheel(event: WheelEvent) {
  event.preventDefault()
  event.stopPropagation()
  const distance = camera.position.distanceTo(TARGET)
  setCameraDistance(camera, zoomDistance(distance, event.deltaY < 0 ? 'in' : 'out'))
  controls.update()
}
```

Also `stopPropagation` on `pointerdown` of the canvas so a drag does not reach the map. Cleanup calls `controls.dispose()` before `renderer.dispose()`.

The host fills the sized frame: `style` width and height from props, `className` removed from the fixed `h-56`. `touch-action: none` on the canvas style.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --pretty false`

Expected: exit 0. There is no jsdom test for WebGL. Task 14 checks orbit and zoom by eye.

- [ ] **Step 3: Commit**

```bash
git add src/ui/WfSchematicView.tsx
git commit -m "feat(ui): orbit and zoom the Wf schematic camera"
```

---

### Task 8: Design-engineering review

**Files:**
- Read: `.cursor/skills/emilkowalski/emil-design-eng/SKILL.md`
- Read: `src/ui/WfSchematicPanel.tsx`, `src/ui/WfSchematicView.tsx`, `src/index.css` (`.pressable`, `.toolbox-pop`)
- Modify: only rows you put in the review table, and only inside the panel, the view's DOM chrome, and those two CSS classes

**Interfaces:**
- Consumes: the built panel
- Produces: one markdown table with columns Before, After, and Why. Then the code for those rows.

**Skill:** `emil-design-eng`. The question is in this task. Do not answer with only the greeting.

Prompt:

```text
/emil-design-eng Review the Wf schematic panel in src/ui/WfSchematicPanel.tsx and the camera chrome in src/ui/WfSchematicView.tsx.
Press may scale to 0.97 in 120ms ease-out, as in .pressable.
The panel enter stays .toolbox-pop, 160ms ease-out, and snaps when prefers-reduced-motion is reduce.
Explode, orbit, and zoom distance follow the pointer with no extra ease. Do not add damping, a spring, or a glide.
Do not add a shadow to a new surface. The Float shadow is already on the panel.
Return one table with columns Before, After, and Why. Then apply only those rows.
```

- [ ] **Step 1: Write the table**

If the table is empty, stop and commit nothing. An empty table is a valid result.

- [ ] **Step 2: Apply only the table**

Do not change distances, ranks, colours, or mesh code. Do not install a library.

- [ ] **Step 3: Run the panel test**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx src/core/wfSchematic.test.ts`

Expected: PASS

- [ ] **Step 4: Commit if you changed code**

```bash
git add src/ui/WfSchematicPanel.tsx src/ui/WfSchematicView.tsx src/index.css
git commit -m "fix(ui): polish the Wf schematic panel press and enter"
```

---

### Task 9: Find animation opportunities

**Files:**
- Read: `.cursor/skills/emilkowalski/find-animation-opportunities/SKILL.md`
- Read: `src/ui/WfSchematicPanel.tsx`, `src/ui/WfSchematicView.tsx`, `src/index.css`
- Modify: none

**Interfaces:**
- Consumes: the built panel
- Produces: a gated list of at most five candidates. Task 10 may implement only a candidate this task approves.

**Skill:** `find-animation-opportunities`. You may edit: no. The question is below. Do not answer with only the greeting.

Prompt:

```text
/find-animation-opportunities Search only the Wf schematic panel and its 3D view.
Judge each candidate with frequency, purpose, and whether the motion fights the control.
Already required, so do not list them as new work: .toolbox-pop on open (160ms ease-out, reduced motion snaps) and .pressable on Close, the resize handle, and the zoom buttons (120ms, scale 0.97).
Reject, and say why: easing Explode, damping or inertia on orbit, easing the zoom distance, easing the resize drag, morphing meshes, a compass spin, and a label that moves on a spring.
A label opacity fade when showLabel turns on is allowed only if you can name the purpose and the frequency. Position still tracks the thumb.
Return at most five rows. Do not edit files.
```

- [ ] **Step 1: Write the gated list**

For each row record frequency, purpose, and the verdict: build or reject. Include the rejected controls so Task 10 cannot revive them.

- [ ] **Step 2: Do not commit**

---

### Task 10: Animate only the approved motion

**Files:**
- Read: `.cursor/skills/emilkowalski/animate/SKILL.md` and `.cursor/skills/emilkowalski/animate/RECIPES.md`
- Modify: `src/ui/WfSchematicView.tsx` and, only if the fade is approved, `src/index.css`

**Interfaces:**
- Consumes: Task 9's verdicts
- Produces: motion that Task 11 can review. If Task 9 approved nothing new, this task writes no code.

**Skill:** `animate`. The question is below. Do not answer with only the greeting.

Prompt:

```text
/animate Implement only the candidates Task 9 marked build, for the Wf schematic panel.
Run the animate gate in order. If a candidate fails the gate, write no code for it.
Explode positions, orbit, zoom distance, and resize follow the pointer. They do not get a curve.
Reuse .toolbox-pop and .pressable. Do not add a second duration scale.
If a label fade is approved: opacity only, 160ms, ease-out, opacity from 0 to 1, and animation: none under prefers-reduced-motion. The sprite position still comes from sceneAt on the same frame.
Reduced motion ships in the same change. Do not install a motion library.
```

- [ ] **Step 1: Decide, then implement**

State one purpose word before any CSS. If the decision is "no animation", say so and skip the commit. A label fade, when built, toggles a class on the sprite's material opacity inside the existing tick. Do not add `AnimationMixer`.

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx src/core/wfSchematic.test.ts`

Expected: PASS

- [ ] **Step 3: Commit only if code changed**

```bash
git add src/ui/WfSchematicView.tsx src/index.css
git commit -m "feat(ui): fade Wf schematic labels when a rank opens"
```

Use that message only when the fade shipped. If the only change is a comment, do not commit.

---

### Task 11: Review the motion

**Files:**
- Read: `.cursor/skills/emilkowalski/review-animations/SKILL.md` and `.cursor/skills/emilkowalski/review-animations/STANDARDS.md`
- Modify: motion in `src/index.css` and label opacity in `src/ui/WfSchematicView.tsx` only

**Interfaces:**
- Consumes: `.pressable`, `.toolbox-pop`, and any fade from Task 10
- Produces: a pass, or a fix limited to a failed 120ms press or 160ms enter/fade rule

**Skill:** `review-animations`. The question is below. Do not answer with only the greeting.

Prompt:

```text
/review-animations Review .pressable, .toolbox-pop, and any Wf schematic label fade.
Approve only if press is 120ms ease-out scale 0.97, the panel enter is 160ms ease-out, and reduced motion snaps.
Reject ease-in, scale(0), transition: all, damping on the camera, and any ease on Explode or resize.
Fix only a failed 120ms or 160ms rule. Do not restyle the panel.
```

- [ ] **Step 1: Write the verdict**

Quote the rule that failed, or say the motion passes.

- [ ] **Step 2: Fix only a failed duration or easing rule**

- [ ] **Step 3: Commit only if you changed code**

```bash
git add src/index.css src/ui/WfSchematicView.tsx
git commit -m "fix(ui): keep Wf schematic motion on the 120ms and 160ms curves"
```

---

### Task 12: Phone feel

**Files:**
- Read: `.cursor/skills/emilkowalski/mobile-native/SKILL.md`
- Modify: `src/ui/WfSchematicPanel.tsx` and the panel wrapper in `src/App.tsx` only

**Interfaces:**
- Consumes: the panel and the bottom-right wrapper
- Produces: the same desktop layout, with touch and safe-area fixes on the panel

**Skill:** `mobile-native`. The question is below. Do not answer with only the greeting.

Prompt:

```text
/mobile-native Check the Wf schematic panel, its resize handle, the zoom stack, and the bottom-right wrapper in src/App.tsx.
The wrapper already uses max(0.75rem, env(safe-area-inset-bottom)) and the matching right inset. Keep that.
Buttons must not flash grey on tap. The canvas must use touch-action: none so a drag does not scroll the page.
The resize handle stays 44px. The zoom buttons stay 29px because they match the map control.
Do not change the desktop layout. Do not add a motion library. Say which checks you verified from code and which need a real phone.
```

- [ ] **Step 1: Apply the touch fixes that are missing**

Expected properties if absent: `-webkit-tap-highlight-color: transparent` on the handle and zoom buttons, `touch-action: none` on the frame and canvas, and `select-none` on those buttons so a long-press does not select the plus or minus.

- [ ] **Step 2: Run the panel test**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: PASS

- [ ] **Step 3: Commit if you changed code**

```bash
git add src/ui/WfSchematicPanel.tsx src/ui/WfSchematicView.tsx src/App.tsx
git commit -m "fix(ui): keep the Wf schematic panel usable on a phone"
```

---

### Task 13: Polish, audit, and harden

Run these as three passes in this one task, one skill at a time. Finish one pass before reading the next skill.

**Files:**
- Read, in order: `.cursor/skills/impeccable/reference/polish.md`, `.cursor/skills/impeccable/reference/audit.md`, `.cursor/skills/impeccable/reference/harden.md`
- Modify: `src/ui/WfSchematicPanel.tsx`, `src/ui/WfSchematicPanel.test.tsx`, `src/ui/WfSchematicView.tsx`

**Interfaces:**
- Consumes: the finished panel
- Produces: spacing, focus, and fallback fixes inside the panel only

**Pass 1. Skill:** `/impeccable polish`. You may edit: yes, spacing and alignment only.

```text
/impeccable polish the Wf schematic panel only.
Keep Float shadow, 12px corners, 44px Close and resize handle, and the 29px zoom stack.
Do not move the panel into the sidebar. Do not change colours.
```

**Pass 2. Skill:** `/impeccable audit`. You may edit: yes, focus and names only.

```text
/impeccable audit the Wf schematic panel.
Focus must stay #5eead4, 2px, offset 2px, on Close, the resize handle, both zoom buttons, and the Explode slider.
Escape and Close return focus to the pin. The dialog name is Wf Schematic.
The zoom buttons are absent when WebGL is unavailable.
```

**Pass 3. Skill:** `/impeccable harden`. You may edit: yes, the fallback and the clamps only.

```text
/impeccable harden the Wf schematic panel.
WebGL failure keeps the caption, the slider, and the full text list. The slider does not change that list.
Resize stops at the start size and at the 12px map inset. Zoom stops at 2 and 60.
A bad explode value still returns every body. Do not add a new error colour.
```

- [ ] **Step 1: Apply the three passes**

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx src/ui/schematicFrame.test.ts src/core/wfSchematic.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/ui/WfSchematicPanel.tsx src/ui/WfSchematicPanel.test.tsx src/ui/WfSchematicView.tsx
git commit -m "fix(ui): harden focus and fallback on the Wf schematic panel"
```

---

### Task 14: Document and check by eye

**Files:**
- Read: `.cursor/skills/impeccable/reference/document.md`
- Modify: `DESIGN.md` (replace `### Wf schematic pin` with the subsection in spec section 7)
- Modify: `CHANGELOG.md` under `## [Unreleased]`

**Interfaces:**
- Consumes: the shipped panel
- Produces: `DESIGN.md` matching the screen, and a manual check

**Skill:** `/impeccable document`. You may edit: `DESIGN.md` and `CHANGELOG.md` only.

```text
/impeccable document the Wf schematic pin.
Replace the ### Wf schematic pin subsection with the text in section 7 of docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md.
Do not change PRODUCT.md or ScaleFinderPurpose.md.
```

- [ ] **Step 1: Replace the DESIGN.md subsection**

Copy the five paragraphs from spec section 7. Do not paraphrase the distances or the title.

- [ ] **Step 2: Add the changelog lines**

Under `### Changed`:

```md
- The Wf schematic panel title is Wf Schematic. The place name stays on the pin. The view resizes from the top-left with a locked ratio, and zoom and orbit stay inside the panel.
- Explode opens the Wf ranks in three bands on a sphere: complexes at 8, element sets at 6, elements at 5. Names accumulate. One Beach ridge, one Mouth bar, and one Channel fill are labelled.
```

- [ ] **Step 3: Run the full checks**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`

Expected: all four exit 0.

- [ ] **Step 4: Check the running app by eye**

With `npm run dev` already on port 5173:

1. The pin is visible. Its accessible name still includes Sfântu Gheorghe.
2. The open panel title is Wf Schematic. The caption is unchanged. The place name is not in the panel.
3. Drag the top-left handle. The view keeps its ratio and the bottom-right corner stays put. Arrow keys do the same. The view does not shrink below the start.
4. Zoom-in, zoom-out, and the wheel move the camera between a close view and a far view. Dragging orbits the solids. The map does not pan or zoom. There is no compass and no glide after release.
5. At Explode 0 the solids are nested and the only readable name in the view is Wf element complex set. At about one third, Wf-Lobe and Wf-Mouth Bar have moved apart and their names are on. At about two thirds the set names are on. At 1 the elements are spread and the only element names are one Beach ridge, one Mouth bar, and one Channel fill.
6. Close the panel. The pin remains. Reopen: the size remains, Explode is 0, and the camera is back at the start. Reload: the size is back to the start.
7. Export a snapshot. The pin is in the PNG. The panel, slider, zoom stack, and handle are not.

Record a short walkthrough video of steps 2 through 5.

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md CHANGELOG.md
git commit -m "docs: record the Wf schematic panel resize, zoom, and explode"
```
