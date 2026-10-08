# Wf schematic pin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

---

### Task 1: Hierarchy module

**Files:**
- Create: `src/core/wfSchematic.ts`
- Test: `src/core/wfSchematic.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `WF_ANCHOR`, `SceneBody`, `PlacedBody`, `sceneAt(explode: number): PlacedBody[]`

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

### Task 2: Pin and panel shell

**Files:**
- Create: `src/map/WfSchematicPin.tsx`
- Create: `src/ui/WfSchematicPanel.tsx`
- Create: `src/ui/WfSchematicPanel.test.tsx`

**Interfaces:**
- Consumes: `WF_ANCHOR`, `sceneAt` from `src/core/wfSchematic.ts`
- Produces: `WfSchematicPin({ onOpen })`, `WfSchematicPanel({ open, onClose })`, `webglAvailable(): boolean`

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
        className="flex h-11 w-11 items-center justify-center"
      >
        <span className="h-3 w-3 rounded-full border-2 border-white bg-[#2dd4bf] shadow-[0_2px_6px_rgb(0_0_0/0.45)]" />
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
      className="pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-xl bg-[#131c2e]/95 p-3 text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
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
          className="min-h-11 rounded-lg px-3 text-sm"
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

The slider is unwired until Task 3. The text list is the WebGL fallback and is what jsdom renders, because jsdom does not provide WebGL.

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

### Task 3: Three.js explode view

**Files:**
- Modify: `package.json` (dependency `three`)
- Modify: `package-lock.json`
- Create: `src/ui/WfSchematicView.tsx`
- Modify: `src/ui/WfSchematicPanel.tsx`

**Interfaces:**
- Consumes: `sceneAt`, `PlacedBody`, `SolidKind` from `src/core/wfSchematic.ts`; `webglAvailable` from `src/ui/WfSchematicPanel.tsx`
- Produces: `WfSchematicView({ explode: number })`

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

### Task 4: Map pin, product copy, and the manual check

**Files:**
- Modify: `src/App.tsx`
- Modify: `PRODUCT.md`
- Modify: `ScaleFinderPurpose.md`
- Modify: `DESIGN.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `WfSchematicPin`, `WfSchematicPanel`
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
  <div className="absolute bottom-3 right-3 z-10">
    <WfSchematicPanel open={wfOpen} onClose={() => setWfOpen(false)} />
  </div>
)}
```

That wrapper is outside `frameRef`, so the panel and the slider stay out of the snapshot.

- [ ] **Step 2: Update the product records**

In `PRODUCT.md`, under `Confirmed for v1:`, after the framed PNG snapshot bullet, add:

`- A Wf schematic pin at 44.878674, 29.515563 opens a type diagram of element, element set, element complex, and element complex set. The diagram is not a measured map of that coast.`

In `ScaleFinderPurpose.md`, under `## In scope for v1`, after the framed PNG snapshot bullet, add the same sentence as a bullet.

In `DESIGN.md`, after the Toolbox subsection and before `## Do's and Don'ts`, add:

```markdown
### Wf schematic pin

A teal pin sits on the map at 44.878674, 29.515563. It is inside the snapshot. Choosing it opens a panel at the bottom-right of the map, outside the snapshot frame, using Panel at 95%, 12px corners, and the Float shadow. The title is Sfântu Gheorghe. The subtitle is Wf schematic. The caption says the diagram is a type schematic and not a measured map of this coast. Explode is a slider from nested to pulled apart. Solid colours inside the canvas are gold for beach ridges, grey for swales, green for mouth bars, orange for the channel, and blue for the lobe. Those fills stay inside the canvas.
```

- [ ] **Step 3: Run the automated checks**

Run: `npm run test && npm run typecheck && npm run lint`

Expected: all three exit 0.

- [ ] **Step 4: Check the pin in the running app**

With `npm run dev` already serving `http://localhost:5173/`:

1. Search or pan to Sfântu Gheorghe. The teal pin is at 44.878674, 29.515563.
2. Open it. The caption in Global Constraints is visible. Nested solids show the channel on the axis, five green mouth bars in a fan, gold ridges and grey swales stepping outward on both flanks, and a blue lobe seaward of the fan.
3. Move Explode from 0 to 1. The four ranks separate and the names stay readable.
4. Close the panel. The pin remains.
5. Reload. The pin is back and Explode is at 0.

Save a short recording under `/opt/cursor/artifacts/`.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx PRODUCT.md ScaleFinderPurpose.md DESIGN.md CHANGELOG.md
git commit -m "feat(map): pin the Wf schematic above Sfântu Gheorghe"
```

Add under `### Added`:

`- A pin at 44.878674, 29.515563 opens the Wf type schematic above Sfântu Gheorghe. The pin is in the snapshot. The panel is not.`
