# Lasso behaviours and vertex edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick Dynamic, Static, or Outline before the first Lasso point, and add or delete a vertex on a closed Polygon or Lasso before Add to list.

**Architecture:** The behaviour and the stored colour live on `LassoDraft`. Static passes that colour into the existing brush. Outline skips the canvas and, on close, copies the stroke into `parts`. Screen hit-testing and ring edits are pure functions. `App` projects corners, opens the menu, and unprojects the inserted point. The menu position is React state, not session state.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, MapLibre GL via `react-map-gl/maplibre`. No new runtime dependency.

## Global Constraints

Every task includes these. Copy is verbatim from the accepted spec.

- Behaviours are **Dynamic**, **Static**, and **Outline**. Default is Dynamic.
- The choice can be changed while Lasso is selected and no point exists. After the first point the three buttons stay visible and disabled until **Delete**.
- Dynamic: each sample uses the colour under the pointer at that sample.
- Static: same radius, contrast, and radius limit. Every sample is compared with the colour under the first point. Later pointer colours do not replace it.
- Outline: the stroke is the Polygon. Click adds a corner, drag follows the pointer, double-click closes. No colour sample. Radius and Contrast are hidden.
- **Add to list** still stores a movable `Lasso` and a fixed `Lasso (fixed)` that share a `pairId`.
- Vertex edit only after Polygon or Lasso is closed, and only before **Add to list**. Not on list rows. Not on Ruler, Circle, or Square. Not while the stroke is still open.
- Right-click within 12 CSS pixels of a side or a corner opens **Add vertex** and **Delete vertex**. A farther click does nothing.
- **Add vertex** inserts the closest point on the nearest side. Distance is in screen pixels.
- **Delete vertex** removes the nearest corner in screen pixels. A part that would fall below 3 corners is left unchanged.
- The brush is not run again after an edit.
- Delete vertex that would leave fewer than 3 corners shows `A Polygon needs at least three corners.`
- Add vertex within 1 CSS pixel of an existing corner leaves the outline unchanged and shows no message.
- Double-click with fewer than 3 Lasso points shows `Add at least three corners to close a polygon.`
- Polygon close keeps `Add at least three corners to close a Polygon.`
- Canvas failure stays `This basemap does not allow colour sampling.`
- Missing colour ring stays `No feature found at that contrast.`
- Another tool while a draft exists stays `Delete the current drawing before choosing another tool.`
- Readout hint, only when an editable ring exists: `Right-click a side or corner to add or delete a vertex.`
- Line stays `#ffffff` at 2px on a 4px `#0f172a` casing. Closed fill is white at 0.2 opacity. No new colour token.
- Radius stays 8–128, default 48. Contrast stays 0–255, default 32.
- Toolbox grid stays five icons. Targets are at least 44px. Selected teal is `#0f766e`. Focus ring is `#5eead4`, 2px, offset 2px. Disabled controls are 40% opacity.
- Corner dots are HTML, 8px, white, not a map layer. Dots and the vertex menu stay outside the snapshot. The line stays inside it.
- A touch long-press is out of scope. The browser menu is suppressed only when our menu opens.
- Nothing is kept after the page closes. Pixels stay on the device.
- Geometry tasks do not run design skills. UI tasks run the skills named in that task, in order, one skill per message, and reject any suggestion that adds a second accent, a light theme, shadcn, or motion on the map line.
- Subagents use only `cursor-grok-*`, `grok-*`, or `composer-*`, and the `model` argument is set.
- Every code commit adds a `CHANGELOG.md` bullet under `## [Unreleased]` before the commit.

## File structure

| Path | Responsibility |
| --- | --- |
| Modify: `src/core/lasso.ts` | `behaviour`, `reference`, Static flood, Outline close |
| Modify: `src/core/lasso.test.ts` | Dynamic tests stay. Static and Outline tests are added |
| Create: `src/core/ringHit.ts` | Screen-pixel nearest side, nearest corner, point on the side |
| Create: `src/core/ringHit.test.ts` | 12px hit, 13px miss, ties, 1px corner |
| Create: `src/core/ringEdit.ts` | Insert on a side. Remove a corner when at least 3 remain. The floor sentence |
| Create: `src/core/ringEdit.test.ts` | Insert index and the 3-corner floor |
| Modify: `src/core/measurement.ts` | Insert and remove only while status is `polygon` |
| Modify: `src/core/measurement.test.ts` | Closed-only edit and area change |
| Modify: `src/core/toolboxSession.ts` | Choice, sample flag, vertex edits, `vertexRings`, Outline overlay |
| Modify: `src/core/toolboxSession.test.ts` | Outline sample flag, pair from the stroke, guide left in place |
| Modify: `src/ui/ToolboxTooltips.ts` | Lasso body and the three behaviour sentences |
| Modify: `src/ui/LassoMenu.tsx` | Behaviour row, hide Radius and Contrast for Outline, hint |
| Modify: `src/ui/LassoMenu.test.tsx` | Buttons, tooltips, disabled after the first point |
| Create: `src/ui/VertexMenu.tsx` | Two rows, focus, flip into the frame |
| Create: `src/ui/VertexMenu.test.tsx` | Both actions and Escape |
| Modify: `src/ui/MeasureMenu.tsx` | The same hint on a closed Polygon |
| Create: `src/ui/MeasureMenu.test.tsx` | Hint only when closed |
| Modify: `src/map/MapToolCursor.tsx` | Outline uses the Polygon crosshair |
| Create: `src/map/MapToolCursor.test.tsx` | Ring for Dynamic, crosshair for Outline |
| Modify: `src/App.tsx` | Skip sampling for Outline, lock Static colour, context menu, dots |
| Modify: `src/index.css` | Only if Task 15 finds a motion gap. Reuse `.toolbox-pop` first |
| Modify: `PRODUCT.md`, `ScaleFinderPurpose.md`, `DESIGN.md` | Sentences from Task 17. No new token |

Tasks 1–7 are core. They do not use UI UX Pro Max, Impeccable, or Emil Kowalski. Tasks 8–16 are the screen.

## Requirement map

| Spec rule | Task |
| --- | --- |
| Behaviour field, lock before the first point | 1, 7, 9 |
| Static reference colour and flood | 2, 12 |
| Outline stroke, no sample, close into `parts` | 3, 7, 12 |
| 12px hit, nearest side, nearest corner, 1px corner | 4, 13 |
| Insert and delete, 3-corner floor | 5, 6, 7 |
| Pair, guide kept, overlay hides Outline guide after close | 7 |
| Readout buttons, tooltips, hint | 8, 9, 14 |
| Vertex menu, dots, snapshot | 10, 13, 18 |
| Outline crosshair | 11 |
| Motion and phone | 15, 16 |
| Product sentences | 17 |

---

### Task 1: Lasso behaviour on the draft

**Files:**
- Modify: `src/core/lasso.ts`
- Test: `src/core/lasso.test.ts`

**Interfaces:**
- Consumes: existing `LassoDraft`, `beginLasso`, `appendGuidePoint`
- Produces: `LassoBehaviour`, `LassoDraft.behaviour`, `LassoDraft.reference`, `setLassoBehaviour(draft, behaviour)`

- [ ] **Step 1: Write the failing test**

Add this import name: `setLassoBehaviour`. Add this describe block at the bottom of `src/core/lasso.test.ts`:

```ts
describe('lasso behaviour', () => {
  it('starts on Dynamic and ignores a change after the first point', () => {
    const empty = beginLasso()
    expect(empty.behaviour).toBe('dynamic')
    expect(empty.reference).toBeNull()
    const chosen = setLassoBehaviour(empty, 'static')
    expect(chosen.behaviour).toBe('static')
    const pointed = appendGuidePoint(chosen, { lng: 10, lat: 45 })
    expect(setLassoBehaviour(pointed, 'outline').behaviour).toBe('static')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: FAIL. `setLassoBehaviour` is not exported, or `behaviour` is missing.

- [ ] **Step 3: Write the minimal implementation**

In `src/core/lasso.ts`, add the type and field, and the function. `beginLasso` returns them.

```ts
export type LassoBehaviour = 'dynamic' | 'static' | 'outline'

export interface Rgb {
  r: number
  g: number
  b: number
}
```

Add to `LassoDraft`:

```ts
  behaviour: LassoBehaviour
  /** Static only. The colour under the first sample. Alpha is ignored. */
  reference: Rgb | null
```

`beginLasso` includes `behaviour: 'dynamic'` and `reference: null`.

```ts
export function setLassoBehaviour(draft: LassoDraft, behaviour: LassoBehaviour): LassoDraft {
  if (draft.status !== 'drawing' || draft.guide.length > 0) return draft
  if (behaviour === draft.behaviour) return draft
  return { ...draft, behaviour, reference: null, message: null }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: PASS, including the existing Dynamic tests.

- [ ] **Step 5: Commit**

Add under `## [Unreleased]` → `### Added`:

`- Lasso draft stores a behaviour: dynamic, static, or outline. The choice sticks after the first guide point.`

```bash
git add src/core/lasso.ts src/core/lasso.test.ts CHANGELOG.md
git commit -m "feat(lasso): store the brush behaviour on the draft"
```

---

### Task 2: Static reference colour

**Files:**
- Modify: `src/core/lasso.ts`
- Test: `src/core/lasso.test.ts`

**Interfaces:**
- Consumes: `LassoBehaviour`, `Rgb`, `traceBrush`, `flood`
- Produces: `lockReference(draft, reference)`, `referenceFromRaster(raster, pixel)`, `traceBrush(raster, samples, reference?)`. Omitting `reference` keeps today's Dynamic brush.

- [ ] **Step 1: Write the failing test**

```ts
describe('static reference', () => {
  it('includes a later red sample and drops a blue sample', () => {
    const raster = solid(16, 9, (x, y) => {
      if (y < 2 || y > 6) return [20, 20, 20]
      if (x >= 1 && x <= 4) return [200, 40, 40]
      if (x >= 10 && x <= 13) return [200, 40, 40]
      if (x >= 6 && x <= 8) return [40, 40, 200]
      return [20, 20, 20]
    })
    const reference = { r: 200, g: 40, b: 40 }
    const parts = traceBrush(
      raster,
      [
        { pixel: { x: 2, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
        { pixel: { x: 11, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
        { pixel: { x: 7, y: 4 }, radiusPx: 6, maxChannelDelta: 12 },
      ],
      reference,
    )
    expect(parts).toHaveLength(2)
    const bands = parts!.map((part) => Math.min(...part.map((point) => point.x)))
    expect(bands.some((x) => x <= 1)).toBe(true)
    expect(bands.some((x) => x >= 10)).toBe(true)
    expect(parts!.some((part) => part.some((point) => point.x === 7))).toBe(false)
  })

  it('keeps a red pixel outside that sample radius out of the ring', () => {
    const raster = solid(16, 9, (x, y) => {
      if (y >= 2 && y <= 6 && x >= 1 && x <= 4) return [200, 40, 40]
      if (x === 15 && y === 4) return [200, 40, 40]
      return [20, 20, 20]
    })
    const parts = traceBrush(
      raster,
      [{ pixel: { x: 2, y: 4 }, radiusPx: 4, maxChannelDelta: 12 }],
      { r: 200, g: 40, b: 40 },
    )
    expect(parts![0].some((point) => point.x === 15)).toBe(false)
  })

  it('does not invent a reference when lock is refused', () => {
    const draft = setLassoBehaviour(beginLasso(), 'static')
    expect(lockReference(draft, { r: 1, g: 2, b: 3 }).reference).toEqual({ r: 1, g: 2, b: 3 })
    expect(lockReference(beginLasso(), { r: 1, g: 2, b: 3 }).reference).toBeNull()
    const raster = solid(2, 2, () => [9, 8, 7])
    expect(referenceFromRaster(raster, { x: 0, y: 0 })).toEqual({ r: 9, g: 8, b: 7 })
    expect(referenceFromRaster(raster, { x: 9, y: 0 })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: FAIL. `traceBrush` does not take a reference, or `lockReference` is missing.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function lockReference(draft: LassoDraft, reference: Rgb): LassoDraft {
  if (draft.behaviour !== 'static' || draft.reference) return draft
  return { ...draft, reference: { r: reference.r, g: reference.g, b: reference.b } }
}

export function referenceFromRaster(raster: Raster, pixel: Pixel): Rgb | null {
  if (pixel.x < 0 || pixel.y < 0 || pixel.x >= raster.width || pixel.y >= raster.height) return null
  const index = (pixel.y * raster.width + pixel.x) * 4
  return { r: raster.data[index], g: raster.data[index + 1], b: raster.data[index + 2] }
}
```

Change `traceBrush` to `traceBrush(raster, samples, reference?: Rgb | null)` and pass `reference` into `flood`. Replace `flood` with:

```ts
function flood(
  raster: Raster,
  seed: Pixel,
  radiusPx: number,
  maxChannelDelta: number,
  reference?: Rgb | null,
): Uint8Array {
  const filled = new Uint8Array(raster.width * raster.height)
  const seedColour = rgb(raster, seed.x, seed.y)
  const colour: [number, number, number] = reference
    ? [reference.r, reference.g, reference.b]
    : seedColour
  if (reference) {
    const delta = Math.max(
      Math.abs(seedColour[0] - colour[0]),
      Math.abs(seedColour[1] - colour[1]),
      Math.abs(seedColour[2] - colour[2]),
    )
    if (delta > maxChannelDelta) return filled
  }
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
```

Inside the sample loop, call `flood(raster, seed, sample.radiusPx, sample.maxChannelDelta, reference)`. Do not change the 8-pixel rule or the gap rule.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: PASS. The existing Dynamic `traceBrush` calls still pass because they omit `reference`.

- [ ] **Step 5: Commit**

`- Static Lasso compares every sample with a stored red, green, and blue. A sample pixel outside that contrast adds nothing.`

```bash
git add src/core/lasso.ts src/core/lasso.test.ts CHANGELOG.md
git commit -m "feat(lasso): compare static samples with the first colour"
```

---

### Task 3: Outline close

**Files:**
- Modify: `src/core/lasso.ts` (`closeGuide`)
- Test: `src/core/lasso.test.ts`

**Interfaces:**
- Consumes: `LassoDraft.behaviour`, `LassoDraft.guide`
- Produces: Outline `closeGuide` sets `parts` to a one-ring copy of `guide` and `message` to `null`. Dynamic and Static close stay as they are.

- [ ] **Step 1: Write the failing test**

```ts
describe('outline close', () => {
  it('stores the stroke and does not ask for a colour ring', () => {
    const a = { lng: 10, lat: 45 }
    const b = { lng: 10.01, lat: 45 }
    const c = { lng: 10.02, lat: 45.01 }
    let draft = setLassoBehaviour(beginLasso(), 'outline')
    draft = appendGuidePoint(draft, a)
    draft = appendGuidePoint(draft, b)
    const open = closeGuide(draft)
    expect(open.status).toBe('drawing')
    expect(open.message).toBe('Add at least three corners to close a polygon.')
    draft = appendGuidePoint(open, c)
    const closed = closeGuide(draft)
    expect(closed.status).toBe('closed')
    expect(closed.message).toBeNull()
    expect(closed.parts).toEqual([[a, b, c]])
    expect(closed.guide).toEqual([a, b, c])
    expect(closed.parts[0]).not.toBe(closed.guide)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: FAIL. Outline close reports `No feature found at that contrast.` or leaves `parts` empty.

- [ ] **Step 3: Write the minimal implementation**

In `closeGuide`, after the fewer-than-3 return and before the colour-ring check:

```ts
  if (draft.behaviour === 'outline') {
    return {
      ...draft,
      status: 'closed',
      parts: [draft.guide.map((point) => ({ lng: point.lng, lat: point.lat }))],
      message: null,
    }
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/lasso.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`- Outline Lasso closes the drawn stroke into the colour-ring slot and does not require a sampled ring.`

```bash
git add src/core/lasso.ts src/core/lasso.test.ts CHANGELOG.md
git commit -m "feat(lasso): close an outline stroke without sampling"
```

---

### Task 4: Screen hit test

**Files:**
- Create: `src/core/ringHit.ts`
- Test: `src/core/ringHit.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:

```ts
export const RING_HIT_PX = 12
export const RING_CORNER_PX = 1
export interface ScreenPoint { x: number; y: number }
export interface RingHit {
  part: number
  side: number
  corner: number
  at: ScreenPoint
  onCorner: boolean
}
export function nearestRingHit(
  rings: ScreenPoint[][],
  click: ScreenPoint,
  maxPx?: number,
): RingHit | null
```

`maxPx` defaults to `RING_HIT_PX`. `side` is the segment from vertex `side` to `(side + 1) % length`, including the closing side. Ties keep the earlier part, then the earlier index. `onCorner` is true when `at` is within `RING_CORNER_PX` of either end of that side.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { nearestRingHit } from './ringHit'

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

describe('nearestRingHit', () => {
  it('returns the side, the point on it, and the nearest corner within 12px', () => {
    const hit = nearestRingHit([square], { x: 40, y: 10 })
    expect(hit).toEqual({
      part: 0,
      side: 0,
      corner: 0,
      at: { x: 40, y: 0 },
      onCorner: false,
    })
  })

  it('keeps the earlier corner when two corners are the same distance', () => {
    const hit = nearestRingHit([square], { x: 50, y: 10 })
    expect(hit?.corner).toBe(0)
    expect(hit?.at).toEqual({ x: 50, y: 0 })
  })

  it('returns nothing at 13px', () => {
    expect(nearestRingHit([square], { x: 13, y: 50 })).toBeNull()
  })

  it('keeps the earlier part when distances match', () => {
    const hit = nearestRingHit([square, square], { x: 50, y: 5 })
    expect(hit?.part).toBe(0)
    expect(hit?.side).toBe(0)
  })

  it('marks a point that lands on a corner', () => {
    const hit = nearestRingHit([square], { x: 0, y: 0 })
    expect(hit?.onCorner).toBe(true)
    expect(hit?.corner).toBe(0)
  })
})
```

`(40, 10)` is 10px from the bottom side. The corner `(0, 0)` is closer than `(100, 0)`. `(50, 10)` is the same distance from both of those corners, so the earlier index wins.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/ringHit.test.ts`

Expected: FAIL with cannot find module `./ringHit`.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const RING_HIT_PX = 12
export const RING_CORNER_PX = 1

export interface ScreenPoint {
  x: number
  y: number
}

export interface RingHit {
  part: number
  side: number
  corner: number
  at: ScreenPoint
  onCorner: boolean
}

function hypot(x: number, y: number): number {
  return Math.hypot(x, y)
}

function closestOnSegment(a: ScreenPoint, b: ScreenPoint, p: ScreenPoint): { at: ScreenPoint; distance: number } {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return { at: { x: a.x, y: a.y }, distance: hypot(p.x - a.x, p.y - a.y) }
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2))
  const at = { x: a.x + abx * t, y: a.y + aby * t }
  return { at, distance: hypot(p.x - at.x, p.y - at.y) }
}

export function nearestRingHit(rings: ScreenPoint[][], click: ScreenPoint, maxPx = RING_HIT_PX): RingHit | null {
  let bestSide: { part: number; side: number; at: ScreenPoint; distance: number } | null = null
  let bestCorner: { part: number; corner: number; distance: number } | null = null
  rings.forEach((ring, part) => {
    ring.forEach((point, index) => {
      const next = ring[(index + 1) % ring.length]
      if (!next || ring.length < 2) return
      const projected = closestOnSegment(point, next, click)
      if (!bestSide || projected.distance < bestSide.distance) {
        bestSide = { part, side: index, at: projected.at, distance: projected.distance }
      }
      const cornerDistance = hypot(click.x - point.x, click.y - point.y)
      if (!bestCorner || cornerDistance < bestCorner.distance) {
        bestCorner = { part, corner: index, distance: cornerDistance }
      }
    })
  })
  if (!bestSide || !bestCorner) return null
  if (bestSide.distance > maxPx && bestCorner.distance > maxPx) return null
  const end = rings[bestSide.part][(bestSide.side + 1) % rings[bestSide.part].length]
  const start = rings[bestSide.part][bestSide.side]
  const onCorner =
    hypot(bestSide.at.x - start.x, bestSide.at.y - start.y) <= RING_CORNER_PX ||
    hypot(bestSide.at.x - end.x, bestSide.at.y - end.y) <= RING_CORNER_PX
  return {
    part: bestSide.part,
    side: bestSide.side,
    corner: bestCorner.corner,
    at: bestSide.at,
    onCorner,
  }
}
```

Use `<` so an equal distance keeps the earlier part and index.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/ringHit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`- Ring hit-testing picks the nearest side and corner in CSS pixels, within 12px.`

```bash
git add src/core/ringHit.ts src/core/ringHit.test.ts CHANGELOG.md
git commit -m "feat(core): hit-test a closed ring in screen pixels"
```

---

### Task 5: Ring insert and delete

**Files:**
- Create: `src/core/ringEdit.ts`
- Test: `src/core/ringEdit.test.ts`

**Interfaces:**
- Consumes: `LngLat` from `src/core/types.ts`
- Produces:

```ts
export const VERTEX_FLOOR = 'A Polygon needs at least three corners.'
export function insertOnSide(ring: LngLat[], sideIndex: number, point: LngLat): LngLat[]
export function removeCorner(ring: LngLat[], index: number): LngLat[] | null
```

`insertOnSide` inserts at `sideIndex + 1`. The last side inserts at the end, between the last vertex and the first. `removeCorner` returns `null` when the ring would have fewer than 3 points.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { insertOnSide, removeCorner } from './ringEdit'

const ring = [
  { lng: 0, lat: 0 },
  { lng: 1, lat: 0 },
  { lng: 1, lat: 1 },
  { lng: 0, lat: 1 },
]

describe('ringEdit', () => {
  it('inserts between the ends of that side', () => {
    const point = { lng: 1, lat: 0.5 }
    expect(insertOnSide(ring, 1, point).map((item) => item.lng + ',' + item.lat)).toEqual([
      '0,0',
      '1,0',
      '1,0.5',
      '1,1',
      '0,1',
    ])
  })

  it('inserts the closing side at the end of the ring', () => {
    const point = { lng: 0, lat: 0.5 }
    const next = insertOnSide(ring, 3, point)
    expect(next[next.length - 1]).toEqual(point)
    expect(next[0]).toEqual(ring[0])
  })

  it('removes a corner from four and refuses a third', () => {
    expect(removeCorner(ring, 1)).toHaveLength(3)
    expect(removeCorner(ring.slice(0, 3), 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/ringEdit.test.ts`

Expected: FAIL with cannot find module `./ringEdit`.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { LngLat } from './types'

export const VERTEX_FLOOR = 'A Polygon needs at least three corners.'

export function insertOnSide(ring: LngLat[], sideIndex: number, point: LngLat): LngLat[] {
  if (sideIndex < 0 || sideIndex >= ring.length) return ring
  const next = ring.map((item) => ({ lng: item.lng, lat: item.lat }))
  next.splice(sideIndex + 1, 0, { lng: point.lng, lat: point.lat })
  return next
}

export function removeCorner(ring: LngLat[], index: number): LngLat[] | null {
  if (ring.length < 4 || index < 0 || index >= ring.length) return null
  return ring.filter((_, item) => item !== index).map((item) => ({ lng: item.lng, lat: item.lat }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/ringEdit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`- Closed rings can gain a point on a side and lose a corner while at least three remain.`

```bash
git add src/core/ringEdit.ts src/core/ringEdit.test.ts CHANGELOG.md
git commit -m "feat(core): insert and remove a ring vertex"
```

---

### Task 6: Polygon draft vertex edit

**Files:**
- Modify: `src/core/measurement.ts`
- Test: `src/core/measurement.test.ts`

**Interfaces:**
- Consumes: `insertOnSide`, `removeCorner`, `VERTEX_FLOOR`, `Measurement`
- Produces:

```ts
export function insertMeasuredCorner(measurement: Measurement, sideIndex: number, point: LngLat): Measurement
export function removeMeasuredCorner(measurement: Measurement, index: number): Measurement
```

Both return the same measurement when `status !== 'polygon'`. A refused delete sets `message` to `VERTEX_FLOOR` and keeps the corners. A successful edit sets `message` to `null`.

- [ ] **Step 1: Write the failing test**

Inside `describe('measurement readout')`:

```ts
  it('edits corners only after close and updates the area', () => {
    const open = chain()
    const extra = destinationPoint(origin, 500, 45)
    expect(insertMeasuredCorner(open, 0, extra)).toBe(open)
    const closed = applyDoubleClick(open, north)
    if (!closed) throw new Error('expected a closed polygon')
    const before = readout(closed).areaM2
    const wider = insertMeasuredCorner(closed, 0, extra)
    expect(wider.corners).toHaveLength(closed.corners.length + 1)
    expect(wider.corners[1]).toEqual(extra)
    expect(readout(wider).areaM2).not.toBe(before)
    const refused = removeMeasuredCorner(
      { ...closed, corners: closed.corners.slice(0, 3) },
      0,
    )
    expect(refused.corners).toHaveLength(3)
    expect(refused.message).toBe('A Polygon needs at least three corners.')
  })
```

Import `insertMeasuredCorner` and `removeMeasuredCorner`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/measurement.test.ts`

Expected: FAIL. The functions are not exported.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { insertOnSide, removeCorner, VERTEX_FLOOR } from './ringEdit'

export function insertMeasuredCorner(measurement: Measurement, sideIndex: number, point: LngLat): Measurement {
  if (measurement.status !== 'polygon') return measurement
  return { ...measurement, corners: insertOnSide(measurement.corners, sideIndex, point), message: null }
}

export function removeMeasuredCorner(measurement: Measurement, index: number): Measurement {
  if (measurement.status !== 'polygon') return measurement
  const corners = removeCorner(measurement.corners, index)
  if (!corners) return { ...measurement, message: VERTEX_FLOOR }
  return { ...measurement, corners, message: null }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/measurement.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`- A closed Polygon draft can gain or lose a corner. The area readout follows the new corners.`

```bash
git add src/core/measurement.ts src/core/measurement.test.ts CHANGELOG.md
git commit -m "feat(polygon): edit vertices on a closed draft"
```

---

### Task 7: Session wiring

**Files:**
- Modify: `src/core/toolboxSession.ts`
- Test: `src/core/toolboxSession.test.ts`

**Interfaces:**
- Consumes: `setLassoBehaviour`, `insertOnSide`, `removeCorner`, `VERTEX_FLOOR`, `insertMeasuredCorner`, `removeMeasuredCorner`
- Produces:

```ts
export function setSessionLassoBehaviour(session: ToolboxSession, behaviour: LassoBehaviour): ToolboxSession
export function insertLassoVertex(session: ToolboxSession, part: number, side: number, point: LngLat): ToolboxSession
export function removeLassoVertex(session: ToolboxSession, part: number, corner: number): ToolboxSession
export function insertPolygonVertex(session: ToolboxSession, side: number, point: LngLat): ToolboxSession
export function removePolygonVertex(session: ToolboxSession, corner: number): ToolboxSession
export function vertexRings(session: ToolboxSession): LngLat[][]
```

`acceptClick` sets `sample` to `false` when `lasso.behaviour === 'outline'`. Otherwise a drawing Lasso still returns `sample: true`. `overlayOf` omits `guide` when behaviour is `outline` and status is `closed`. `vertexRings` returns the closed Polygon corners, or closed Lasso `parts` of length at least 3. It returns `[]` while drawing and for Ruler, Circle, and Square.

- [ ] **Step 1: Write the failing test**

Use the existing `a`, `b`, `c` points in `toolboxSession.test.ts`. Import `setSessionLassoBehaviour`, `insertLassoVertex`, `removeLassoVertex`, and `vertexRings`. `deleteDraft` is already imported.

```ts
  it('does not sample an outline click and stores the stroke as the pair', () => {
    let session = setSessionLassoBehaviour(chooseTool(closedSession(), 'lasso'), 'outline')
    const first = acceptClick(session, a)
    expect(first.sample).toBe(false)
    session = acceptClick(first.session, b).session
    session = acceptClick(session, c).session
    session = acceptDoubleClick(session, c)
    expect(session.lasso?.status).toBe('closed')
    expect(session.lasso?.parts).toEqual([[a, b, c]])
    expect(overlayOf(session).guide).toBeUndefined()
    expect(overlayOf(session).parts?.[0]).toEqual([a, b, c])
    const taken = takeLassoPair(session, 'pair-outline')
    expect(taken.movable?.sourceName).toBe('Lasso')
    expect(taken.fixed?.sourceName).toBe('Lasso (fixed)')
    expect(taken.movable?.pairId).toBe('pair-outline')
    expect(taken.fixed?.pairId).toBe('pair-outline')
    expect(taken.fixed?.fixed).toBe(true)
  })

  it('edits a closed lasso outline and leaves the guide in the draft', () => {
    let session = chooseTool(closedSession(), 'lasso')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptClick(session, c).session
    session = setLassoOutline(session, [[a, b, c]])
    session = acceptDoubleClick(session, c)
    const guide = session.lasso?.guide
    const moved = insertLassoVertex(session, 0, 0, { lng: 10.005, lat: 45 })
    expect(moved.lasso?.parts[0]).toHaveLength(4)
    expect(moved.lasso?.guide).toEqual(guide)
    expect(insertLassoVertex({ ...session, lasso: { ...session.lasso!, status: 'drawing' } }, 0, 0, a).lasso?.parts).toEqual(
      session.lasso?.parts,
    )
    const triangle = removeLassoVertex(moved, 0, 0)
    expect(triangle.lasso?.parts[0]).toHaveLength(3)
    const stuck = removeLassoVertex(triangle, 0, 0)
    expect(stuck.lasso?.parts[0]).toHaveLength(3)
    expect(stuck.lasso?.message).toBe('A Polygon needs at least three corners.')
    expect(vertexRings(session)[0]).toHaveLength(3)
    expect(vertexRings(chooseTool(closedSession(), 'lasso'))).toEqual([])
    const again = chooseTool(deleteDraft(session), 'lasso')
    expect(again.lasso?.behaviour).toBe('dynamic')
  })
```

Keep the existing test that expects a Dynamic click to return `sample: true`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/toolboxSession.test.ts`

Expected: FAIL. `setSessionLassoBehaviour` is not exported.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function setSessionLassoBehaviour(session: ToolboxSession, behaviour: LassoBehaviour): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: setLassoBehaviour(session.lasso, behaviour) }
}

export function insertLassoVertex(session: ToolboxSession, part: number, side: number, point: LngLat): ToolboxSession {
  const draft = session.lasso
  if (!draft || draft.status !== 'closed') return session
  const ring = draft.parts[part]
  if (!ring) return session
  const parts = draft.parts.slice()
  parts[part] = insertOnSide(ring, side, point)
  return { ...session, lasso: { ...draft, parts, message: null } }
}

export function removeLassoVertex(session: ToolboxSession, part: number, corner: number): ToolboxSession {
  const draft = session.lasso
  if (!draft || draft.status !== 'closed') return session
  const ring = draft.parts[part]
  if (!ring) return session
  const next = removeCorner(ring, corner)
  if (!next) return { ...session, lasso: { ...draft, message: VERTEX_FLOOR } }
  const parts = draft.parts.slice()
  parts[part] = next
  return { ...session, lasso: { ...draft, parts, message: null } }
}

export function insertPolygonVertex(session: ToolboxSession, side: number, point: LngLat): ToolboxSession {
  if (!session.polygon) return session
  return { ...session, polygon: insertMeasuredCorner(session.polygon, side, point) }
}

export function removePolygonVertex(session: ToolboxSession, corner: number): ToolboxSession {
  if (!session.polygon) return session
  return { ...session, polygon: removeMeasuredCorner(session.polygon, corner) }
}

export function vertexRings(session: ToolboxSession): LngLat[][] {
  if (session.polygon?.status === 'polygon' && session.polygon.corners.length >= 3) {
    return [session.polygon.corners.map((point) => ({ lng: point.lng, lat: point.lat }))]
  }
  if (session.lasso?.status === 'closed') {
    return session.lasso.parts
      .filter((part) => part.length >= 3)
      .map((part) => part.map((point) => ({ lng: point.lng, lat: point.lat })))
  }
  return []
}
```

In `acceptClick`, for a drawing Lasso:

```ts
    const sample = session.lasso.behaviour !== 'outline'
    return { session: { ...session, lasso: appendGuidePoint(session.lasso, corner) }, sample }
```

In `overlayOf`, for a Lasso:

```ts
    const outlineClosed = session.lasso.behaviour === 'outline' && session.lasso.status === 'closed'
    return {
      corners: [],
      closed: false,
      ...(outlineClosed
        ? {}
        : {
            guide: session.lasso.guide,
            guideClosed: session.lasso.status === 'closed' && session.lasso.guide.length >= 3,
          }),
      parts: session.lasso.parts.filter((part) => part.length >= 2),
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/toolboxSession.test.ts src/core/lasso.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

`- The Toolbox session carries Lasso behaviour, skips Outline sampling, and edits a closed outline without touching the guide.`

```bash
git add src/core/toolboxSession.ts src/core/toolboxSession.test.ts CHANGELOG.md
git commit -m "feat(toolbox): wire lasso behaviour and vertex edits"
```

---

### Task 8: Design gate before the readout

**Files:**
- Modify: none. This task does not change product code.

**Interfaces:**
- Consumes: the accepted spec section 3, `DESIGN.md` Toolbox section, `WORKFLOW.md`
- Produces: a class list the next tasks must use. If a skill disagrees with that list, the list wins.

Run one skill per message. Operate surface. Do not add a colour, a font, or a library.

- [ ] **Step 1: UI UX Pro Max `ui-styling`**

Read `.cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md`. Ask it to style only the Lasso behaviour row and the vertex menu. Constraints to paste:

```text
/ui-styling Style the Lasso behaviour row and the vertex menu.
Follow DESIGN.md. Match the Rectangle / Square pressed row in src/ui/ShapeMenu.tsx.
Selected teal #0f766e, Mist text, 44px height, 8px corners, hairline white 15% border.
Disabled at 40% opacity. Focus ring #5eead4, 2px, offset 2px.
The menu uses the Float shadow 0 2px 8px rgb(0 0 0 / 0.35), Panel at 95%, 12px corners.
Do not add shadcn. Do not change the palette. Do not edit files.
```

Reject a second accent, a light theme, or a new control height.

- [ ] **Step 2: `/impeccable shape`**

Read `.cursor/skills/impeccable/SKILL.md` and `reference/shape.md`. Paste:

```text
/impeccable shape the Lasso behaviour row and the vertex menu from features/lasso-poly-update.md.
States: empty Lasso (three choices), drawing (choices disabled), Outline (no Radius or Contrast), closed with a ring (hint), closed with no ring (no hint, no dots), delete refused (the floor sentence).
Phone: 390px, the behaviour row wraps, targets stay 44px, the menu flips inside the map frame.
Do not write component code.
```

The shape is already the spec. Do not reopen Dynamic, Static, or Outline.

- [ ] **Step 3: `/impeccable critique`**

```text
/impeccable critique the Lasso readout and vertex menu shape.
Hierarchy: the map line is the work. The behaviour row is a choice, not a second title.
Do not edit files. Do not restyle the Toolbox grid.
```

- [ ] **Step 4: Lock the classes**

Use these classes in Tasks 9 and 10. Do not commit.

Behaviour button, idle: `pressable min-h-11 flex-1 rounded-lg border border-white/15 px-3 text-sm text-white`

Behaviour button, pressed: `pressable min-h-11 flex-1 rounded-lg border border-accent bg-accent-strong px-3 text-sm text-teal-50`

Disabled: add `disabled:opacity-40`. The wrapper keeps the tooltip.

Row: `flex flex-wrap gap-2`

Hint: `text-slate-300`

Vertex menu: `toolbox-pop absolute z-30 flex min-w-[10rem] flex-col rounded-xl border border-white/15 bg-surface/95 p-1 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]`

Menu row: `pressable min-h-11 rounded-lg px-3 text-left text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]`

Dot: `pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_#0f172a]`

The 1px `#0f172a` ring is the existing line casing, so the dot stays visible on a pale basemap. It is not a new token.

---

### Task 9: Lasso readout

**Files:**
- Modify: `src/ui/ToolboxTooltips.ts`
- Modify: `src/ui/LassoMenu.tsx`
- Test: `src/ui/LassoMenu.test.tsx`

**Interfaces:**
- Consumes: `LassoBehaviour`, `setLassoBehaviour` is not called here. The menu calls `onBehaviour`.
- Produces: `LASSO_BEHAVIOUR_TIPS`, `LassoMenu` prop `onBehaviour: (behaviour: LassoBehaviour) => void`

Tooltips, verbatim:

| Key | Sentence |
| --- | --- |
| dynamic | Each sample uses the colour under the pointer. The accepted colour can change along the stroke. |
| static | Every sample is compared with the colour under the first point. Later colours do not replace it. |
| outline | Click and drag the outline. The stroke is the Polygon. Map colour is ignored. |

Lasso icon body, verbatim: `Choose Dynamic, Static, or Outline in the readout, then paint on the map. Double-click to close.`

Hint, verbatim: `Right-click a side or corner to add or delete a vertex.`

- [ ] **Step 1: Write the failing test**

Update existing `LassoMenu` renders to pass `onBehaviour={vi.fn()}`. Add:

```ts
  it('offers three behaviours and hides radius for outline', async () => {
    const user = userEvent.setup()
    const onBehaviour = vi.fn()
    const { rerender } = render(
      <LassoMenu lasso={beginLasso()} onSettings={vi.fn()} onBehaviour={onBehaviour} onAdd={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Dynamic' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Static' }))
    expect(onBehaviour).toHaveBeenCalledWith('static')
    expect(screen.getByRole('button', { name: 'Outline' }).closest('span')).toHaveAttribute(
      'title',
      'Click and drag the outline. The stroke is the Polygon. Map colour is ignored.',
    )
    const outline = setLassoBehaviour(beginLasso(), 'outline')
    rerender(<LassoMenu lasso={outline} onSettings={vi.fn()} onBehaviour={onBehaviour} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByLabelText('Radius')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contrast')).not.toBeInTheDocument()
  })

  it('disables the behaviour buttons after the first point', () => {
    const lasso = appendGuidePoint(beginLasso(), { lng: 10, lat: 45 })
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Dynamic' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Static' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Outline' })).toBeDisabled()
  })

  it('shows the vertex hint only when a closed ring exists', () => {
    const open = beginLasso()
    const { rerender } = render(
      <LassoMenu lasso={open} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.queryByText('Right-click a side or corner to add or delete a vertex.')).not.toBeInTheDocument()
    const closed: LassoDraft = {
      ...beginLasso(),
      status: 'closed',
      guide: [a, b, c],
      parts: [[a, b, c]],
    }
    rerender(<LassoMenu lasso={closed} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Right-click a side or corner to add or delete a vertex.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/LassoMenu.test.tsx`

Expected: FAIL. `Dynamic` is not on screen.

- [ ] **Step 3: Write the minimal implementation**

In `ToolboxTooltips.ts`:

```ts
import type { LassoBehaviour } from '../core/lasso'

export const LASSO_BEHAVIOUR_TIPS: Record<LassoBehaviour, string> = {
  dynamic: 'Each sample uses the colour under the pointer. The accepted colour can change along the stroke.',
  static: 'Every sample is compared with the colour under the first point. Later colours do not replace it.',
  outline: 'Click and drag the outline. The stroke is the Polygon. Map colour is ignored.',
}
```

Replace `TOOL_TIPS.lasso.body` with the sentence in the interfaces block.

In `LassoMenu`, add `onBehaviour`. The row is the three buttons in order Dynamic, Static, Outline, using the Task 8 classes. `aria-pressed` is true for the current behaviour. `disabled` is true when `lasso.guide.length > 0 || lasso.status !== 'drawing'`. Each button sits in:

```tsx
<span title={LASSO_BEHAVIOUR_TIPS[behaviour]} className="relative min-w-0 flex-1">
  <button type="button" aria-pressed={...} aria-describedby={`lasso-behaviour-${behaviour}`} disabled={locked} onClick={() => onBehaviour(behaviour)}>
    {label}
  </button>
  <span id={`lasso-behaviour-${behaviour}`} role="tooltip" className="sr-only">
    {LASSO_BEHAVIOUR_TIPS[behaviour]}
  </span>
</span>
```

Radius and Contrast render only when `lasso.behaviour !== 'outline'`. The hint renders when `lasso.status === 'closed' && lasso.parts.some((part) => part.length >= 3)`.

Wire `onBehaviour` from `App` in Task 12. Until then, pass the prop in tests only. If `App` fails typecheck, add `onBehaviour={(behaviour) => setSession((current) => setSessionLassoBehaviour(current, behaviour))}` in this task so `npm run typecheck` stays green.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/LassoMenu.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

`- The Lasso readout chooses Dynamic, Static, or Outline, with a tooltip on each, and hides Radius and Contrast for Outline.`

```bash
git add src/ui/ToolboxTooltips.ts src/ui/LassoMenu.tsx src/ui/LassoMenu.test.tsx src/App.tsx CHANGELOG.md
git commit -m "feat(ui): choose a lasso behaviour in the readout"
```

---

### Task 10: Vertex menu component

**Files:**
- Create: `src/ui/VertexMenu.tsx`
- Test: `src/ui/VertexMenu.test.tsx`

**Interfaces:**
- Consumes: Task 8 classes
- Produces:

```ts
export interface VertexMenuProps {
  x: number
  y: number
  frame: { width: number; height: number }
  onAdd: () => void
  onDelete: () => void
  onClose: () => void
}
export default function VertexMenu(props: VertexMenuProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VertexMenu from './VertexMenu'

describe('VertexMenu', () => {
  it('runs add and delete and closes on Escape', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <VertexMenu x={10} y={10} frame={{ width: 400, height: 300 }} onAdd={onAdd} onDelete={onDelete} onClose={onClose} />,
    )
    const add = screen.getByRole('menuitem', { name: 'Add vertex' })
    expect(add).toHaveFocus()
    await user.click(add)
    expect(onAdd).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('menuitem', { name: 'Delete vertex' }))
    expect(onDelete).toHaveBeenCalledOnce()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/VertexMenu.test.tsx`

Expected: FAIL with cannot find module `./VertexMenu`.

- [ ] **Step 3: Write the minimal implementation**

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface VertexMenuProps {
  x: number
  y: number
  frame: { width: number; height: number }
  onAdd: () => void
  onDelete: () => void
  onClose: () => void
}

export default function VertexMenu({ x, y, frame, onAdd, onDelete, onClose }: VertexMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    let dx = 0
    let dy = 0
    if (x + node.offsetWidth > frame.width) dx = frame.width - (x + node.offsetWidth)
    if (y + node.offsetHeight > frame.height) dy = frame.height - (y + node.offsetHeight)
    if (x + dx < 0) dx = -x
    if (y + dy < 0) dy = -y
    setShift({ x: dx, y: dy })
  }, [x, y, frame.width, frame.height])

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
  }, [])

  return (
    <div
      ref={ref}
      role="menu"
      className="toolbox-pop absolute z-30 flex min-w-[10rem] flex-col rounded-xl border border-white/15 bg-surface/95 p-1 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
      style={{ left: x + shift.x, top: y + shift.y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <button type="button" role="menuitem" className="pressable min-h-11 rounded-lg px-3 text-left text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]" onClick={onAdd}>
        Add vertex
      </button>
      <button type="button" role="menuitem" className="pressable min-h-11 rounded-lg px-3 text-left text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]" onClick={onDelete}>
        Delete vertex
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/VertexMenu.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

`- A two-row menu adds or deletes the vertex under a right-click.`

```bash
git add src/ui/VertexMenu.tsx src/ui/VertexMenu.test.tsx CHANGELOG.md
git commit -m "feat(ui): add the vertex menu"
```

---

### Task 11: Outline cursor

**Files:**
- Modify: `src/map/MapToolCursor.tsx`
- Test: `src/map/MapToolCursor.test.tsx`

**Interfaces:**
- Consumes: `LassoBehaviour`
- Produces: prop `lassoBehaviour?: LassoBehaviour`. When it is `outline`, the mark is the same `Crosshair` Polygon uses. Dynamic and Static keep the radius ring.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MapToolCursor from './MapToolCursor'

describe('MapToolCursor', () => {
  it('uses a crosshair for outline and a ring for dynamic', () => {
    const outline = render(<MapToolCursor tool="lasso" lassoBehaviour="outline" x={10} y={10} />)
    expect(outline.container.querySelector('line')).not.toBeNull()
    outline.unmount()
    const dynamic = render(<MapToolCursor tool="lasso" lassoBehaviour="dynamic" lassoRadiusPx={48} x={10} y={10} />)
    expect(dynamic.container.querySelector('line')).toBeNull()
    expect(dynamic.container.querySelector('circle')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/map/MapToolCursor.test.tsx`

Expected: FAIL. Outline still draws circles, so `line` is null, or the prop is ignored.

- [ ] **Step 3: Write the minimal implementation**

Add `lassoBehaviour?: LassoBehaviour` to `Props` and to `Mark`. In the `lasso` branch:

```tsx
    case 'lasso':
      if (lassoBehaviour === 'outline') return <Crosshair />
      return <Ring diameter={lassoCursorDiameterPx(lassoRadiusPx)} />
```

Pass `lassoBehaviour={session.lasso?.behaviour}` from `App` where `MapToolCursor` is rendered.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/map/MapToolCursor.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

`- Outline Lasso uses the Polygon crosshair. Dynamic and Static keep the radius ring.`

```bash
git add src/map/MapToolCursor.tsx src/map/MapToolCursor.test.tsx src/App.tsx CHANGELOG.md
git commit -m "feat(map): use a crosshair for outline lasso"
```

---

### Task 12: App brush wiring

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `lockReference`, `referenceFromRaster`, `traceBrush` third argument, `setSessionLassoBehaviour`, `lasso.behaviour`
- Produces: Outline drags do not call `paintLasso`. The first Static sample stores `reference`. Later samples do not. `colourParts` passes `reference` into `traceBrush`.

There is no jsdom test for the canvas. The core tests in Tasks 2 and 7 cover the rules. This task is the call site.

- [ ] **Step 1: Confirm the failing path**

Run: `npx vitest run src/core/lasso.test.ts src/core/toolboxSession.test.ts`

Expected: PASS. This step records that the rules already pass without `App`. The next step is still required so the screen calls them.

- [ ] **Step 2: Skip Outline sampling**

Next to `lassoDrawing.current`, set `lassoOutline.current = session.lasso?.behaviour === 'outline'` during render. Declare the ref beside the other Lasso refs.

In `queueGuidePoint`, after the guide point is accepted, call `paintLasso` only when `lassoOutline.current` is false. Do not read `sample` from inside the `setSession` updater.

- [ ] **Step 3: Lock the first Static colour**

Change `colourParts` to `(samples: LassoSample[], reference: Rgb | null)` and call `traceBrush(raster, ready, reference)`.

Inside `paintLasso`'s `setSession` updater, after `paintLassoSample`:

```ts
          let painted = paintLassoSample(current, index, pixel)
          if (
            painted.lasso?.behaviour === 'static' &&
            index === 0 &&
            painted.lasso.reference === null
          ) {
            const colour = referenceFromRaster(raster, pixel)
            if (colour && painted.lasso) {
              painted = { ...painted, lasso: lockReference(painted.lasso, colour) }
            }
          }
          const parts = painted.lasso ? colourParts(painted.lasso.samples, painted.lasso.reference) : null
          if (!painted.lasso || !parts) return painted
          return setLassoOutline(painted, parts)
```

If the first sample throws, the existing `CANNOT_SAMPLE` path stays. Do not call `lockReference` on a later index.

In the double-click handler, when `appendedOnLastDown` is true, still drop the last point. Call `colourParts` and `setLassoOutline` only when `next.lasso?.behaviour !== 'outline'`. Then `acceptDoubleClick`, which runs `closeGuide`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

`- Outline strokes are not sampled. Static stores the first sample colour and reuses it for the rest of the stroke.`

```bash
git add src/App.tsx CHANGELOG.md
git commit -m "feat(app): sample static and outline lasso strokes"
```

---

### Task 13: Right-click on the map

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `nearestRingHit`, `RING_HIT_PX`, `vertexRings`, `insertLassoVertex`, `removeLassoVertex`, `insertPolygonVertex`, `removePolygonVertex`, `VertexMenu`
- Produces: menu state in React:

```ts
interface VertexMenuState {
  x: number
  y: number
  part: number
  side: number
  corner: number
  at: { x: number; y: number }
  onCorner: boolean
}
```

- [ ] **Step 1: Mount the chrome outside the snapshot**

`downloadFramePng` captures `frameRef` only. Render dots and `VertexMenu` in a sibling of `frameRef`, inside `<main>`, with `pointer-events-none absolute inset-0 z-20`. The menu wrapper is `pointer-events-auto`. Do not put them inside `frameRef`.

Project `vertexRings(session)` with `map.project([lng, lat])`. Each vertex is a dot using the Task 8 dot class, `left` and `top` in pixels. `pointer-events: none`.

- [ ] **Step 2: Open the menu from contextmenu**

On `frameRef`'s `onContextMenu`:

```ts
function handleFrameContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
  const rings = vertexRings(session)
  const map = mapRef.current && 'getMap' in mapRef.current ? mapRef.current.getMap() : null
  const frame = frameRef.current
  if (!map || !frame || rings.length === 0) return
  const rect = frame.getBoundingClientRect()
  const click = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  const screen = rings.map((ring) =>
    ring.map((point) => {
      const projected = map.project([point.lng, point.lat])
      return { x: projected.x, y: projected.y }
    }),
  )
  const hit = nearestRingHit(screen, click, RING_HIT_PX)
  if (!hit) return
  event.preventDefault()
  setVertexMenu({ x: click.x, y: click.y, ...hit })
}
```

A miss does not call `preventDefault`.

- [ ] **Step 3: Apply the edit**

Add: if `menu.onCorner`, clear the menu and return. Otherwise `map.unproject([menu.at.x, menu.at.y])` and call `insertPolygonVertex` when `session.polygon?.status === 'polygon'`, else `insertLassoVertex(session, menu.part, menu.side, point)`.

Delete: `removePolygonVertex(session, menu.corner)` or `removeLassoVertex(session, menu.part, menu.corner)`. Do not call `traceBrush` or `setLassoOutline` after either action.

Close the menu on add, delete, Escape via `onClose`, a pointer down whose target is outside the menu, and `map.on('move')`. The same `move` listener bumps a tick so the dots follow the map. Remove the listener on cleanup.

`handleDelete` also clears the menu.

- [ ] **Step 4: Typecheck and unit tests**

Run: `npm run typecheck && npx vitest run src/core/ringHit.test.ts src/core/toolboxSession.test.ts src/ui/VertexMenu.test.tsx`

Expected: PASS and exit 0. Map right-click is checked by hand in Task 18.

- [ ] **Step 5: Commit**

`- Right-click within 12 CSS pixels of a closed side or corner opens Add vertex and Delete vertex. The dots and the menu stay outside the snapshot.`

```bash
git add src/App.tsx CHANGELOG.md
git commit -m "feat(app): edit a closed vertex from the map"
```

---

### Task 14: Polygon hint

**Files:**
- Modify: `src/ui/MeasureMenu.tsx`
- Create: `src/ui/MeasureMenu.test.tsx`

**Interfaces:**
- Consumes: `Measurement`
- Produces: the hint when `status === 'polygon'` and `corners.length >= 3`. No hint while `adding`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { addCorner, applyDoubleClick, beginMeasurement } from '../core/measurement'
import MeasureMenu from './MeasureMenu'

const a = { lng: 10, lat: 45 }
const b = { lng: 10.01, lat: 45 }
const c = { lng: 10.01, lat: 45.01 }

describe('MeasureMenu', () => {
  it('shows the vertex hint only after the polygon is closed', () => {
    const open = addCorner(addCorner(beginMeasurement(), a), b)
    const { rerender } = render(
      <MeasureMenu measurement={open} onDone={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />,
    )
    expect(screen.queryByText('Right-click a side or corner to add or delete a vertex.')).not.toBeInTheDocument()
    const closed = applyDoubleClick(addCorner(open, c), c)
    if (!closed) throw new Error('expected closed')
    rerender(<MeasureMenu measurement={closed} onDone={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Right-click a side or corner to add or delete a vertex.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/MeasureMenu.test.tsx`

Expected: FAIL. The hint is missing.

- [ ] **Step 3: Write the minimal implementation**

When `closed && measurement.corners.length >= 3`, render:

```tsx
<p className="text-slate-300">Right-click a side or corner to add or delete a vertex.</p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/MeasureMenu.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

`- A closed Polygon readout tells the user they can right-click a side or corner.`

```bash
git add src/ui/MeasureMenu.tsx src/ui/MeasureMenu.test.tsx CHANGELOG.md
git commit -m "feat(ui): hint at vertex edit on a closed polygon"
```

---

### Task 15: Emil Kowalski motion

**Files:**
- Modify: `src/ui/VertexMenu.tsx` and `src/index.css` only if a step finds a real gap
- Do not modify map line drawing

**Interfaces:**
- Consumes: `.toolbox-pop` (160ms ease-out, disabled under `prefers-reduced-motion`) and `.pressable` (scale 0.97, 120ms ease-out)
- Produces: the vertex menu uses that enter motion. Escape and other closes unmount with no exit animation. Dots do not animate.

Read these, one message at a time, and name the files:

1. `.cursor/skills/emilkowalski/emil-design-eng/SKILL.md`
2. `.cursor/skills/emilkowalski/animate/SKILL.md`
3. `.cursor/skills/emilkowalski/review-animations/SKILL.md`
4. `.cursor/skills/emilkowalski/mobile-native/SKILL.md`

- [ ] **Step 1: `emil-design-eng`**

Ask for a before/after table on `VertexMenu` and the behaviour row. Required answers:

| Before | After | Why |
| --- | --- | --- |
| A new duration for the menu | Reuse `.toolbox-pop` at 160ms ease-out | The Toolbox popup already uses this |
| An exit animation on Escape | Unmount immediately | Keyboard dismiss is repeated and must not wait |
| Dots that ease toward the corner during pan | Dots jump with `map.project` | The corner is geography, not chrome |
| `transition: all` | Transform and opacity only, and only on chrome | Already the `.pressable` rule |

If the table shows the menu already has `.toolbox-pop` and no exit animation, change nothing.

- [ ] **Step 2: `animate`**

Only if Step 1 found the menu mounting with no enter class. Add `toolbox-pop` to the menu root. Do not animate the behaviour press beyond `.pressable`. Do not animate Radius, Contrast, or the map stroke.

- [ ] **Step 3: `review-animations`**

Review `.toolbox-pop`, `.pressable`, and the menu. Approve 160ms ease-out and the reduced-motion snap already in `src/index.css`. Reject bounce, spring, and any motion on the white line.

- [ ] **Step 4: `mobile-native`**

Check the behaviour row at 390px: it wraps, each control is at least 44px, number fields stay 16px, and `tap-highlight-color` stays transparent (already on `body` in `src/index.css`). Do not add a long-press. Do not change the desktop layout.

- [ ] **Step 5: Commit only if a file changed**

`- Vertex menu opens with the Toolbox popup motion and closes immediately.`

```bash
git add src/ui/VertexMenu.tsx src/index.css CHANGELOG.md
git commit -m "polish(ui): match vertex menu motion to the toolbox popup"
```

If nothing changed, do not make an empty commit.

---

### Task 16: Impeccable finish

**Files:**
- Modify: only files a check shows are wrong. Stay inside the Lasso readout, `VertexMenu`, `MeasureMenu` hint, and the dots.

**Interfaces:**
- Consumes: the built UI from Tasks 9–15
- Produces: no new behaviour. Copy stays verbatim.

One skill per message. Read the matching file in `.cursor/skills/impeccable/reference/` before each.

- [ ] **Step 1: `/impeccable polish`**

```text
/impeccable polish the Lasso behaviour row, the vertex menu, and the corner dots.
Keep Float shadow, 12px menu corners, 8px control corners, and 44px targets.
Do not move the readout into the sidebar. Do not restyle the Toolbox grid.
```

- [ ] **Step 2: `/impeccable audit`**

```text
/impeccable audit the Lasso readout and vertex menu.
Focus ring is #5eead4, 2px, offset 2px.
The behaviour tooltips have a name and a description when the buttons are disabled.
The menu first row is focused when it opens. Escape closes it.
Check 390px width. Do not edit geometry.
```

Fix a failed focus or name. Do not invent a new tooltip sentence.

- [ ] **Step 3: `/impeccable harden`**

```text
/impeccable harden vertex edit.
A delete that would leave two corners keeps three and shows "A Polygon needs at least three corners."
A right-click farther than 12 CSS pixels does not open the menu and does not suppress the browser menu.
Outline never shows "This basemap does not allow colour sampling." or "No feature found at that contrast."
Do not edit list rows.
```

The core tests already cover the floor and the miss. This step checks the screen still uses those sentences.

- [ ] **Step 4: Run the UI tests**

Run: `npx vitest run src/ui/LassoMenu.test.tsx src/ui/VertexMenu.test.tsx src/ui/MeasureMenu.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit only if a file changed**

```bash
git add src/ui/LassoMenu.tsx src/ui/VertexMenu.tsx src/ui/MeasureMenu.tsx src/App.tsx CHANGELOG.md
git commit -m "polish(ui): finish lasso behaviour and vertex menu"
```

---

### Task 17: Product documents

**Files:**
- Modify: `PRODUCT.md`
- Modify: `ScaleFinderPurpose.md`
- Modify: `DESIGN.md` Toolbox subsection only
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the accepted spec section 7
- Produces: the sentences below. Do not run a full `DESIGN.md` regeneration. Do not add a colour token.

- [ ] **Step 1: Replace the Lasso sentences in `PRODUCT.md`**

In the Toolbox bullet, replace the sentences that start at `Lasso draws a free curve` and end at `leaves a fixed copy of that outline on the map.` with:

```text
Lasso draws a free curve by dragging or clicking. Before the first point the user chooses Dynamic, Static, or Outline. Dynamic joins similar colours within the radius, using the colour under the pointer at each sample. Static uses the same radius and contrast, compared with the colour under the first point. Outline stores the stroke itself and does not sample colour. Double-click closes the guide. After a Lasso or a Polygon draft is closed, and before Add to list, a right-click within 12 CSS pixels of a side or corner can add or delete a vertex. Add to list stores a movable Lasso and leaves a fixed copy of that outline on the map.
```

- [ ] **Step 2: Replace the same stretch in `ScaleFinderPurpose.md`**

Use the same sentences in the Toolbox bullet, including the vertex sentence and the fixed copy.

- [ ] **Step 3: Add two paragraphs under `### Toolbox` in `DESIGN.md`**

```text
**Lasso behaviours:** The readout offers Dynamic, Static, and Outline in one wrapping row, using the same pressed style as Rectangle and Square. Outline hides Radius and Contrast. After the first point the row stays visible and the buttons are disabled.

**Vertex menu:** After a Polygon or Lasso draft is closed, 8px white dots mark the editable corners in HTML over the map, with the same #0f172a casing as the line. A right-click within 12 CSS pixels opens a floating menu, Add vertex and Delete vertex, using the Toolbox panel, 12px corners, and the Float shadow. The dots and the menu sit outside the snapshot frame. The map line does not move with an animation.
```

- [ ] **Step 4: Changelog**

Under `### Docs`:

`- PRODUCT.md, ScaleFinderPurpose.md, and DESIGN.md name Lasso Dynamic, Static, and Outline, and the closed-draft vertex edit.`

- [ ] **Step 5: Commit**

```bash
git add PRODUCT.md ScaleFinderPurpose.md DESIGN.md CHANGELOG.md
git commit -m "docs: record lasso behaviours and vertex edit"
```

---

### Task 18: Verify

**Files:**
- Modify: none, unless a check fails. A failure goes back to the task that owns it.

- [ ] **Step 1: Automated**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`

Expected: all four exit 0.

- [ ] **Step 2: Manual map check**

On `http://localhost:5173/`, with the dev server already running:

1. Choose Lasso, leave Dynamic, drag across two colours, and see the accepted colour change along the stroke.
2. Delete, choose Static, start on one colour, drag onto another. Only the first colour joins.
3. Delete, choose Outline. Radius and Contrast are gone. The cursor is a crosshair. Drag a loop. The basemap colour does not change the stroke. Double-click. One line remains.
4. Right-click a side and add a corner. Right-click and delete a corner. Right-click empty map and see the browser menu, not ours.
5. Add to list. The list has `Lasso` and `Lasso (fixed)`. Deleting one deletes both. The edited shape is the one stored.
6. Draw a Polygon, double-click it closed, and use the same menu. The area number changes after an insert.
7. Export a snapshot. The line is in the PNG. The dots, the vertex menu, and the readout are not.

Save a short recording under `/opt/cursor/artifacts/`.

- [ ] **Step 3: Do not commit a recording**

The recording stays in `/opt/cursor/artifacts/`. Commit only a code fix from a failed check, with a changelog line.
