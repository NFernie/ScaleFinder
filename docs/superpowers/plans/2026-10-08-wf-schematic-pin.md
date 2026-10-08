# Wf schematic pin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. UI tasks also follow [`WORKFLOW.md`](../../../WORKFLOW.md): one design skill per message, in the order under Design skill order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin a type Wf shoreline schematic at 44.878674, 29.515563 and open an explode view of element, element set, element complex, and element complex set.

**Architecture:** A pure module owns the body tree, the fan and flank offsets, and the explode gaps. A MapLibre marker opens a Toolbox-styled panel. The panel draws those bodies with Three.js when WebGL is available, and lists them as text when it is not. Schematic units never touch the map.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, MapLibre via `react-map-gl/maplibre`, Vitest, `three`.

## Global Constraints

- One pin at latitude 44.878674, longitude 29.515563. Title: Sfântu Gheorghe. Subtitle: Wf schematic.
- Caption, exact: `Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.`
- Ranks only: `element`, `element-set`, `element-complex`, `element-complex-set`.
- Five mouth-bar elements fan seaward and sideways. Four beach-ridge elements and three swale elements on each flank, stepping away from the channel. One straight channel-fill element. One mouth-bar slab. One blue lobe solid. One ground slab for the element complex set.
- Explode is a slider from 0 to 1. Values outside that range clamp. Parent links do not change. At 0 the rank gap is 0. At 1 elements are furthest from the root along Y, then element sets, then element complexes. The element complex set does not move.
- `three` is used only by the schematic view. The img2threejs pipeline is not used. Report figures and `WF_element complex set.png` are not drawn into the canvas.
- The pin is inside the snapshot frame. The panel and the slider are outside it.
- Panel chrome uses Panel `#131c2e` at 95%, 12px corners, and the Float shadow `0 2px 8px rgb(0 0 0 / 0.35)`. Diagram fills stay inside the canvas: gold beach ridges, grey swales, green mouth bars, orange channel, blue lobe.
- Nothing about the slider is stored after the page closes.
- Product copy in `PRODUCT.md`, `ScaleFinderPurpose.md`, and `DESIGN.md` is added in the last task, using the sentences in that task.
- Subagents use a model whose name starts with `cursor-grok-`, `grok-`, or `composer-`. Pass `model` explicitly.

## Design skill order

Follow [`WORKFLOW.md`](../../../WORKFLOW.md). This is an Operate surface. The map is the work. The schematic panel is an instrument. One skill per SSD message. Name the files. Say whether the agent may edit. Emil skills answer with only a greeting if the question is missing, so every Emil prompt below includes the job.

Geometry in Task 1 does not use these skills. Put that work in `src/core/` and cover it with Vitest.

| Step | Task | Skill | May edit |
| --- | --- | --- | --- |
| 1 | 2 | UI UX Pro Max `ui-styling` | No |
| 2 | 2 | `/impeccable shape` | No |
| 3 | 2 | `/impeccable critique` | No |
| 4 | 2 | Lock the classes. The lock and `DESIGN.md` win if a skill disagrees | No commit |
| 5 | 3 | Implement the agreed pin and panel shell | Yes, using the lock |
| 6 | 4 | Three.js view. Canvas fills stay the diagram colours | Yes, view only |
| 7 | 5 | `emil-design-eng` | Report first |
| 8 | 5 | `find-animation-opportunities` | No |
| 9 | 5 | `animate` | Only the panel enter and the press, if they are missing |
| 10 | 5 | `review-animations` | Fix only a failed 120ms or 160ms rule |
| 11 | 5 | `mobile-native` | Phone panel only |
| 12 | 6 | `/impeccable polish`, then `audit`, then `harden` | Fixes inside the pin and panel |
| 13 | 7 | `/impeccable document`, then mount, product copy, manual check | Yes |

Do not run `design`, `design-system`, `/impeccable colorize`, `bolder`, `delight`, `overdrive`, `quieter`, or `craft`. Do not run `pick-ui-library`, `improve-animations`, `prototype`, `animation-vocabulary`, or `apple-design`. Do not run img2threejs. Do not run `search.py`. It is not vendored. The skill files to read live under `.cursor/skills/`.

---

### Task 1: Hierarchy module

**Files:**
- Create: `src/core/wfSchematic.ts`
- Test: `src/core/wfSchematic.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `WF_ANCHOR`, `SceneBody`, `PlacedBody`, `sceneAt(explode: number): PlacedBody[]`

This task is geometry. Do not read or run UI UX Pro Max, Impeccable, or Emil skills. [`WORKFLOW.md`](../../../WORKFLOW.md) keeps `src/core/` free of those skills.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { sceneAt, WF_ANCHOR } from './wfSchematic'

describe('wfSchematic', () => {
  it('pins Sfântu Gheorghe', () => {
    expect(WF_ANCHOR).toEqual({ lat: 44.878674, lng: 29.515563 })
  })

  it('links every body except the root', () => {
    const bodies = sceneAt(0)
    const ids = new Set(bodies.map((body) => body.id))
    const roots = bodies.filter((body) => body.parentId === null)
    expect(roots).toHaveLength(1)
    expect(roots[0].rank).toBe('element-complex-set')
    for (const body of bodies) {
      if (body.parentId === null) continue
      expect(ids.has(body.parentId)).toBe(true)
    }
    const ranks = new Set(bodies.map((body) => body.rank))
    expect([...ranks].sort()).toEqual([
      'element',
      'element-complex',
      'element-complex-set',
      'element-set',
    ])
  })

  it('fans five mouth bars seaward and sideways', () => {
    const mouths = sceneAt(0)
      .filter((body) => body.kind === 'mouth-bar')
      .sort((a, b) => a.position.z - b.position.z)
    expect(mouths).toHaveLength(5)
    expect(mouths.map((body) => Math.sign(body.position.x))).toEqual([0, 1, -1, 1, -1])
    for (let i = 1; i < mouths.length; i += 1) {
      expect(mouths[i].position.z).toBeGreaterThan(mouths[i - 1].position.z)
      expect(Math.abs(mouths[i].position.x)).toBeGreaterThan(Math.abs(mouths[i - 1].position.x))
    }
    const area = mouths.reduce((sum, body, index) => {
      const next = mouths[(index + 1) % mouths.length]
      return sum + body.position.x * next.position.z - next.position.x * body.position.z
    }, 0)
    expect(Math.abs(area)).toBeGreaterThan(0.1)
    expect(new Set(mouths.map((body) => body.parentId))).toEqual(new Set(['es-mouth']))
  })

  it('steps beach ridges away from the channel on both flanks', () => {
    const nested = sceneAt(0)
    for (const side of ['l', 'r'] as const) {
      const ridges = nested
        .filter((body) => body.id.startsWith(`e-ridge-${side}-`))
        .sort((a, b) => Math.abs(a.position.x) - Math.abs(b.position.x))
      const swales = nested.filter((body) => body.id.startsWith(`e-swale-${side}-`))
      expect(ridges).toHaveLength(4)
      expect(swales).toHaveLength(3)
      for (let i = 1; i < ridges.length; i += 1) {
        expect(Math.abs(ridges[i].position.x)).toBeGreaterThan(Math.abs(ridges[i - 1].position.x))
      }
      expect(new Set(ridges.map((body) => body.parentId))).toEqual(new Set([`es-ridge-${side}`]))
      expect(new Set(swales.map((body) => body.parentId))).toEqual(new Set([`es-ridge-${side}`]))
    }
  })

  it('has one channel, one mouth-bar slab, one lobe, two complexes, and one set root', () => {
    const nested = sceneAt(0)
    expect(nested.filter((body) => body.kind === 'channel')).toHaveLength(1)
    expect(nested.filter((body) => body.kind === 'mouth-slab')).toHaveLength(1)
    expect(nested.filter((body) => body.kind === 'lobe')).toHaveLength(1)
    expect(nested.filter((body) => body.rank === 'element-complex')).toHaveLength(2)
    expect(nested.filter((body) => body.rank === 'element-complex-set')).toHaveLength(1)
    expect(nested.find((body) => body.kind === 'channel')?.parentId).toBe('ec-mouth')
    expect(nested.find((body) => body.kind === 'lobe')?.parentId).toBe('ecs')
    expect(nested.find((body) => body.kind === 'mouth-slab')?.parentId).toBe('ecs')
  })

  it('separates ranks along Y and clamps explode', () => {
    const nested = sceneAt(0)
    const apart = sceneAt(1)
    expect(apart.map((body) => body.id)).toEqual(nested.map((body) => body.id))
    expect(apart.map((body) => body.parentId)).toEqual(nested.map((body) => body.parentId))
    const gap = (rank: string) => {
      const at0 = nested.find((body) => body.rank === rank)!
      const at1 = apart.find((body) => body.id === at0.id)!
      return at1.position.y - at0.position.y
    }
    expect(gap('element-complex-set')).toBe(0)
    expect(gap('element')).toBeGreaterThan(gap('element-set'))
    expect(gap('element-set')).toBeGreaterThan(gap('element-complex'))
    expect(gap('element-complex')).toBeGreaterThan(0)
    expect(sceneAt(-1)).toEqual(sceneAt(0))
    expect(sceneAt(2)).toEqual(sceneAt(1))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/wfSchematic.test.ts`

Expected: FAIL because `./wfSchematic` cannot be resolved.

- [ ] **Step 3: Write the module**

```ts
export const WF_ANCHOR = { lat: 44.878674, lng: 29.515563 } as const

export type Rank = 'element' | 'element-set' | 'element-complex' | 'element-complex-set'

export type SolidKind =
  | 'ground'
  | 'lobe'
  | 'mouth-slab'
  | 'channel'
  | 'mouth-bar'
  | 'beach-ridge'
  | 'swale'
  | 'group'

export interface SceneBody {
  id: string
  name: string
  rank: Rank
  parentId: string | null
  kind: SolidKind
  nested: { x: number; y: number; z: number }
}

export interface PlacedBody extends SceneBody {
  position: { x: number; y: number; z: number }
}

const RANK_LIFT: Record<Rank, number> = {
  'element-complex-set': 0,
  'element-complex': 1.2,
  'element-set': 2.4,
  element: 3.6,
}

function ridgeFlank(side: 'l' | 'r'): SceneBody[] {
  const sign = side === 'r' ? 1 : -1
  const parentId = `es-ridge-${side}`
  const bodies: SceneBody[] = [
    {
      id: parentId,
      name: side === 'r' ? 'Beach-ridge set right' : 'Beach-ridge set left',
      rank: 'element-set',
      parentId: 'ec-lobe',
      kind: 'group',
      nested: { x: sign * 2.15, y: 0.2, z: -0.4 },
    },
  ]
  const along = [1.1, 1.8, 2.5, 3.2]
  along.forEach((distance, index) => {
    bodies.push({
      id: `e-ridge-${side}-${index}`,
      name: 'Beach ridge',
      rank: 'element',
      parentId,
      kind: 'beach-ridge',
      nested: { x: sign * distance, y: 0.2, z: -0.4 },
    })
  })
  ;[1.45, 2.15, 2.85].forEach((distance, index) => {
    bodies.push({
      id: `e-swale-${side}-${index}`,
      name: 'Swale',
      rank: 'element',
      parentId,
      kind: 'swale',
      nested: { x: sign * distance, y: 0.32, z: -0.4 },
    })
  })
  return bodies
}

const MOUTH_BARS: Array<{ x: number; z: number }> = [
  { x: 0, z: 0.35 },
  { x: 0.45, z: 0.7 },
  { x: -0.75, z: 1.05 },
  { x: 1.1, z: 1.4 },
  { x: -1.5, z: 1.8 },
]

const BODIES: SceneBody[] = [
  {
    id: 'ecs',
    name: 'Wf element complex set',
    rank: 'element-complex-set',
    parentId: null,
    kind: 'ground',
    nested: { x: 0, y: 0, z: 0.4 },
  },
  {
    id: 'ec-lobe',
    name: 'Wf-Lobe',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'lobe',
    nested: { x: 0, y: 0.08, z: 2.3 },
  },
  {
    id: 'ec-mouth',
    name: 'Wf-Mouth Bar',
    rank: 'element-complex',
    parentId: 'ecs',
    kind: 'mouth-slab',
    nested: { x: 0, y: 0.08, z: 1.05 },
  },
  ...ridgeFlank('l'),
  ...ridgeFlank('r'),
  {
    id: 'es-mouth',
    name: 'Mouth-bar set',
    rank: 'element-set',
    parentId: 'ec-mouth',
    kind: 'group',
    nested: { x: 0, y: 0.24, z: 1.05 },
  },
  ...MOUTH_BARS.map((point, index) => ({
    id: `e-mouth-${index}`,
    name: 'Mouth bar',
    rank: 'element' as const,
    parentId: 'es-mouth',
    kind: 'mouth-bar' as const,
    nested: { x: point.x, y: 0.28, z: point.z },
  })),
  {
    id: 'e-channel',
    name: 'Channel fill',
    rank: 'element',
    parentId: 'ec-mouth',
    kind: 'channel',
    nested: { x: 0, y: 0.18, z: -0.55 },
  },
]

export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  return BODIES.map((body) => ({
    ...body,
    position: {
      x: body.nested.x,
      y: body.nested.y + RANK_LIFT[body.rank] * t,
      z: body.nested.z,
    },
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/wfSchematic.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/wfSchematic.ts src/core/wfSchematic.test.ts CHANGELOG.md
git commit -m "feat(core): add the Wf schematic hierarchy"
```

Add this line under `## [Unreleased]` / `### Added` in `CHANGELOG.md` before the commit:

`- A pure Wf schematic lists element, element set, element complex, and element complex set bodies, with mouth bars in a fan and beach ridges stepping away from a central channel.`

---

### Task 2: Design gate before the pin and panel

**Files:**
- Modify: none. This task does not change product code.

**Interfaces:**
- Consumes: the approved spec `docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md`, `DESIGN.md` Toolbox section, `WORKFLOW.md`, `tailwind.config.js`, `.pressable` and `.toolbox-pop` in `src/index.css`
- Produces: the class list Task 3 and Task 7 must use. If a skill disagrees with that list, the list wins.

Run one skill per message. Operate surface. Do not add a colour, a font, or a library. The spec is approved. Do not reopen the pin location, the ranks, the fan, the flanks, or the caption.

- [ ] **Step 1: UI UX Pro Max `ui-styling`**

Read `.cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md`. Style only the pin button and the schematic panel. Paste:

```text
Read PRODUCT.md and DESIGN.md.
This is an Operate surface. Do not add features PRODUCT.md marks out of scope.
Do not change tokens.

Task: Style the Wf schematic pin button and the schematic panel only.
Skill: ui-styling. Read .cursor/skills/ui-ux-pro-max/ui-styling/SKILL.md.
Files: none yet. The pin will be src/map/WfSchematicPin.tsx. The panel will be src/ui/WfSchematicPanel.tsx.
You may edit: no.

Follow DESIGN.md. Night navy, one teal accent, Inter.
Pin hit target 44px. Teal dot uses accent #2dd4bf. White 2px ring on the dot so it reads on a pale basemap.
Panel uses Panel #131c2e at 95% (bg-surface-raised/95), 12px corners, hairline white 15% border, Float shadow 0 2px 8px rgb(0 0 0 / 0.35).
Close is 44px, 8px corners, .pressable.
Subtitle uses Focus teal #5eead4. That is the focus colour, not a second accent.
Focus ring is #5eead4, 2px, offset 2px. The global :focus-visible rule already does this.
Explode is a native range. Do not add a slider library.
Reject shadcn, a second accent, a light theme, and any restyle of the map canvas.
Diagram fills stay inside the canvas later: gold ridges, grey swales, green mouth bars, orange channel, blue lobe. Do not turn those into UI tokens.
Done when: a short class recommendation that matches the lock in Step 4, or a note that the lock already matches DESIGN.md.
```

Reject a second accent, a light theme, shadcn, or a new control height.

- [ ] **Step 2: `/impeccable shape`**

Read `.cursor/skills/impeccable/SKILL.md` and `.cursor/skills/impeccable/reference/shape.md`. The prompt is precise. Return a compact confirmation. Do not ask discovery questions. Do not write code. Paste:

```text
Read PRODUCT.md and DESIGN.md.
This is an Operate surface.

Task: Confirm the shape of the Wf schematic pin and panel. The spec docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md is approved. Do not ask discovery questions. Do not reopen ranks, fan, flanks, pin coordinates, or the caption.
Skill: /impeccable shape. Read .cursor/skills/impeccable/SKILL.md and reference/shape.md.
Files: the spec above. No product code.
You may edit: no.

States: pin closed on the map; panel open with the 3D view; WebGL missing so a text list grouped by parent replaces the view and the slider does not move the text; Explode at 0 (nested) and at 1 (ranks pulled apart on Y); Close and Escape return focus to the pin button id wf-schematic-pin.
Phone: 390px. The pin target stays 44px. The panel stays inside the screen, bottom-right, clear of the home indicator, and does not cover the whole map.
The map is the work. The panel is an instrument.
Done when: a compact confirmation of those states. No component code.
```

- [ ] **Step 3: `/impeccable critique`**

Read `.cursor/skills/impeccable/reference/critique.md`. Paste:

```text
Read PRODUCT.md and DESIGN.md.
This is an Operate surface.

Task: Critique the Wf schematic pin and panel shape from the approved spec.
Skill: /impeccable critique. Read .cursor/skills/impeccable/reference/critique.md.
Files: docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md.
You may edit: no.

Hierarchy: the map is the work. The panel is an instrument, not a second title and not a marketing card.
The title is Sfântu Gheorghe. The subtitle is Wf schematic. The caption stays the approved sentence.
Do not restyle the Toolbox. Do not restyle the basemap. Do not suggest motion on the solids.
Done when: a hierarchy report. If it disagrees with the class lock in Step 4, the lock wins.
```

- [ ] **Step 4: Lock the classes**

Use these classes in Tasks 3, 5, 6, and 7. Do not commit.

Pin button: `pressable flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]`

Pin dot: `h-3 w-3 rounded-full border-2 border-white bg-accent shadow-[0_2px_6px_rgb(0_0_0/0.45)]`

Panel: `toolbox-pop pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-surface-raised/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]`

Close: `pressable min-h-11 rounded-lg px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]`

Subtitle: `text-xs text-[#5eead4]`

Caption: `mb-3 text-xs leading-relaxed text-slate-300`

Body list: `max-h-56 space-y-1 overflow-auto text-xs`

Explode label: `mt-3 block text-xs`

Explode input: native `type="range"`, `className="mt-1 w-full"`, no new library.

Panel slot, outside the snapshot: `absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-10`

`.pressable` is already scale 0.97 in 120ms ease-out, and reduced motion removes the scale (`src/index.css`). `.toolbox-pop` is already 160ms ease-out from 8px below, and reduced motion snaps. Do not add a second duration. Do not animate the solids or the Explode thumb. The geology tracks the thumb.

`bg-surface-raised` is `#131c2e`. `bg-accent` is `#2dd4bf`. Both are in `tailwind.config.js`.

---

### Task 3: Pin and panel shell

**Files:**
- Create: `src/map/WfSchematicPin.tsx`
- Create: `src/ui/WfSchematicPanel.tsx`
- Create: `src/ui/WfSchematicPanel.test.tsx`

**Interfaces:**
- Consumes: `WF_ANCHOR`, `sceneAt` from `src/core/wfSchematic.ts`; the class lock from Task 2
- Produces: `WfSchematicPin({ onOpen })`, `WfSchematicPanel({ open, onClose })`, `webglAvailable(): boolean`

Use the Task 2 class lock. If a skill disagrees with that list, the list and `DESIGN.md` win. Do not restyle the map. Diagram colours are not used in this task. The canvas arrives in Task 4.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode, useState } from 'react'
import WfSchematicPin from '../map/WfSchematicPin'
import WfSchematicPanel from './WfSchematicPanel'

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <WfSchematicPin onOpen={() => setOpen(true)} />
      <WfSchematicPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}

it('lists the Wf bodies when the panel is open', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  expect(screen.getByRole('dialog', { name: 'Sfântu Gheorghe' })).toBeInTheDocument()
  expect(screen.getByText('Wf schematic')).toBeInTheDocument()
  expect(
    screen.getByText(
      'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByText('Wf-Lobe')).toBeInTheDocument()
  expect(screen.getByText('Wf-Mouth Bar')).toBeInTheDocument()
  expect(screen.getAllByText('Beach ridge').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Swale').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Mouth bar').length).toBeGreaterThan(0)
  expect(screen.getByText('Channel fill')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toHaveFocus()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: FAIL because `./WfSchematicPanel` cannot be resolved.

- [ ] **Step 3: Write the pin and the panel**

`src/map/WfSchematicPin.tsx`

```tsx
import { Marker } from 'react-map-gl/maplibre'
import { WF_ANCHOR } from '../core/wfSchematic'

interface Props {
  onOpen: () => void
}

export default function WfSchematicPin({ onOpen }: Props) {
  return (
    <Marker longitude={WF_ANCHOR.lng} latitude={WF_ANCHOR.lat} anchor="center">
      <button
        type="button"
        id="wf-schematic-pin"
        aria-label="Wf schematic, Sfântu Gheorghe"
        title="Wf schematic, Sfântu Gheorghe"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="pressable flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
      >
        <span className="h-3 w-3 rounded-full border-2 border-white bg-accent shadow-[0_2px_6px_rgb(0_0_0/0.45)]" />
      </button>
    </Marker>
  )
}
```

`src/ui/WfSchematicPanel.tsx`

```tsx
import { useEffect } from 'react'
import { sceneAt } from '../core/wfSchematic'

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

interface Props {
  open: boolean
  onClose: () => void
}

const CAPTION =
  'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.'

export default function WfSchematicPanel({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      document.getElementById('wf-schematic-pin')?.focus()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const bodies = sceneAt(0)
  const showText = !webglAvailable()

  return (
    <section
      role="dialog"
      aria-label="Sfântu Gheorghe"
      className="toolbox-pop pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-surface-raised/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Sfântu Gheorghe</h2>
          <p className="text-xs text-[#5eead4]">Wf schematic</p>
        </div>
        <button
          type="button"
          onClick={() => {
            document.getElementById('wf-schematic-pin')?.focus()
            onClose()
          }}
          className="pressable min-h-11 rounded-lg px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
        >
          Close
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-300">{CAPTION}</p>
      {showText && (
        <ul className="max-h-56 space-y-1 overflow-auto text-xs">
          {bodies.map((body) => (
            <li key={body.id}>
              {body.name}
              {body.parentId ? ` · inside ${bodies.find((parent) => parent.id === body.parentId)?.name}` : ''}
            </li>
          ))}
        </ul>
      )}
      <label className="mt-3 block text-xs">
        Explode
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          aria-label="Explode"
          className="mt-1 w-full"
        />
      </label>
    </section>
  )
}
```

The slider is unwired until Task 4. The text list is the WebGL fallback and is what jsdom renders, because jsdom does not provide WebGL.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/map/WfSchematicPin.tsx src/ui/WfSchematicPanel.tsx src/ui/WfSchematicPanel.test.tsx CHANGELOG.md
git commit -m "feat(ui): add the Wf schematic pin and panel shell"
```

Add under `### Added`:

`- The Wf schematic panel names Sfântu Gheorghe, states that the diagram is a type example, and lists each body when the 3D view cannot start.`

---

### Task 4: Three.js explode view

**Files:**
- Modify: `package.json` (dependency `three`)
- Modify: `package-lock.json`
- Create: `src/ui/WfSchematicView.tsx`
- Modify: `src/ui/WfSchematicPanel.tsx`

**Interfaces:**
- Consumes: `sceneAt`, `PlacedBody`, `SolidKind` from `src/core/wfSchematic.ts`; `webglAvailable` from `src/ui/WfSchematicPanel.tsx`; the Task 2 class lock
- Produces: `WfSchematicView({ explode: number })`

Do not run a design skill in this task. Do not restyle the panel chrome. Solid colours stay inside the canvas: ground `#cbd5e1`, lobe `#7dd3fc`, mouth-slab `#14532d`, channel `#f97316`, mouth-bar `#4ade80`, beach-ridge `#eab308`, swale `#9ca3af`. Those are diagram fills, not UI tokens. The Explode slider moves the bodies in the same frame as the thumb. Do not ease the geology.

- [ ] **Step 1: Install three**

Run: `npm install three && npm install -D @types/three`

Expected: `three` in `dependencies` and `@types/three` in `devDependencies`.

- [ ] **Step 2: Write the view**

`src/ui/WfSchematicView.tsx`

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { sceneAt, type PlacedBody, type SolidKind } from '../core/wfSchematic'

const COLOUR: Record<SolidKind, number> = {
  ground: 0xcbd5e1,
  lobe: 0x7dd3fc,
  'mouth-slab': 0x14532d,
  channel: 0xf97316,
  'mouth-bar': 0x4ade80,
  'beach-ridge': 0xeab308,
  swale: 0x9ca3af,
  group: 0xe2e8f0,
}

function geometryFor(kind: SolidKind): THREE.BufferGeometry {
  if (kind === 'ground') return new THREE.BoxGeometry(8, 0.05, 6)
  if (kind === 'lobe') return new THREE.SphereGeometry(1.15, 16, 10).scale(1.6, 0.18, 1)
  if (kind === 'mouth-slab') return new THREE.BoxGeometry(3.4, 0.06, 2.2)
  if (kind === 'channel') return new THREE.BoxGeometry(0.28, 0.12, 2.4)
  if (kind === 'mouth-bar') return new THREE.SphereGeometry(0.28, 12, 8).scale(1.2, 0.45, 1)
  if (kind === 'beach-ridge') return new THREE.BoxGeometry(0.55, 0.16, 0.9)
  if (kind === 'swale') return new THREE.BoxGeometry(0.4, 0.06, 0.7)
  return new THREE.BoxGeometry(0.01, 0.01, 0.01)
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()
  context.fillStyle = '#e2e8f0'
  context.font = '36px sans-serif'
  context.fillText(text, 8, 58)
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.6, 0.3, 1)
  sprite.position.y = 0.45
  return sprite
}

function place(object: THREE.Object3D, body: PlacedBody) {
  object.position.set(body.position.x, body.position.y, body.position.z)
}

export default function WfSchematicView({ explode }: { explode: number }) {
  const host = useRef<HTMLDivElement>(null)
  const explodeRef = useRef(explode)
  explodeRef.current = explode

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(6.5, 5.5, 7.5)
    camera.lookAt(0, 0.4, 0.6)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.15)
    sun.position.set(4, 8, 3)
    scene.add(sun)

    const objects = new Map<string, THREE.Object3D>()
    const geometries: THREE.BufferGeometry[] = []
    for (const body of sceneAt(0)) {
      const group = new THREE.Group()
      if (body.kind !== 'group') {
        const geometry = geometryFor(body.kind)
        geometries.push(geometry)
        group.add(
          new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({ color: COLOUR[body.kind], roughness: 0.72 }),
          ),
        )
      }
      group.add(makeLabel(body.name))
      place(group, body)
      scene.add(group)
      objects.set(body.id, group)
    }

    const resize = () => {
      const width = el.clientWidth || 320
      const height = el.clientHeight || 224
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    el.appendChild(renderer.domElement)

    let frame = 0
    const tick = () => {
      for (const body of sceneAt(explodeRef.current)) {
        const object = objects.get(body.id)
        if (object) place(object, body)
      }
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      geometries.forEach((geometry) => geometry.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="h-56 w-full" data-wf-view="" />
}
```

- [ ] **Step 3: Wire the slider to the view**

In `src/ui/WfSchematicPanel.tsx`, add `useState` and import the view:

```tsx
import { useEffect, useState } from 'react'
import WfSchematicView from './WfSchematicView'
```

Inside the component, after `const showText = !webglAvailable()`:

```tsx
const [explode, setExplode] = useState(0)
```

Replace the text block and the slider with:

```tsx
{showText ? (
  <ul className="max-h-56 space-y-1 overflow-auto text-xs">
    {bodies.map((body) => (
      <li key={body.id}>
        {body.name}
        {body.parentId ? ` · inside ${bodies.find((parent) => parent.id === body.parentId)?.name}` : ''}
      </li>
    ))}
  </ul>
) : (
  <WfSchematicView explode={explode} />
)}
<label className="mt-3 block text-xs">
  Explode
  <input
    type="range"
    min={0}
    max={1}
    step={0.01}
    value={explode}
    aria-label="Explode"
    onChange={(event) => setExplode(Number(event.target.value))}
    className="mt-1 w-full"
  />
</label>
```

Reset explode when the panel opens. In the existing effect, when `open` becomes true, call `setExplode(0)`.

- [ ] **Step 4: Run the panel test and the typecheck**

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx src/core/wfSchematic.test.ts && npx tsc -b --pretty false`

Expected: both test files PASS. `tsc` exits 0. jsdom still takes the text-list path, so the Three.js canvas is not mounted in the test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/ui/WfSchematicView.tsx src/ui/WfSchematicPanel.tsx CHANGELOG.md
git commit -m "feat(ui): explode the Wf schematic in a Three.js view"
```

Add under `### Added`:

`- Opening the Wf schematic draws the solids in a Three.js view and an Explode slider pulls the four ranks apart. The body list remains when WebGL cannot start.`

---

### Task 5: Emil Kowalski on the pin and panel

**Files:**
- Modify: `src/map/WfSchematicPin.tsx`, `src/ui/WfSchematicPanel.tsx`, and `src/index.css` only if a step finds a real gap
- Do not modify `src/core/wfSchematic.ts` or `src/ui/WfSchematicView.tsx` mesh motion

**Interfaces:**
- Consumes: `.toolbox-pop` (160ms ease-out, disabled under `prefers-reduced-motion`) and `.pressable` (scale 0.97, 120ms ease-out) from `src/index.css`; the Task 2 class lock
- Produces: the panel uses that enter motion. Close and Escape unmount with no exit animation. Solids and the Explode thumb do not animate.

The panel and the view already exist. Run one skill per message. Put the question in the first message. These skills greet and stop if you attach them and say nothing else.

- [ ] **Step 1: `emil-design-eng`**

Read `.cursor/skills/emilkowalski/emil-design-eng/SKILL.md`. Paste:

```text
Read PRODUCT.md and DESIGN.md.
This is an Operate surface. The map is the work.

Task: Review the Wf schematic pin and panel. Return a before/after table. Do not re-decide the product.
Skill: emil-design-eng. Read .cursor/skills/emilkowalski/emil-design-eng/SKILL.md.
Files: src/map/WfSchematicPin.tsx, src/ui/WfSchematicPanel.tsx, src/index.css (.pressable and .toolbox-pop).
You may edit: no.

Required rows:

| Before | After | Why |
| --- | --- | --- |
| A new duration for the panel | Reuse .toolbox-pop at 160ms ease-out | The Toolbox popup already uses this |
| An exit animation on Close or Escape | Unmount immediately | Keyboard dismiss is repeated and must not wait |
| Easing the solids or the Explode thumb | The thumb and the geology move together | The slider is a measurement of the explode, not a transition |
| transition: all | Transform and opacity only, and only on chrome | Already the .pressable rule |
| A shadow on a list row | No shadow on rows | The Flat Panel Rule. Float shadow is only on the panel |

Press may scale to 0.97 in 120ms ease-out, as in DESIGN.md.
Done when: the table. If the panel already has toolbox-pop and pressable, and no exit animation, change nothing.
```

- [ ] **Step 2: `find-animation-opportunities`**

Read `.cursor/skills/emilkowalski/find-animation-opportunities/SKILL.md`. This skill reports. It does not implement. Paste:

```text
Read DESIGN.md.

Task: Search the Wf schematic pin, panel, and Three.js view for motion. Reject what must not move.
Skill: find-animation-opportunities. Read .cursor/skills/emilkowalski/find-animation-opportunities/SKILL.md.
Files: src/map/WfSchematicPin.tsx, src/ui/WfSchematicPanel.tsx, src/ui/WfSchematicView.tsx.
You may edit: no.

Reject motion on the solids, on the explode interpolation, on the map, and on the basemap.
The only candidates that may pass are the panel enter, which is already .toolbox-pop at 160ms ease-out, and the press, which is already .pressable at 120ms ease-out scale 0.97.
Reduced motion snaps both.
This list is a menu, not an order. Do not animate anything new.
Done when: a short accept/reject list. No code.
```

- [ ] **Step 3: `animate`**

Read `.cursor/skills/emilkowalski/animate/SKILL.md`. Only if Step 1 found the panel mounting without `toolbox-pop`, or the pin or Close missing `pressable`. Paste:

```text
Read DESIGN.md.

Task: If the Wf schematic panel root is missing toolbox-pop, add that class. If the pin button or Close is missing pressable, add that class. Do not add any other motion.
Skill: animate. Read .cursor/skills/emilkowalski/animate/SKILL.md.
Files: src/ui/WfSchematicPanel.tsx, src/map/WfSchematicPin.tsx.
You may edit: yes, only those two classes if they are missing.

Do not animate mesh positions. Do not ease Explode. Do not add an exit animation. Do not add a new keyframe. Reduced motion already snaps .toolbox-pop and .pressable in src/index.css.
Done when: the panel uses the existing 160ms enter and the buttons use the existing 120ms press, or the file already did and you changed nothing.
```

- [ ] **Step 4: `review-animations`**

Read `.cursor/skills/emilkowalski/review-animations/SKILL.md`. Paste:

```text
Read DESIGN.md.

Task: Review the Wf schematic panel motion. Approve or reject.
Skill: review-animations. Read .cursor/skills/emilkowalski/review-animations/SKILL.md.
Files: src/index.css (.pressable, .toolbox-pop), src/ui/WfSchematicPanel.tsx, src/map/WfSchematicPin.tsx, src/ui/WfSchematicView.tsx.
You may edit: no, unless the verdict fails the 120ms press or the 160ms panel enter. Then fix only that, inside the pin and panel.

Approve 160ms ease-out on .toolbox-pop and 120ms ease-out scale 0.97 on .pressable, including the reduced-motion snap already in src/index.css.
Reject bounce, spring, an exit animation, and any motion on the solids or the Explode value.
Done when: an approve or reject verdict.
```

- [ ] **Step 5: `mobile-native`**

Read `.cursor/skills/emilkowalski/mobile-native/SKILL.md`. Paste:

```text
Read DESIGN.md.

Task: Check the Wf schematic pin and panel at phone width. Do not change the desktop layout.
Skill: mobile-native. Read .cursor/skills/emilkowalski/mobile-native/SKILL.md.
Files: src/map/WfSchematicPin.tsx, src/ui/WfSchematicPanel.tsx. The map slot is wired in Task 7.
You may edit: yes, only if a phone rule below is missing on the pin or panel.

At 390px the panel stays inside the screen (width min(22rem, calc(100vw - 1.5rem))).
Close and the pin stay at least 44px.
There is no text field. Do not add one. If a field appears, its text is 16px so iOS does not zoom.
Tap highlight stays transparent. body already sets -webkit-tap-highlight-color: transparent in src/index.css.
The panel slot uses bottom and right safe-area insets, locked in Task 2. Do not put the panel under the notch or the home indicator.
Do not add a long-press. Do not change the desktop layout. A narrow desktop window is not a phone. Say what you can verify from code.
Done when: the phone rules hold, or you fixed only a missing one.
```

- [ ] **Step 6: Commit only if a file changed**

```bash
git add src/map/WfSchematicPin.tsx src/ui/WfSchematicPanel.tsx src/index.css CHANGELOG.md
git commit -m "polish(ui): match the Wf schematic panel to the toolbox motion"
```

Add under `### Changed` only if you commit:

`- The Wf schematic panel opens with the Toolbox popup motion and closes immediately. Press uses the existing 120ms scale.`

If nothing changed, do not make an empty commit.

---

### Task 6: Impeccable finish on the pin and panel

**Files:**
- Modify: only files a check shows are wrong. Stay inside `src/map/WfSchematicPin.tsx`, `src/ui/WfSchematicPanel.tsx`, and `src/ui/WfSchematicPanel.test.tsx`.

**Interfaces:**
- Consumes: the built pin and panel from Tasks 3–5, and the Task 2 class lock
- Produces: no new behaviour. The caption stays verbatim. Diagram fills stay inside the canvas.

One skill per message. Read the matching file in `.cursor/skills/impeccable/reference/` before each. Do not run `colorize`, `bolder`, `delight`, `overdrive`, or `quieter`.

- [ ] **Step 1: `/impeccable polish`**

Read `.cursor/skills/impeccable/reference/polish.md`. Paste:

```text
Read DESIGN.md.

Task: Polish the Wf schematic pin and panel only.
Skill: /impeccable polish. Read .cursor/skills/impeccable/reference/polish.md.
Files: src/map/WfSchematicPin.tsx, src/ui/WfSchematicPanel.tsx.
You may edit: yes, spacing, type, focus, and alignment inside those files.

Keep Float shadow, 12px panel corners, 8px control corners, 44px targets, Panel at 95%, and the Task 2 class lock.
Do not move the panel into the sidebar. Do not restyle the Toolbox. Do not restyle the map canvas or the diagram fills.
The caption stays: Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.
Done when: the panel still matches the lock, and the test in src/ui/WfSchematicPanel.test.tsx still passes.
```

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: PASS.

- [ ] **Step 2: `/impeccable audit`**

Read `.cursor/skills/impeccable/reference/audit.md`. Paste:

```text
Read DESIGN.md.

Task: Audit the Wf schematic pin and panel for focus, contrast, keyboard, and 390px width.
Skill: /impeccable audit. Read .cursor/skills/impeccable/reference/audit.md.
Files: src/map/WfSchematicPin.tsx, src/ui/WfSchematicPanel.tsx, src/ui/WfSchematicPanel.test.tsx.
You may edit: yes, only a failed focus, name, or contrast inside those files.

Focus ring is #5eead4, 2px, offset 2px.
The pin button name is "Wf schematic, Sfântu Gheorghe". Enter or click opens the dialog "Sfântu Gheorghe".
The Explode slider has an accessible name. Close and Escape close the dialog and return focus to #wf-schematic-pin.
Check 390px width. The panel stays on screen. Targets stay 44px.
Do not edit geometry in src/core/. Do not invent a new caption.
Done when: those checks pass, including the existing panel test.
```

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx`

Expected: PASS. Close still returns focus to the pin.

- [ ] **Step 3: `/impeccable harden`**

Read `.cursor/skills/impeccable/reference/harden.md`. Paste:

```text
Read DESIGN.md and docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md.

Task: Harden the Wf schematic panel edge cases.
Skill: /impeccable harden. Read .cursor/skills/impeccable/reference/harden.md.
Files: src/ui/WfSchematicPanel.tsx, src/ui/WfSchematicView.tsx, src/core/wfSchematic.ts only if explode clamping is missing.
You may edit: yes, only the failures below.

When WebGL cannot start, the text list still names the bodies and says which parent they sit inside. The slider does not move that text.
sceneAt clamps below 0 to the nested scene and above 1 to the fully exploded scene. Parent links do not change.
Close and Escape return focus to #wf-schematic-pin, then close. Focus is synchronous, not setTimeout.
Reopening the panel resets Explode to 0.
The panel component has no map position yet. Task 7 mounts it outside frameRef so it stays out of the snapshot, and mounts the pin inside the snapshot. This task checks Close, Escape, the text list, and the explode clamp.
Done when: those edges hold and npm test for the schematic files passes.
```

Run: `npx vitest run src/ui/WfSchematicPanel.test.tsx src/core/wfSchematic.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit only if a file changed**

```bash
git add src/map/WfSchematicPin.tsx src/ui/WfSchematicPanel.tsx src/ui/WfSchematicPanel.test.tsx src/ui/WfSchematicView.tsx CHANGELOG.md
git commit -m "polish(ui): finish the Wf schematic pin and panel"
```

Add under `### Changed` only if you commit:

`- The Wf schematic pin and panel keep the Toolbox panel, the 44px targets, and the focus return to the pin.`

If nothing changed, do not make an empty commit.

---

### Task 7: Map pin, product copy, and the manual check

**Files:**
- Modify: `src/App.tsx`
- Modify: `PRODUCT.md`
- Modify: `ScaleFinderPurpose.md`
- Modify: `DESIGN.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `WfSchematicPin`, `WfSchematicPanel`, the Task 2 panel slot classes
- Produces: the pin inside `MapView`, the panel outside `frameRef`

- [ ] **Step 1: Mount the pin and the panel**

In `src/App.tsx` add:

```tsx
import WfSchematicPin from './map/WfSchematicPin'
import WfSchematicPanel from './ui/WfSchematicPanel'
```

Add state next to the other `useState` calls:

```tsx
const [wfOpen, setWfOpen] = useState(false)
```

Inside `<MapView>`, after the opening tag and before the polygon list:

```tsx
<WfSchematicPin onOpen={() => setWfOpen(true)} />
```

The pin is a child of `MapView`, and `MapView` is inside `frameRef`, so the pin is in the snapshot.

Outside `frameRef`, as the next sibling inside `<main className="relative min-h-0">`, before the Toolbox wrapper:

```tsx
{wfOpen && (
  <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-10">
    <WfSchematicPanel open={wfOpen} onClose={() => setWfOpen(false)} />
  </div>
)}
```

That wrapper is outside `frameRef`, so the panel and the slider stay out of the snapshot.

- [ ] **Step 2: Update the product records**

In `PRODUCT.md`, under `Confirmed for v1:`, after the framed PNG snapshot bullet, add:

`- A Wf schematic pin at 44.878674, 29.515563 opens a type diagram of element, element set, element complex, and element complex set. The diagram is not a measured map of that coast.`

In `ScaleFinderPurpose.md`, under `## In scope for v1`, after the framed PNG snapshot bullet, add the same sentence as a bullet.

- [ ] **Step 3: `/impeccable document`**

Read `.cursor/skills/impeccable/reference/document.md`. Paste:

```text
Read DESIGN.md.

Task: Add the Wf schematic pin subsection so DESIGN.md matches the shipped panel. Do not replace DESIGN.md. Do not change tokens. Do not invent a new visual world.
Skill: /impeccable document. Read .cursor/skills/impeccable/reference/document.md.
Files: DESIGN.md only.
You may edit: yes, one subsection after the Toolbox subsection and before ## Do's and Don'ts.

Use this subsection, verbatim:

### Wf schematic pin

A teal pin sits on the map at 44.878674, 29.515563. The hit target is 44px and uses the pressable scale. It is inside the snapshot. Choosing it opens a panel at the bottom-right of the map, outside the snapshot frame, clear of the home indicator. The panel uses Panel at 95%, 12px corners, a white 15% border, the Float shadow, and the 160ms toolbox pop. Close is 44px. Focus is Focus teal, 2px, offset 2px. The title is Sfântu Gheorghe. The subtitle is Wf schematic, in Focus teal. The caption says the diagram is a type schematic and not a measured map of this coast. Explode is a native slider from nested to pulled apart. The solids track the thumb with no extra ease. Solid colours inside the canvas are gold for beach ridges, grey for swales, green for mouth bars, orange for the channel, and blue for the lobe. Those fills stay inside the canvas.

Done when: that subsection is in DESIGN.md and the rest of the file is unchanged.
```

- [ ] **Step 4: Run the automated checks**

Run: `npm run test && npm run typecheck && npm run lint`

Expected: all three exit 0.

- [ ] **Step 5: Check the pin in the running app**

With `npm run dev` already serving `http://localhost:5173/`:

1. Search or pan to Sfântu Gheorghe. The teal pin is at 44.878674, 29.515563.
2. Open it. The caption in Global Constraints is visible. Nested solids show the channel on the axis, five green mouth bars in a fan, gold ridges and grey swales stepping outward on both flanks, and a blue lobe seaward of the fan.
3. Move Explode from 0 to 1. The four ranks separate and the names stay readable.
4. Close the panel. The pin remains.
5. Reload. The pin is back and Explode is at 0.

Save a short recording under `/opt/cursor/artifacts/`.

6. At about 390px wide, the panel stays on screen, Close and the pin stay easy to hit, and the panel sits above the home indicator.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx PRODUCT.md ScaleFinderPurpose.md DESIGN.md CHANGELOG.md
git commit -m "feat(map): pin the Wf schematic above Sfântu Gheorghe"
```

Add under `### Added`:

`- A pin at 44.878674, 29.515563 opens the Wf type schematic above Sfântu Gheorghe. The pin is in the snapshot. The panel is not.`
