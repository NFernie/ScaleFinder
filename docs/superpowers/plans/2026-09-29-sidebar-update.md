# Sidebar update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Extent and Outline by default, draw each thumbnail part like the map with an 8px opening on an open stroke, and send switched-on Polygons back to a fixed outline’s imported centre.

**Architecture:** `centreSelectedOnFixed` in `src/core/polygonList.ts` decides which anchors move. `PolygonPreview` draws `parts`. `sidebarTooltips.ts` holds the sentences. `PolygonList` owns disclosures, row order, the picker, and tooltips. `App` flies the map only after that function returns a new array. Tasks 7–16 are Prompts 7, 8, and 9 from `features/sidebar_update.md`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Extent and Outline start closed. Labels are **Show extent** / **Hide extent** and **Show outline** / **Hide outline**.
- Planform area, Max span, and Equivalent square side keep those names.
- Row order: rotation field, then the file name, then switch, colour, Export, Delete.
- The Polygons section starts open. Collapsing hides the drag hint and the rows. Heading actions stay visible.
- **Centre on fixed** is absent unless a fixed Polygon exists and a switched-on Polygon is not fixed. It is never a disabled button.
- One fixed Polygon acts immediately. Several open a name list. Escape or a pointer down outside closes the list and moves nothing.
- The move copies the fixed anchor onto switched-on, non-fixed rows. Bearing, colour, and fixed rows stay. Then `flyTo` that anchor at the current zoom, duration 1200.
- A missing or non-fixed id returns the same array and does not fly.
- An open part with three or more vertices is filled. Its stroke does not close and stops 8px short of each end in preview pixels. A closed part (first x,y equals last x,y) has no gap. A two-vertex part is a full stroke with no fill.
- Import does not rewrite vertices. The map overlay does not change.
- Tooltips: `role="tooltip"`, `aria-describedby`, `pointer-events-none`, Panel at 95% (`bg-surface-raised/95`), 8px corners, Float shadow. No shadow on a sidebar row.
- Switch accessible name is `Show on map`. Bearing accessible name is `Rotation for {name}`.
- No new motion in Tasks 1–6. Tasks 7–12 may add disclosure, tooltip, and picker motion only.
- Every code commit updates `CHANGELOG.md` under `## [Unreleased]`.

## File structure

| Path | Responsibility |
| --- | --- |
| Modify: `src/core/polygonList.ts` | `centreSelectedOnFixed` |
| Test: `src/core/polygonList.test.ts` | Which rows move |
| Modify: `src/ui/PolygonPreview.tsx` | One path per part, fill, 8px break |
| Create: `src/ui/PolygonPreview.test.tsx` | Stroke and fill |
| Create: `src/ui/sidebarTooltips.ts` | Title and body strings |
| Modify: `src/ui/PolygonList.tsx` | Section, row order, disclosures, picker, tooltips |
| Test: `src/ui/PolygonList.test.tsx` | Layout, names, picker |
| Modify: `src/App.tsx` | `onCentreOnFixed` and `flyTo` |
| Modify: `src/test/MapViewStub.tsx` | `flyTo` and `getZoom` spies |
| Modify: `src/App.test.tsx` | Closed disclosures, switch names, flight |
| Modify: `DESIGN.md` | One Polygons sentence |
| Modify: `src/index.css` | Tasks 9–12 only, if the Emil table approves motion |

---

### Task 1: `centreSelectedOnFixed`

**Files:**
- Modify: `src/core/polygonList.ts`
- Test: `src/core/polygonList.test.ts`

**Interfaces:**
- Consumes: `PolygonItem`, `copyLngLat` (already in this file)
- Produces: `centreSelectedOnFixed(items: readonly PolygonItem[], fixedId: string): PolygonItem[]`

- [ ] **Step 1: Write the failing test**

Add this import and describe block to `src/core/polygonList.test.ts`:

```ts
import { centreSelectedOnFixed } from './polygonList'

describe('centreSelectedOnFixed', () => {
  it('moves switched-on non-fixed anchors onto the fixed anchor and leaves bearing alone', () => {
    const items = [
      item({ id: 'move', selected: true, fixed: false, anchor: { lng: 1, lat: 1 }, rotationDeg: 12 }),
      item({ id: 'off', selected: false, fixed: false, anchor: { lng: 2, lat: 2 }, rotationDeg: 4 }),
      item({ id: 'stay', selected: true, fixed: true, anchor: { lng: 9, lat: 8 }, rotationDeg: 0 }),
    ]
    const next = centreSelectedOnFixed(items, 'stay')
    expect(next[0].anchor).toEqual({ lng: 9, lat: 8 })
    expect(next[0].rotationDeg).toBe(12)
    expect(next[1].anchor).toEqual({ lng: 2, lat: 2 })
    expect(next[2].anchor).toEqual({ lng: 9, lat: 8 })
    expect(next).not.toBe(items)
  })

  it('returns the same array when the id is missing or not fixed', () => {
    const items = [item({ id: 'a', anchor: { lng: 1, lat: 1 } })]
    expect(centreSelectedOnFixed(items, 'missing')).toBe(items)
    expect(centreSelectedOnFixed(items, 'a')).toBe(items)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/core/polygonList.test.ts`
Expected: FAIL. `centreSelectedOnFixed` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add after `stackSelectedOn` in `src/core/polygonList.ts`:

```ts
/** Move switched-on, non-fixed Polygons onto a fixed row’s anchor. A bad id returns the same array. */
export function centreSelectedOnFixed(items: readonly PolygonItem[], fixedId: string): PolygonItem[] {
  const fixed = items.find((item) => item.id === fixedId)
  if (!fixed?.fixed) return items as PolygonItem[]
  const anchor = copyLngLat(fixed.anchor)
  return items.map((item) =>
    item.selected && !item.fixed ? { ...item, anchor: copyLngLat(anchor) } : item,
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/core/polygonList.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/polygonList.ts src/core/polygonList.test.ts CHANGELOG.md
git commit -m "feat(core): centre selected polygons on a fixed anchor"
```

Add a changelog bullet under `### Added`: `centreSelectedOnFixed` copies a fixed Polygon’s anchor onto switched-on, non-fixed rows and returns the same array for a bad id.

---

### Task 2: Thumbnail parts and the 8px break

**Files:**
- Modify: `src/ui/PolygonPreview.tsx`
- Create: `src/ui/PolygonPreview.test.tsx`

**Interfaces:**
- Consumes: `Vertex` from `src/core/types`
- Produces: `PolygonPreview({ parts: Vertex[][], size?: number, colour?: string, className?: string })`. The old `points` prop is removed.

- [ ] **Step 1: Write the failing test**

Create `src/ui/PolygonPreview.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import PolygonPreview from './PolygonPreview'

function nums(value: string | null): number[] {
  return (value ?? '').trim().split(/[\s,]+/).map(Number)
}

describe('PolygonPreview', () => {
  it('fills an open part and stops the stroke 8px short of each end', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ]}
      />,
    )
    const fill = container.querySelector('polygon')
    const stroke = container.querySelector('polyline')
    expect(fill).not.toBeNull()
    expect(stroke).not.toBeNull()
    const strokeNums = nums(stroke?.getAttribute('points') ?? null)
    expect(strokeNums[0]).toBeCloseTo(24, 0)
    expect(strokeNums[1]).toBeCloseTo(80, 0)
    expect(strokeNums[strokeNums.length - 2]).toBeCloseTo(80, 0)
    expect(strokeNums[strokeNums.length - 1]).toBeCloseTo(24, 0)
    const fillNums = nums(fill?.getAttribute('points') ?? null)
    expect(fillNums[0]).toBeCloseTo(16, 0)
    expect(fillNums[1]).toBeCloseTo(80, 0)
  })

  it('does not inset a closed part', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 0 },
          ],
        ]}
      />,
    )
    const stroke = nums(container.querySelector('polyline')?.getAttribute('points') ?? null)
    expect(stroke[0]).toBeCloseTo(16, 0)
    expect(stroke[1]).toBeCloseTo(80, 0)
  })

  it('draws two parts as separate strokes and a two-vertex part as a line', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          [
            { x: 50, y: 50 },
            { x: 80, y: 50 },
            { x: 80, y: 80 },
          ],
        ]}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/PolygonPreview.test.tsx`
Expected: FAIL. `parts` is not a prop.

- [ ] **Step 3: Write minimal implementation**

Replace the props and the drawing in `src/ui/PolygonPreview.tsx`. Keep `withAlpha`. Project each part with the same pad, scale, and north-up flip the file uses now, but compute min and max across all vertices in `parts`. A part is closed when `length >= 2` and the first and last `x` and `y` are equal.

For an open part with `projected.length >= 3`, the stroke polyline uses `pull(first, second, 8)` and `pull(last, previous, 8)`:

```ts
function pull(
  from: { px: number; py: number },
  toward: { px: number; py: number },
  inset: number,
): { px: number; py: number } {
  const length = Math.hypot(toward.px - from.px, toward.py - from.py)
  if (length === 0) return { px: from.px, py: from.py }
  const travel = Math.min(inset, length / 2)
  const t = travel / length
  return {
    px: from.px + (toward.px - from.px) * t,
    py: from.py + (toward.py - from.py) * t,
  }
}
```

Fill is a `<polygon>` of the true projected points, with the first point repeated when the part is open and has at least three vertices. Do not fill a part with fewer than three vertices. Stroke a part with at least two vertices as a `<polyline>` with `fill="none"`. Omit a part with fewer than two vertices. Do not flatten parts into one path. Keep `role="img"` and `aria-label="Field Polygon preview"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ui/PolygonPreview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/PolygonPreview.tsx src/ui/PolygonPreview.test.tsx CHANGELOG.md
git commit -m "feat(ui): draw each thumbnail part with an open stroke break"
```

Changelog `### Changed`: the Polygon thumbnail draws one path per part. An open part stays filled and its stroke stops 8px short of each end.

`PolygonList` still passes `points` until Task 3. That task updates the call. Do not leave `points` in the preview after Task 3.

---

### Task 3: Row order, disclosures, and tooltips

**Files:**
- Create: `src/ui/sidebarTooltips.ts`
- Modify: `src/ui/PolygonList.tsx`
- Test: `src/ui/PolygonList.test.tsx`

**Interfaces:**
- Consumes: `PolygonPreview` `parts`, `PolygonItem`
- Produces: `SIDEBAR_TIPS` and `tipFor(control, name: string): { title: string; body: string }`. `PolygonList` gains `onCentreOnFixed: (id: string) => void`. Section state starts `true`. Extent and outline maps start closed (`?? false`).

- [ ] **Step 1: Write the failing test**

Add `onCentreOnFixed: () => {}` to the `props` object in `src/ui/PolygonList.test.tsx`. Change `Bearing for` to `Rotation for` in the existing bearing tests. Add:

```tsx
it('starts open, hides extent and outline, and puts the name between rotation and the controls', () => {
  render(<PolygonList items={[movable(), fixed()]} {...props} />)
  expect(screen.getByRole('button', { name: 'Polygons' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('button', { name: 'Polygons' })).toHaveTextContent('2 · Polygons')
  expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
  expect(screen.queryByRole('img', { name: 'Field Polygon preview' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Show extent' })).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: 'Show outline' })).toHaveLength(2)

  const rotation = screen.getByRole('button', { name: 'Rotation for Field' })
  const name = screen.getByRole('button', { name: 'Rename Field' })
  const sw = screen.getByRole('switch', { name: 'Show on map' })
  expect(rotation.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(name.compareDocumentPosition(sw) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('describes Export with the locked tooltip sentence', () => {
  render(<PolygonList items={[movable()]} {...props} />)
  const button = screen.getByRole('button', { name: 'Export Field' })
  const tip = document.getElementById(button.getAttribute('aria-describedby') ?? '')
  expect(tip).toHaveAttribute('role', 'tooltip')
  expect(tip).toHaveTextContent('Download this Polygon as UTM easting and northing where it sits.')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: FAIL. No button named `Polygons`. Figures are still visible.

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/sidebarTooltips.ts`:

```ts
export type TipControl =
  | 'section'
  | 'switch'
  | 'rename'
  | 'colour'
  | 'export'
  | 'delete'
  | 'rotation'
  | 'extent'
  | 'outline'
  | 'exportSelected'
  | 'reCentre'
  | 'centreOnFixed'
  | 'fixedPick'

export function tipFor(control: TipControl, name: string, verb?: string): { title: string; body: string } {
  switch (control) {
    case 'section':
      return { title: 'Polygons', body: 'Show or hide the list of outlines.' }
    case 'switch':
      return { title: 'Show on map', body: 'Turn this Polygon on or off. Switching off keeps the row.' }
    case 'rename':
      return { title: `Rename ${name}`, body: 'Rename this Polygon.' }
    case 'colour':
      return { title: `Colour for ${name}`, body: 'Colour of this outline on the map.' }
    case 'export':
      return { title: `Export ${name}`, body: 'Download this Polygon as UTM easting and northing where it sits.' }
    case 'delete':
      return { title: `Delete ${name}`, body: 'Remove this Polygon from the session. A lasso pair removes both rows.' }
    case 'rotation':
      return { title: `Rotation for ${name}`, body: 'Compass bearing of the locked edge. Type a new bearing to turn the outline.' }
    case 'extent':
      return { title: verb ?? 'Show extent', body: 'Planform area, longest span, and equivalent square side.' }
    case 'outline':
      return { title: verb ?? 'Show outline', body: 'Small drawing of each imported part. Open parts stay open.' }
    case 'exportSelected':
      return { title: 'Export selected', body: 'Download switched-on Polygons in the same UTM zone as one file.' }
    case 'reCentre':
      return { title: 'Re-centre', body: 'Move the other switched-on Polygons onto the uppermost centre. Fixed outlines stay put.' }
    case 'centreOnFixed':
      return {
        title: 'Centre on fixed',
        body: 'Move switched-on Polygons back to a fixed outline’s imported centre, and centre the map there.',
      }
    case 'fixedPick':
      return { title: name, body: 'Use this fixed outline as the centre.' }
  }
}
```

Use `tipFor('extent', name, figuresShown ? 'Hide extent' : 'Show extent')` and the same pattern for outline. The button’s accessible name is `tip.title`.

In `PolygonList.tsx`:

- Default `sectionOpen` to `true`. Default each row’s extent and outline to closed.
- Heading button: `aria-label="Polygons"`, `aria-expanded={sectionOpen}`, visible text `2 · Polygons`, classes `pressable flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-slate-100`. Wrap it with `group relative` and a tooltip from `tipFor('section', '')`.
- Keep **Export selected** and **Re-centre** on `selectedCount >= 2`, outside the collapsed rows. Add `aria-describedby` tooltips. Do not render **Centre on fixed** in this task beyond accepting the prop. Task 4 renders it.
- When `sectionOpen` is false, do not render the drag hint or the `<ul>`.
- Row order: rotation control (existing behaviour, accessible name `Rotation for ${sourceName}`), then the rename control on its own line (`w-full`), then `flex min-w-0 flex-wrap items-center gap-2` containing the switch (`aria-label="Show on map"`), colour, Export, and Delete. Export note stays under that line.
- Disclosure buttons use `pressable flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10` and the existing chevron. Closed label **Show extent** / **Show outline**. Open label **Hide extent** / **Hide outline**.
- Pass `parts={item.fixed ? partsForPolygon(item) : turnedParts(partsForPolygon(item), item.rotationDeg ?? 0)}` to `PolygonPreview`. Remove the flattened `points` call.
- Name and bearing inputs use `text-base`. Tooltip panel classes: `pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-56 max-w-full rounded-lg border border-white/15 bg-surface-raised/95 p-2 text-left text-xs text-slate-200 shadow-[0_2px_8px_rgb(0_0_0/0.35)] group-hover:visible group-focus-within:visible`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/sidebarTooltips.ts src/ui/PolygonList.tsx src/ui/PolygonList.test.tsx CHANGELOG.md
git commit -m "feat(ui): collapse extent and outline and retitle the polygon row"
```

Changelog `### Changed`: Polygons rows show rotation, then the file name, then the controls. Extent and Outline start closed.

---

### Task 4: Centre on fixed button and name list

**Files:**
- Modify: `src/ui/PolygonList.tsx`
- Test: `src/ui/PolygonList.test.tsx`

**Interfaces:**
- Consumes: `onCentreOnFixed(id: string)` from Task 3
- Produces: the button and the picker. No anchor math in this file.

- [ ] **Step 1: Write the failing test**

```tsx
it('hides Centre on fixed until a fixed polygon and a switched-on movable polygon both exist', () => {
  const { rerender } = render(<PolygonList items={[movable()]} {...props} />)
  expect(screen.queryByRole('button', { name: 'Centre on fixed' })).not.toBeInTheDocument()
  rerender(<PolygonList items={[movable(), fixed()]} {...props} />)
  expect(screen.getByRole('button', { name: 'Centre on fixed' })).toBeInTheDocument()
})

it('calls the fixed id immediately when only one fixed polygon exists', async () => {
  const user = userEvent.setup()
  const onCentreOnFixed = vi.fn()
  render(<PolygonList items={[movable(), fixed()]} {...props} onCentreOnFixed={onCentreOnFixed} />)
  await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
  expect(onCentreOnFixed).toHaveBeenCalledWith('b')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it('opens a name list for several fixed polygons and ignores Escape', async () => {
  const user = userEvent.setup()
  const onCentreOnFixed = vi.fn()
  const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
  render(
    <PolygonList items={[movable(), fixed(), other]} {...props} onCentreOnFixed={onCentreOnFixed} />,
  )
  await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
  expect(onCentreOnFixed).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(onCentreOnFixed).not.toHaveBeenCalled()
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
  await user.click(screen.getByRole('button', { name: 'Other (fixed)' }))
  expect(onCentreOnFixed).toHaveBeenCalledWith('c')
})

it('closes the fixed list on a pointer down outside', async () => {
  const onCentreOnFixed = vi.fn()
  const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
  render(<PolygonList items={[movable(), fixed(), other]} {...props} onCentreOnFixed={onCentreOnFixed} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Centre on fixed' }))
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(onCentreOnFixed).not.toHaveBeenCalled()
})
```

Import `fireEvent` from `@testing-library/react` in that test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: FAIL. `Centre on fixed` is missing.

- [ ] **Step 3: Write minimal implementation**

Show the button only when `items.some((item) => item.fixed)` and `items.some((item) => item.selected && !item.fixed)`. Classes match Export selected: `pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10`.

One fixed row: `onClick` calls `onCentreOnFixed(thatId)`. More than one: set picker state and render `role="listbox"` with `absolute left-0 top-full z-20 mt-1 w-full min-w-[12rem] rounded-xl border border-white/15 bg-surface-raised/95 p-1 shadow-[0_2px_8px_rgb(0_0_0/0.35)]`. Each name is a 44px button. Choosing one calls `onCentreOnFixed` and closes the list. `Escape` and `pointerdown` outside the list close it without calling the callback. The button stays in the heading when the rows are collapsed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/PolygonList.tsx src/ui/PolygonList.test.tsx CHANGELOG.md
git commit -m "feat(ui): centre on a fixed polygon from the heading"
```

Changelog `### Added`: Centre on fixed shows only when it can run. Several fixed Polygons open a name list first.

---

### Task 5: App flight and existing tests

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/test/MapViewStub.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `centreSelectedOnFixed`, `PolygonList` `onCentreOnFixed`
- Produces: `handleCentreOnFixed` in `App`

- [ ] **Step 1: Write the failing test**

In `src/test/MapViewStub.tsx`, export `mapFlyTo = vi.fn()` and `mapGetZoom = vi.fn(() => 5)`, and `useImperativeHandle` so the ref exposes `flyTo: mapFlyTo`, `getZoom: mapGetZoom`, and `getCenter: () => ({ lng: 10, lat: 20 })`.

In `src/App.test.tsx`, import `{ mapFlyTo, mapGetZoom }` from `./test/MapViewStub`. Replace every `getByRole('switch', { name: '<file>' })` with a row lookup:

```tsx
function rowFor(name: string) {
  const rename = screen.getByRole('button', { name: `Rename ${name}` })
  const row = rename.closest('li')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}
```

`rowFor('field-a.csv').getByRole('switch', { name: 'Show on map' })` replaces a switch query named `field-a.csv`. Do that for `field-b.csv`, `sample-small-field.csv`, `sample-delta-lobe.csv`, `Measured Polygon`, `Nile field`, `utm-field.csv`, and `utm-field.csv (fixed)`.

Rewrite the two figure tests so Planform area and the preview image are absent until **Show extent** and **Show outline**. The figure-note tooltip still appears after Extent is open.

Add:

```tsx
it('flies to the fixed anchor without changing the bearing label', async () => {
  const user = userEvent.setup()
  mapFlyTo.mockClear()
  render(<App />)
  const utm = [
    '# UTM 36N',
    'Poly,Vert,X,Y,Z',
    '1,1,500000.00,3320000.00,0',
    '1,2,501000.00,3320000.00,0',
    '1,3,501000.00,3321000.00,0',
    '1,4,500000.00,3321000.00,0',
  ].join('\n')
  await user.upload(screen.getByLabelText('Choose Polygon file'), csv('utm-field.csv', utm))
  const bearing = await screen.findByRole('button', { name: 'Rotation for utm-field.csv' })
  const before = bearing.textContent
  await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
  expect(bearing.textContent).toBe(before)
  expect(mapFlyTo).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: 5, duration: 1200 }),
  )
  expect(mapGetZoom).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.tsx`
Expected: FAIL. Switches are still named with the file name, or `flyTo` was not called.

- [ ] **Step 3: Write minimal implementation**

```tsx
const handleCentreOnFixed = useCallback(
  (fixedId: string) => {
    const next = centreSelectedOnFixed(items, fixedId)
    if (next === items) return
    const fixed = items.find((item) => item.id === fixedId && item.fixed)
    setItems(next)
    if (!fixed || !mapRef.current) return
    mapRef.current.flyTo({
      center: [fixed.anchor.lng, fixed.anchor.lat],
      zoom: mapRef.current.getZoom(),
      duration: 1200,
    })
  },
  [items],
)
```

Pass `onCentreOnFixed={handleCentreOnFixed}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.tsx src/ui/PolygonList.test.tsx src/ui/PolygonPreview.test.tsx src/core/polygonList.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/test/MapViewStub.tsx CHANGELOG.md
git commit -m "feat(app): fly the map when centring on a fixed polygon"
```

Changelog `### Changed`: Centre on fixed flies the map to the fixed anchor at the current zoom. Sidebar switches are named Show on map.

---

### Task 6: DESIGN.md sentence

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: none
- Produces: one sentence in the sidebar layout section

- [ ] **Step 1: Add the sentence**

Under the sidebar layout paragraph in `DESIGN.md`, add:

The Polygons section starts open. Each row shows the rotation field, then the file name, then the switch, colour, Export, and Delete. Extent and Outline start closed. An open thumbnail part keeps a fill and an 8px stroke break. Centre on fixed appears only when it can move switched-on outlines onto a fixed anchor.

- [ ] **Step 2: Confirm the sentence is present**

Run: `grep -n "8px stroke break" DESIGN.md`
Expected: one matching line

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md CHANGELOG.md
git commit -m "docs: describe the polygons list disclosures"
```

Changelog `### Docs`: `DESIGN.md` records the closed Extent and Outline disclosures, the stroke break, and Centre on fixed.

---

### Task 7: Emil design review (Prompt 7)

**Files:**
- Read only: `src/ui/PolygonList.tsx`, `src/index.css`, `DESIGN.md`

**Interfaces:**
- Consumes: the shipped list from Tasks 1–6
- Produces: a duration table. No file edits.

- [ ] **Step 1: Run the skill with no edits**

`/emil-design-eng` Review the Polygons section disclosure, Extent, Outline, the fixed-name picker, and sidebar tooltips. Compare to DESIGN.md 120ms `.pressable` and the 160ms Toolbox popup. The chevron already rotates in 150ms. Reject motion on map lines, polygon drag, and `flyTo`.

- [ ] **Step 2: Confirm nothing changed**

Run: `git diff --exit-code -- src/ui/PolygonList.tsx src/index.css`
Expected: exit 0

---

### Task 8: Find animation opportunities (Prompt 7)

**Files:**
- Read only: `src/ui/PolygonList.tsx`

- [ ] **Step 1: Run the skill with no edits**

`/find-animation-opportunities` Polygons disclosures, tooltips, and the Centre on fixed picker only. Operate surface. Subtle, no bounce. Approve or reject each item.

- [ ] **Step 2: Confirm nothing changed**

Run: `git diff --exit-code -- src/ui/PolygonList.tsx src/index.css`
Expected: exit 0

---

### Task 9: Animate approved motion (Prompt 7)

**Files:**
- Modify: `src/index.css`, `src/ui/PolygonList.tsx` only if Tasks 7 and 8 approved a change

**Interfaces:**
- Consumes: the approved duration table from Task 7
- Produces: opacity and transform only. `prefers-reduced-motion: reduce` snaps it.

- [ ] **Step 1: Implement only approved rows from the Task 7 table**

If the table says to keep the current chevron and `.pressable`, do not add CSS. If it approves a tooltip or picker reveal, use opacity and transform only, in the durations from that table. Do not animate map geometry or `flyTo`.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx src/ui/PolygonPreview.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit only if files changed**

```bash
git add src/index.css src/ui/PolygonList.tsx CHANGELOG.md
git commit -m "polish(ui): sidebar disclosure and tooltip motion"
```

Skip the commit when `git diff --exit-code` is clean.

---

### Task 10: Improve animations (Prompt 7)

**Files:**
- Modify: `src/index.css` only for tweaks Task 8 approved

- [ ] **Step 1: Apply only those tweaks**

Do not add a tweak Task 8 rejected.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit only if files changed**

```bash
git add src/index.css CHANGELOG.md
git commit -m "polish(ui): sidebar motion tweaks"
```

---

### Task 11: Review animations (Prompt 7)

**Files:**
- Read only: `src/index.css`

- [ ] **Step 1: Run the skill with no edits**

`/review-animations` Review the new sidebar disclosure, tooltip, and picker rules, plus `.pressable`. Approve each rule or write the exact replacement. Do not apply the replacement in this task.

- [ ] **Step 2: Confirm nothing changed**

Run: `git diff --exit-code -- src/index.css src/ui/PolygonList.tsx`
Expected: exit 0

---

### Task 12: Phone checks (Prompt 7)

**Files:**
- Modify: `src/ui/PolygonList.tsx` only for a failed check

- [ ] **Step 1: Run the skill**

`/mobile-native` Polygons list at 390px: 44px controls, 16px text on the name and bearing fields, picker inside the sidebar, no grey tap flash. Tooltips must not be the only name of a control.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit only if a check failed and you edited**

```bash
git add src/ui/PolygonList.tsx CHANGELOG.md
git commit -m "fix(ui): polygon list targets on a phone"
```

---

### Task 13: Polish (Prompt 8)

**Files:**
- Modify: `src/ui/PolygonList.tsx`, `src/ui/PolygonPreview.tsx` for spacing and alignment only

- [ ] **Step 1: Run the skill**

`/impeccable polish` the Polygons list disclosures, name line, and tooltips only. Do not change figure equations or map colours.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx src/ui/PolygonPreview.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit only if files changed**

```bash
git add src/ui/PolygonList.tsx src/ui/PolygonPreview.tsx CHANGELOG.md
git commit -m "polish(ui): polygon list spacing"
```

---

### Task 14: Audit (Prompt 8)

**Files:**
- Modify: `src/ui/PolygonList.tsx` for accessibility fixes only

- [ ] **Step 1: Run the skill**

`/impeccable audit` the Polygons list. Focus teal `#5eead4`, 2px, offset 2px. Extent, Outline, and Centre on fixed have accessible names. Keyboard order is heading, heading actions, then each row.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit only if files changed**

```bash
git add src/ui/PolygonList.tsx CHANGELOG.md
git commit -m "fix(ui): polygon list focus and names"
```

---

### Task 15: Harden (Prompt 8)

**Files:**
- Modify: `src/ui/PolygonList.tsx`, `src/ui/PolygonPreview.tsx`, `src/core/polygonList.ts`

- [ ] **Step 1: Add a failing test for each gap you find, then fix it**

Required checks: Centre on fixed does nothing to fixed rows (Task 1 already covers this). The picker closes on Escape and on a pointer down outside. A two-vertex part has no fill and no closing stroke (Task 2). Disclosures stay closed on first paint (Task 3). If a check is already passing, do not add a duplicate test. If pointer-down outside is untested, add that test to `PolygonList.test.tsx` before changing code.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/ui/PolygonList.test.tsx src/ui/PolygonPreview.test.tsx src/core/polygonList.test.ts`
Expected: PASS

- [ ] **Step 3: Commit only if files changed**

```bash
git add src/ui/PolygonList.tsx src/ui/PolygonList.test.tsx src/ui/PolygonPreview.tsx src/core/polygonList.ts CHANGELOG.md
git commit -m "fix(ui): harden centre on fixed and the thumbnail"
```

---

### Task 16: Manual check (Prompt 9)

**Files:**
- Modify: only a file that failed one check below

- [ ] **Step 1: Run the dev server and record**

Dev server: `http://localhost:5173/`. Save the recording under `/opt/cursor/artifacts/`.

1. A new Polygon shows Extent and Outline closed. Opening Extent shows Planform area, Max span, and Equivalent square side.
2. A file with two Poly values shows two separate strokes in Outline. An open part has a visible gap at the ends. No line joins one part to the next.
3. The file name is on its own line between the rotation field and the switch / colour / Export / Delete line.
4. **2 · Polygons** collapses the rows. Centre on fixed stays in the heading when it can run, and is absent when it cannot.
5. With one fixed Polygon, Centre on fixed stacks the switched-on outlines on that UTM centre and moves the map there. With two fixed Polygons, a list appears first. Bearing values do not change.
6. Hover and keyboard focus show the tooltip sentences. Reduced motion snaps the disclosure and the picker.

- [ ] **Step 2: Run the automated suite**

Run: `npm run test -- src/App.test.tsx src/ui/PolygonList.test.tsx src/ui/PolygonPreview.test.tsx src/core/polygonList.test.ts`
Expected: PASS

- [ ] **Step 3: Commit only a failed-check fix**

```bash
git add -u
git commit -m "fix(ui): sidebar manual check"
```
