# 3D explode by scale taxonomy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace radial `EXPLODE_SPREAD` explode with a three-stage ECS → EC → ES → E taxonomy explode (core module + slider markers + auto-framing camera) for `wf`, `asym`, and `tfw`.

**Architecture:** New pure `src/core/explode.ts` classifies bodies by id, computes stage offsets, and emits taxonomy label-only bodies. Each scene’s `sceneAt` builds its rest body list as today, then calls `applyExplode`. UI adds marker ticks and measures mesh extent once at mount to derive per-scene zoom limits, pan clamp, and auto-frame on slider changes only.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, Vitest, Testing Library, `three` only under `src/ui/`, MapLibre panel unchanged except explode chrome.

## Global Constraints

- Branch: `3d_explode_update`. Base for merge: `main`.
- Spec (approved): [`docs/superpowers/specs/2026-11-04-3d-explode-taxonomy-design.md`](../specs/2026-11-04-3d-explode-taxonomy-design.md).
- Three equal linear stages on slider 0–1: `u1 = clamp(3t,0,1)`, `u2 = clamp(3t−1,0,1)`, `u3 = clamp(3t−2,0,1)`. No easing on solids or auto-frame.
- Starting constants (tune by eye, then record in `CHANGELOG.md` and code): `S_EC = 3`, `H = 1.5`, `R_E` ridge set `2.4`, mouth-bar set `0.9`.
- Risen element set: ridge ES index `2`; mouth fan ES index `1` (bars with indices 3–5).
- ECS pivot: centre of body `ecs`. Standalone ids: `e-channel`, `e-channel-l`, `e-channel-l-join`, `e-deltaplain` — stage 1 only, never rise.
- `ZOOM_MIN = 2`, `ZOOM_MAX = 60` (floor for derived max). `fitDistance` margin default `1.15`. Camera FOV `40`. Start camera `(6.5, 5.5, 7.5)` → target `(0, 0.4, 0.6)` unchanged on open/pin switch.
- Auto-frame on every explode value change; not on open or scene change. Pan clamp to full-explode sphere measured at mount from real mesh boxes at `t ∈ {0, ⅓, ⅔, 1}` (labels excluded).
- Slider: native range, role `slider`, name **Explode**, 0–1, step 0.01, End → 1, focus ring `#5eead4`. Four markers ECS/EC/ES/E; reached = Mist `#f0fdfa` + Signal teal `#2dd4bf` tick; unreached = Muted `#94a3b8` + white 15% tick.
- No `three` in `src/core/`. Subagents: model slug must start with `cursor-grok-`, `grok-`, or `composer-` (explicit `model`).
- Every code change: `CHANGELOG.md` under `## [Unreleased]`. Update `features/elementmeshlist.md` in the same change set when explode/mesh docs change.
- Gates before done: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Manual WebGL walkthrough for `wf`, `asym`, `tfw` at 0, ⅓, ⅔, 1.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `src/core/explode.ts` | Id classification, stage maths, constants, taxonomy label bodies, `showLabel` thresholds |
| `src/core/explode.test.ts` | Classification counts, stage invariants, labels, linearity |
| `src/core/wfSchematic.ts` | `SceneBody.taxonomyLabelOnly?`, delegate `sceneAt` → `applyExplode`; remove `EXPLODE_SPREAD` / radial explode |
| `src/core/asymWfSchematic.ts` | Same delegation; delete duplicate explode + `labelVisible` |
| `src/core/tfwEcsSchematic.ts` | Build rest list as today; delegate; delete `explodePosition` |
| `src/core/wfSchematic.test.ts` | Replace radial explode test with integration against new contract |
| `src/ui/schematicFrame.ts` | `fitDistance`, `ZoomLimits`, `zoomDistance(..., limits?)`, `clampTargetInsideSphere`, `frameCameraKeepingDirection` |
| `src/ui/schematicFrame.test.ts` | Tests for new frame helpers |
| `src/ui/WfSchematicView.tsx` | Mount extent union, per-scene limits + far plane, pan clamp each frame, auto-frame on `explode` prop change |
| `src/ui/WfSchematicPanel.tsx` | Marker row, thumb CSS, `aria-valuetext`, filter taxonomy labels from fallback list, chrome fallback px |
| `src/ui/WfSchematicPanel.test.tsx` | Markers, aria, list length excludes label-only bodies |
| `DESIGN.md`, `features/*.md`, `CHANGELOG.md` | Spec §10 copy |

**Mount contract:** `applyExplode` always returns the same body id set for every `t` (including taxonomy label-only groups). `WfSchematicView` builds Three.js groups once from `layoutAt(scene, 0)` so label-only ids exist before the first tick.

---

### Task 1: Classification module

**Files:**
- Create: `src/core/explode.ts`
- Create: `src/core/explode.test.ts`
- Modify: `src/core/wfSchematic.ts` (add optional flag on `SceneBody` only)

**Interfaces:**
- Consumes: `SceneBody`, `PlacedBody`, `Rank`, `SolidKind` from `wfSchematic.ts`; `SchematicSceneId` from `schematicScene.ts`
- Produces:
  - `export type CenterOf = (body: SceneBody) => { x: number; y: number; z: number }`
  - `export function classifyBody(body: SceneBody): 'skip' | 'ecs' | 'standalone' | { ecKey: string; esIndex: number }`
  - `export function assertAllBodiesClassified(bodies: readonly SceneBody[], scene: SchematicSceneId): void` (throws with id if not)

- [ ] **Step 1: Add `taxonomyLabelOnly?: boolean` to `SceneBody`**

In `src/core/wfSchematic.ts`, on `SceneBody`:

```ts
  /** Label-only taxonomy helper; omit from WebGL-failure text list. */
  taxonomyLabelOnly?: boolean
```

- [ ] **Step 2: Write failing classification tests**

Create `src/core/explode.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sceneAt as asymSceneAt } from './asymWfSchematic'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { classifyBody, countTaxonomy } from './explode'
import { sceneAt as wfSceneAt } from './wfSchematic'

// In tests, build the same rest array each scene’s sceneAt will use (solids only, no taxonomy labels).
// Task 4 may export `restBodies()` from wf/asym/tfw schematics to avoid duplication.
function restBodiesFor(scene: 'wf' | 'asym' | 'tfw'): SceneBody[] { /* wf: BODIES + swaleBodies + shaleBodies; asym/tfw: mirror tfwEcsSchematic assembly */ }

describe('explode classification', () => {
  it('classifies every wf body or marks skip', () => {
    expect(countTaxonomy(restBodiesFor('wf'), 'wf')).toEqual({ ec: 5, es: 19, e: 54 })
  })

  it('classifies every asym body', () => {
    expect(countTaxonomy(restBodiesFor('asym'), 'asym')).toEqual({ ec: 5, es: 19, e: 54 })
  })

  it('classifies every tfw body', () => {
    expect(countTaxonomy(restBodiesFor('tfw'), 'tfw')).toEqual({ ec: 9, es: 33, e: 97 })
  })

  it('maps ridge and mouth ids', () => {
    expect(classifyBody({ id: 'e-ridge-l-2', kind: 'beach-ridge', rank: 'element', parentId: 'x', nested: { x: 0, y: 0, z: 0 } })).toEqual({
      ecKey: 'ridge-l',
      esIndex: 2,
    })
    expect(classifyBody({ id: 'e-mouth-4', kind: 'mouth-bar', rank: 'element', parentId: 'x', nested: { x: 0, y: 0, z: 0 } })).toEqual({
      ecKey: 'mouth',
      esIndex: 1,
    })
    expect(classifyBody({ id: 'e-channel', kind: 'channel', rank: 'element', parentId: 'x', nested: { x: 0, y: 0, z: 0 } })).toBe('standalone')
    expect(classifyBody({ id: 'ec-lobe', kind: 'group', rank: 'element-complex', parentId: 'ecs', nested: { x: 0, y: 0, z: 0 } })).toBe('skip')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/core/explode.test.ts`
Expected: FAIL — cannot find module `./explode` or missing exports.

- [ ] **Step 4: Implement classification**

Create `src/core/explode.ts` with the id table from spec §3 (regex helpers), `classifyBody`, and `countTaxonomy` that iterates solids (`kind !== 'group' && kind !== 'ground'`), classifies, aggregates unique `(ecKey)` for EC count, unique `(ecKey, esIndex)` for ES, and counts elements. Throw on unclassified non-skip body.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/core/explode.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/explode.ts src/core/explode.test.ts src/core/wfSchematic.ts
git commit -m "feat(core): classify schematic bodies for taxonomy explode"
```

---

### Task 2: Stage maths and `applyExplode` positions

**Files:**
- Modify: `src/core/explode.ts`
- Modify: `src/core/explode.test.ts`

**Interfaces:**
- Consumes: `classifyBody`, `CenterOf`
- Produces:
  - `export const S_EC = 3`, `H = 1.5`, `R_E_RIDGE_SET = 2.4`, `R_E_MOUTH_SET = 0.9`
  - `export function stageWeights(t: number): { u1: number; u2: number; u3: number }`
  - `export function applyExplode(bodies: readonly SceneBody[], scene: SchematicSceneId, t: number, centerOf: CenterOf): PlacedBody[]` — positions only for now; `showLabel: false` on all; no taxonomy label bodies yet

- [ ] **Step 1: Write failing stage tests**

Append to `explode.test.ts`:

```ts
import { applyExplode, S_EC, H, R_E_RIDGE_SET, stageWeights } from './explode'
import { bodyCenter, sceneAt as wfSceneAt } from './wfSchematic'

function restWf() {
  return wfSceneAt(0).map(({ position, showLabel, ...body }) => body)
}

describe('explode stages', () => {
  it('returns nested at t=0', () => {
    const rest = restWf()
    const placed = applyExplode(rest, 'wf', 0, bodyCenter)
    for (const body of placed) {
      if (body.taxonomyLabelOnly) continue
      expect(body.position).toEqual(body.nested)
    }
  })

  it('scales EC centres in XZ at t=1/3', () => {
    const rest = restWf()
    const pivot = bodyCenter(rest.find((b) => b.id === 'ecs')!)
    const atThird = applyExplode(rest, 'wf', 1 / 3, bodyCenter)
    // ec-mouth-dist centre distance from pivot ≈ S_EC × rest distance
    const ecId = 'e-mouth-dist-0'
    const ecKey = 'mouth-dist'
    const members = rest.filter((b) => classifyBody(b) !== 'skip' && classifyBody(b) !== 'ecs' && classifyBody(b) !== 'standalone' && (classifyBody(b) as { ecKey: string }).ecKey === ecKey)
    const restC = centroid(members.map(bodyCenter))
    const placedC = centroid(members.map((b) => atThird.find((p) => p.id === b.id)!.position))
    const restDist = xzDist(restC, pivot)
    const placedDist = xzDist(placedC, pivot)
    expect(placedDist).toBeCloseTo(S_EC * restDist, 4)
  })
})
```

Add local helpers `centroid`, `xzDist` in the test file.

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/core/explode.test.ts`

- [ ] **Step 3: Implement stage maths**

In `explode.ts`:

1. Build EC groups: for each `ecKey`, member list + `C` = mean of `centerOf`.
2. Pivot `P` = `centerOf(ecs)`.
3. Stage 1 offset per member of EC (and standalone): `Δ1 = ((C-P).x * (S_EC-1)*u1, 0, (C-P).z * (S_EC-1)*u1)`.
4. Risen ES per EC: `esIndex === 2` when `ecKey.startsWith('ridge')`, else `esIndex === 1`.
5. Stage 2: `Δ2 = (0, H*u2, 0)` for members of risen ES only.
6. Stage 3: for each risen ES at `Cs`, sort members by bearing from `Cs`, compute `φ0` (circular mean; if all offsets ~0 use +Z), `target_k`, `Δ3_k` as spec §4.
7. Groups (`skip`): `position = nested`, `showLabel: false`.
8. Clamp `t` to [0,1].

Export `stageWeights`.

- [ ] **Step 4: Add tests for t=2/3 rise, t=1 ring, Y unchanged in stages 1 and 3, linearity within stage**

Extend `explode.test.ts` per spec §9 (use `bodyCenter`, compare Y at ⅓ vs ⅔ for non-risen sets, ring radius at `t=1`).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm run test -- src/core/explode.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/core/explode.ts src/core/explode.test.ts
git commit -m "feat(core): apply three-stage taxonomy explode positions"
```

---

### Task 3: Taxonomy labels and `showLabel`

**Files:**
- Modify: `src/core/explode.ts`
- Modify: `src/core/explode.test.ts`

**Interfaces:**
- Produces: `applyExplode` appends label-only bodies with ids like `tax-label-ec-ridge-l`, `tax-label-es-ridge-l-2`; sets `taxonomyLabelOnly: true`, `kind: 'group'`, `rank` matching label level; positions at EC/ES centre + same Δ as cluster; `showLabel` per spec §6 thresholds

- [ ] **Step 1: Write failing label count tests**

```ts
it('shows taxonomy labels at thresholds on wf', () => {
  const rest = restWf()
  const at0 = applyExplode(rest, 'wf', 0, bodyCenter)
  expect(at0.filter((b) => b.showLabel && !b.taxonomyLabelOnly).map((b) => b.id)).toEqual(['ecs'])
  const above0 = applyExplode(rest, 'wf', 0.01, bodyCenter)
  expect(above0.filter((b) => b.showLabel && b.taxonomyLabelOnly && b.rank === 'element-complex')).toHaveLength(5)
  const aboveThird = applyExplode(rest, 'wf', 1 / 3 + 0.01, bodyCenter)
  expect(aboveThird.filter((b) => b.showLabel && b.taxonomyLabelOnly && b.rank === 'element-set')).toHaveLength(5)
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement EC/ES/E label bodies and visibility**

- EC names from spec §6 table keyed by `ecKey` + scene.
- ES name: `Beach-ridge set` vs `Mouth-bar set` from `ecKey`.
- E kind representatives: scan order in spec §6; standalone Es use existing `name`.
- Scene-graph groups: always `showLabel: false`, `position: nested`.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/core/explode.ts src/core/explode.test.ts
git commit -m "feat(core): taxonomy explode labels and label-only bodies"
```

---

### Task 4: Wire `wf`, `asym`, and `tfw` `sceneAt`

**Files:**
- Modify: `src/core/wfSchematic.ts`
- Modify: `src/core/asymWfSchematic.ts`
- Modify: `src/core/tfwEcsSchematic.ts`
- Modify: `src/core/wfSchematic.test.ts` (remove `EXPLODE_SPREAD` import usage later in Task 6)

**Interfaces:**
- Consumes: `applyExplode(restBodies, scene, t, bodyCenter)` (asym/tfw import `bodyCenter` from wf or local export)

- [ ] **Step 1: Write failing integration test**

In `wfSchematic.test.ts`, temporarily add:

```ts
it('delegates explode to taxonomy module at full spread', () => {
  const full = sceneAt(1)
  expect(full.find((b) => b.id === 'e-ridge-r-2')!.position.y).toBeGreaterThan(
    sceneAt(1 / 3).find((b) => b.id === 'e-ridge-r-2')!.position.y,
  )
})
```

- [ ] **Step 2: Run — FAIL** (radial explode still flat Y)

- [ ] **Step 3: Replace `sceneAt` in `wfSchematic.ts`**

```ts
import { applyExplode } from './explode'

export function sceneAt(explode: number): PlacedBody[] {
  const t = Math.min(1, Math.max(0, explode))
  const rest = [...BODIES, ...swaleBodies('wf', BODIES), ...shaleBodies('wf', BODIES)]
  return applyExplode(rest, 'wf', t, bodyCenter)
}
```

**Important:** Build one rest array: `BODIES` + generated swales/shales (as `SceneBody[]` without placement). Single `applyExplode` call. Remove `EXPLODE_SPREAD`, `labelVisible`, radial `fill` travel.

- [ ] **Step 4: Mirror in `asymWfSchematic.ts`** — rest list + `applyExplode(..., 'asym', t, bodyCenter)`.

- [ ] **Step 5: Refactor `tfwEcsSchematic.ts`** — assemble `restBodies` exactly as today’s sources (`ground`, `rested`, `extras`, `plain`, swales, shales); delete `explodePosition`; `return applyExplode(restBodies, 'tfw', t, bodyCenter)`; remove duplicate label rules.

- [ ] **Step 6: Run integration test — PASS**

Run: `npm run test -- src/core/wfSchematic.test.ts`

- [ ] **Step 7: Commit**

```bash
git add src/core/wfSchematic.ts src/core/asymWfSchematic.ts src/core/tfwEcsSchematic.ts src/core/wfSchematic.test.ts
git commit -m "feat(core): delegate sceneAt to taxonomy explode module"
```

---

### Task 5: Replace wf radial explode tests

**Files:**
- Modify: `src/core/wfSchematic.test.ts`

- [ ] **Step 1: Remove test `spreads every centre from the origin and keeps one label per element kind`**

- [ ] **Step 2: Add contract test aligned with spec**

Test at 0/⅓/⅔/1: label ids for mesh bodies + taxonomy labels; rigid EC at ⅓; risen ES at ⅔; representative E labels at 1; clamp `at(-1)`, `at(2)`.

- [ ] **Step 3: Run `npm run test -- src/core/wfSchematic.test.ts` — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/core/wfSchematic.test.ts
git commit -m "test(core): update wf schematic explode expectations"
```

---

### Task 6: Frame maths in `schematicFrame.ts`

**Files:**
- Modify: `src/ui/schematicFrame.ts`
- Modify: `src/ui/schematicFrame.test.ts`

**Interfaces:**
- Produces:
  - `export function fitDistance(radius: number, fovDeg: number, aspect: number, margin?: number): number`
  - `export type ZoomLimits = { min: number; max: number }`
  - `export function zoomDistance(distance: number, direction: 'in' | 'out', limits?: ZoomLimits): number`
  - `export function clampTargetInsideSphere(target, center, radius): typeof target`
  - `export function frameCameraKeepingDirection(params: { position, target, sphereCenter, sphereRadius, fovDeg, aspect, margin?, limits }): { position, target }`

- [ ] **Step 1: Write failing tests**

```ts
it('fitDistance uses the tighter half-angle', () => {
  const d = fitDistance(10, 40, 1)
  expect(d).toBeGreaterThan(10)
  expect(fitDistance(10, 40, 0.5)).toBeGreaterThan(d)
})

it('zoomDistance respects custom limits', () => {
  const limits = { min: 2, max: 100 }
  expect(zoomDistance(90, 'out', limits)).toBe(100)
})

it('clampTargetInsideSphere pulls an outside target back', () => {
  const c = { x: 0, y: 0, z: 0 }
  const out = clampTargetInsideSphere({ x: 50, y: 0, z: 0 }, c, 10)
  expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(10, 5)
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement helpers** (update existing `zoomDistance` signature with optional third arg defaulting to `ZOOM_MIN`/`ZOOM_MAX`).

- [ ] **Step 4: Run `npm run test -- src/ui/schematicFrame.test.ts` — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ui/schematicFrame.ts src/ui/schematicFrame.test.ts
git commit -m "feat(ui): schematic frame fit distance and pan clamp helpers"
```

---

### Task 7: View extent, limits, auto-frame, pan clamp

**Files:**
- Modify: `src/ui/WfSchematicView.tsx`

**Interfaces:**
- Consumes: `fitDistance`, `frameCameraKeepingDirection`, `clampTargetInsideSphere`, `zoomDistance(..., limits)`, `layoutAt`

- [ ] **Step 1: Manual checklist (no automated test)** — document in commit message; verified in Task 10.

- [ ] **Step 2: After mesh mount, measure full-explode sphere**

For `sampleT of [0, 1/3, 2/3, 1]`:
- `layoutAt(scene, sampleT)` → for each non-group mesh body, `Box3.setFromObject(mesh)` → union → `BoundingSphere`.
- Store `fullExplodeSphere` and `zoomLimits = { min: ZOOM_MIN, max: Math.max(ZOOM_MAX, fitDistance(r, 40, aspect)) }`.
- Set `camera.far = Math.max(100, zoomLimits.max + 2 * r)`.
- Set `controls.minDistance`, `controls.maxDistance` from `zoomLimits`.
- Restore layout at current explode.

- [ ] **Step 3: Pan clamp in tick** — after `controls.update()`, `controls.target.copy(clampTargetInsideSphere(controls.target, fullExplodeSphere.center, fullExplodeSphere.radius))`.

- [ ] **Step 4: Auto-frame `useEffect` on `[explode]`** (not on scene mount alone) — measure sphere at current `explode` from mesh boxes; `frameCameraKeepingDirection`; update camera + target; no animation.

- [ ] **Step 5: Pass `zoomLimits` into wheel zoom and imperative `zoomBy`**

Replace bare `zoomDistance(distance, direction)` with `zoomDistance(distance, direction, zoomLimitsRef.current)`.

- [ ] **Step 6: Run `npm run typecheck`**

- [ ] **Step 7: Commit**

```bash
git add src/ui/WfSchematicView.tsx
git commit -m "feat(ui): auto-frame explode and dynamic schematic zoom limits"
```

---

### Task 8: Explode slider markers and fallback list

**Files:**
- Modify: `src/ui/WfSchematicPanel.tsx`
- Modify: `src/index.css` (only if needed for 16px range thumb)
- Modify: `src/ui/WfSchematicPanel.test.tsx`

**Interfaces:**
- Export from panel or small helper: `explodeAriaValueText(t: number): string` per spec §5 table
- `sortedBodies` / `bodiesAt`: filter `!body.taxonomyLabelOnly`

- [ ] **Step 1: Write failing panel tests**

```tsx
it('shows four explode scale markers', () => {
  renderPanel()
  expect(screen.getByText('ECS')).toBeInTheDocument()
  expect(screen.getByText('E')).toBeInTheDocument()
})

it('excludes taxonomy label-only bodies from the text list', () => {
  renderPanel({ webgl: false })
  const meshCount = wfSceneAt(0).filter((b) => !b.taxonomyLabelOnly).length
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(meshCount)
})
```

Adjust `meshCount` after Task 4 — list uses `sceneAt(0)` which includes taxonomy bodies; filter in panel.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement marker row**

Under the range input:
- `aria-hidden` tick row; labels ECS/EC/ES/E at `left: calc(8px + (100% - 16px) * f)` for `f in [0, 1/3, 2/3, 1]`.
- Reached when `explode >= f` (with epsilon for float).
- Classes: `text-[#f0fdfa]` / `text-[#94a3b8]`, tick border/bg `#2dd4bf` vs `white/15`.
- Range input class includes fixed thumb width (WebKit + Moz if present in repo patterns).
- Bind `aria-valuetext={explodeAriaValueText(explode)}`.

- [ ] **Step 4: Bump `PANEL_VERTICAL_CHROME_FALLBACK_PX`** in `schematicFrame.ts` by measured marker row height (start with `+28` → `246`; refine after render).

- [ ] **Step 5: Run `npm run test -- src/ui/WfSchematicPanel.test.tsx` — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/ui/WfSchematicPanel.tsx src/ui/WfSchematicPanel.test.tsx src/ui/schematicFrame.ts src/index.css
git commit -m "feat(ui): explode slider taxonomy markers and aria value text"
```

---

### Task 9: Documentation and changelog

**Files:**
- Modify: `DESIGN.md` (Explode + camera paragraphs per spec §10)
- Modify: `features/elementmeshlist.md` (Ground explode sentence, core module, tests, label-only note)
- Modify: `features/wfpaneldesignsummary.md`, `features/schematic_module.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Apply DESIGN.md replacements** — verbatim from spec §10 proposed paragraphs.

- [ ] **Step 2: Update feature docs** — remove `EXPLODE_SPREAD` radial wording; describe three stages and `src/core/explode.ts`.

- [ ] **Step 3: CHANGELOG `[Unreleased]` entry** — user-facing explode behaviour, slider markers, camera auto-frame/pan clamp.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md features/elementmeshlist.md features/wfpaneldesignsummary.md features/schematic_module.md CHANGELOG.md
git commit -m "docs: record taxonomy explode design in product docs"
```

---

### Task 10: Visual tuning, polish, and gates

**Files:**
- Modify: `src/core/explode.ts` (constants only if tuned)

- [ ] **Step 1: Start dev server** (if not running): `npm run dev`

- [ ] **Step 2: Manual walkthrough** — `computerUse` or desktop Chrome at `http://localhost:5173/`: open `wf`, `asym`, `tfw` pins; drag explode to 0, ⅓, ⅔, 1; verify stage behaviour, markers, labels, auto-frame, pan clamp, full zoom-out shows all meshes at `t=1`. Record demo video to `/opt/cursor/artifacts/`.

- [ ] **Step 3: Tune `S_EC`, `H`, `R_E_*` by eye**; update constants + CHANGELOG tuning note.

- [ ] **Step 4: Read `$2/impeccable/SKILL.md` and run one polish pass** on the slider + marker row only (spacing, alignment, a11y contrast).

- [ ] **Step 5: Gates**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 6: Write `/opt/cursor/artifacts/code-tour-author-handoff.md`** (decision / risk / verified).

- [ ] **Step 7: Commit any tuning**

```bash
git add -A
git commit -m "chore: tune explode spread constants after visual review"
```

- [ ] **Step 8: Push branch**

```bash
git push -u origin 3d_explode_update
```

---

## Plan self-review

| Spec section | Task |
| --- | --- |
| §1 Goal | Tasks 2–7, 10 |
| §2 Confirmed decisions | Global constraints + Tasks 2–8 |
| §3 Classification | Task 1 |
| §4 Stage maths | Task 2 |
| §5 Slider markers | Task 8 |
| §6 Labels | Task 3 |
| §7 Camera | Tasks 6–7 |
| §8 Architecture/files | Tasks 1–8 |
| §9 Tests | Tasks 1–6, 8, 10 |
| §10 Documentation | Task 9 |
| §11 Out of scope | Not planned |
| §12 Risks | Task 10 tuning; handoff risk note |

Placeholder scan: none (no TBD steps).

Type consistency: `applyExplode`, `ZoomLimits`, `taxonomyLabelOnly`, `fitDistance` names match across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-04-3d-explode-taxonomy.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
