# Wf schematic panel branch summary

**Branch:** `cursor/wf-schematic-panel-design-69e0` (PR [#18](https://github.com/NFernie/ScaleFinder/pull/18), base `main`)  
**Head at time of writing:** panel chrome plus the geometry integration below (beach-ridge mesh file, flattened reflected ridge face, mouth-bar X scale, mouth-bar crown at the channel centre).

This file is for a **follow-up agent working on schematic geometries** (meshes, silhouettes, core numbers). It records what this branch changed in the **UI module** and where every **Three.js** piece lives so you can edit meshes without rediscovering the tree.

## Geometry integration

These branches are merged into `cursor/wf-schematic-panel-design-69e0`. Continue from this head. Do not cut the next geometry branch from an older commit of this branch, and do not leave a geometry edit only on a side branch.

| Branch | What it keeps |
| --- | --- |
| `cursor/beach-ridge-mesh-2a5d` | Beach-ridge loft in `src/ui/beachRidgeGeometry.ts`. The view only places it. |
| `cursor/beach-ridge-flatten-2a5d` | `RIDGE_FACE_SLOPE` 0.25. Logistic reflected across the chord: convex seaward in the upper half, toe flattening seaward. |
| `cursor/mouth-bar-x-overlap-2a5d` | Fan centres scaled toward X = 0. First pass was 50% more overlap. |
| `cursor/mouth-bar-y-raise-2a5d` | Landward apex crown at `channelCenterY()`. Shipped X scale doubles the first overlap (gap 0.32 → 0.14). |

The 50% overlap coefficient is not the runtime scale. The later 100% scale replaces it and keeps the same `MOUTH_FAN_X_SCALE` mechanism.

For mesh authoring workflow and skills, still read [`features/schematic_module.md`](schematic_module.md). Explode is radial from the origin; the panel notes below and [`DESIGN.md`](../DESIGN.md) under `### Wf schematic pin` match that.

---

## What this branch adds (vs `main`)

| Area | Behaviour |
| --- | --- |
| **Pins** | Two teal 44px controls. Symmetric scene at `WF_ANCHOR` (latitude 18.601312, longitude -92.674937). Asymmetric scene at `ASYM_WF_ANCHOR` (Sfântu Gheorghe). Same panel. Place name only on the pin that has one. |
| **Panel** | Title **Wf Schematic**; fixed caption; bottom-right on map; safe-area inset; session-persisted frame size. |
| **3D view** | WebGL when available; fallback text list from `sceneAt(0)` (explode slider does not change the list). |
| **Resize** | Top-left 44px handle; aspect ratio **328∶224**; bottom-right of panel fixed; keyboard ±16px. |
| **Camera** | Start `(6.5, 5.5, 7.5)` looking at `(0, 0.4, 0.6)`. Orbit on drag; **Space + drag** pans; zoom buttons + wheel (detented). Zoom/orbit use `controls.target` after pan. Map does not receive pointer on the canvas (`stopPropagation`). |
| **Explode** | Slider 0–1. Each solid moves along the ray from **origin through its world centre**; at `t = 1` centres are **5×** farther out (`EXPLODE_SPREAD`). Nested pose at `t = 0`. Label bands unchanged (complexes after 0, sets after ⅓, three element labels after ⅔). |
| **Labels** | Canvas sprites on each body group; 120ms opacity fade when a name first appears; `cssEaseOut` in core. |
| **Docs** | [`docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md`](../docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md) (historical; explode/pan superseded by product). |

Geometry **meshes** (ridges, channel, mouth bars, ground box) were largely shipped **before** this panel branch; this branch mainly changed **layout math** (`sceneAt`), **panel/view**, and **camera**. Your geometry pass still touches the same files listed in [Geometry files](#geometry-files-to-modify).

---

## Golden rule: core vs Three.js

| Layer | Path | May import `three`? |
| --- | --- | --- |
| **Scene data** | `src/core/wfSchematic.ts` | **No** — ranks, parents, nested poses, fan layout, ridge station math, `sceneAt`, `bodyCenter`, constants. |
| **Meshes** | `src/ui/beachRidgeGeometry.ts`, `src/ui/halfChannelGeometry.ts`, `src/ui/mouthBarGeometry.ts`. The view only places them. | **Yes** |
| **Panel chrome** | `src/ui/WfSchematicPanel.tsx`, `src/ui/schematicFrame.ts` | No Three.js |

**Contract:** The view calls `sceneAt(explode)` every frame and sets each `THREE.Group` from `PlacedBody.position` and `body.yaw`. If you change only mesh shape, keep `nested` and hierarchy in core unless you are deliberately moving bodies.

---

## Schematic axes and units

- **+X** — alongshore to the right (right flank ridges use **+X** centreline; left flank mirrors mesh in X).
- **+Y** — up.
- **+Z** — seaward.
- Units are **diagram units**, not metres; not georeferenced.

---

## Scene graph (33 bodies)

Ranks (Wf taxonomy):

1. **element-complex-set** — one root: `ecs` (ground / water slab).
2. **element-complex** — `ec-lobe` (group, label only), `ec-mouth` (group, label only).
3. **element-set** — `es-ridge-l`, `es-ridge-r`, `es-mouth` (groups).
4. **element** — four beach ridges per flank (`e-ridge-{l\|r}-0..3`), nine seaward mouth bars (`e-mouth-0..8`), nine proximal mouth bars (`e-mouth-prox-0..8`), one channel (`e-channel`).

**Kinds** (`SolidKind`): `ground` | `channel` | `mouth-bar` | `beach-ridge` | `group`.

- **`group`** — no mesh in the view; label sprite only (tiny placeholder box is **not** used for groups; mesh branch is skipped).
- **`ground`** — `BoxGeometry(8, GROUND_THICKNESS, 6)` in the view.

Parent links and `nested` offsets are defined in the `BODIES` array at the bottom of `src/core/wfSchematic.ts`.

---

## Placement and explode (core)

### Nested pose

At explode `0`, `sceneAt` returns `position: body.nested` exactly (no float drift).

### Yaw

Mouth bars carry `yaw` (radians, +Y). Positive yaw swings the seaward end toward **+X**. Applied on the group: `object.rotation.y = body.yaw ?? 0`.

### Explode (`sceneAt`)

```text
t = clamp(explode, 0, 1)
spread = 1 + (EXPLODE_SPREAD - 1) * t   // EXPLODE_SPREAD = 5

local = rotateYaw(localCenter(body), yaw)
center = bodyCenter(body)   // nested + local in world frame

position = center * spread - local
```

- **`localCenter(body)`** — centroid of mesh in body-local space (ridge: mean of stations; mouth bar: `(0, MOUTH_BAR_SCALE.y/2, 0)`; channel: `(0, -CHANNEL_RADIUS/2, 0)`; group/ground: origin).
- **`bodyCenter(body)`** — exported; use for tests and explode direction.

Explode is **uniform per body** (not staggered bands in time). Label visibility still uses band thresholds on `t`.

---

## Geometry files to modify

| File | Role |
| --- | --- |
| [`src/core/wfSchematic.ts`](../src/core/wfSchematic.ts) | Silhouette numbers: `beachRidgeStations`, `beachRidgeRing`, `channelSpan`, `mouthFans`, `mouthBarBaseOffset`, `MOUTH_BAR_*`, `CHANNEL_*`, `RIDGE_*`, `BODIES`, `sceneAt`. |
| [`src/ui/WfSchematicView.tsx`](../src/ui/WfSchematicView.tsx) | `geometryFor` dispatch, materials, lights, labels, render loop, OrbitControls. Placement only. |
| [`src/ui/beachRidgeGeometry.ts`](../src/ui/beachRidgeGeometry.ts) | Beach-ridge loft. Right flank from core stations; left flank is that mesh mirrored in X. |
| [`src/ui/halfChannelGeometry.ts`](../src/ui/halfChannelGeometry.ts) | Half-cylinder mesh; uses `CHANNEL_LENGTH`, `CHANNEL_RADIUS` from core. |
| [`src/ui/mouthBarGeometry.ts`](../src/ui/mouthBarGeometry.ts) | Half-spheroid mesh; uses `MOUTH_BAR_SCALE`, `mouthBarBaseOffset` from core. |

### Dispatch: `geometryFor(body)` in `WfSchematicView.tsx`

```text
ground      → BoxGeometry(8, GROUND_THICKNESS, 6)
channel     → halfChannelGeometry()
mouth-bar   → mouthBarGeometry()
beach-ridge → beachRidgeGeometry(side, index from body.id)
group       → (no mesh)
default     → 0.01 box (unused for current bodies)
```

### Beach ridge mesh (`beachRidgeGeometry.ts`)

1. Core: `beachRidgeStations(side, index)` → stations along the centreline. Channel-end Z spacing stays on the nested Z step. `beachRidgePlanAngleDeg` is 20° on the most seaward ridge and 12% smaller on each ridge landward of it, shearing the tip landward so the stack tapers together and the channel stays the seaward apex. `beachRidgeRing(station)` is the cross-section. The seaward face slope is `RIDGE_FACE_SLOPE` (0.25) of the unsheared wedge. The logistic is reflected across the chord so the upper half is seaward of it and the toe flattens seaward.
2. Mesh: one loft per ridge index. Stacks the **right** rings, quads between stations, caps at both ends. `'l'` negates X and flips winding. The view picks `'r'` when `body.id` contains `-r-`, otherwise `'l'`, and passes the trailing index.

### Channel mesh (`halfChannelGeometry.ts`)

- Half cylinder along **+Z**; flat face at **y = 0** (top); arc to **y = −radius**.
- Origin = centre of flat face (mid-length on Z).
- End caps at `z = ±CHANNEL_LENGTH/2`.

### Mouth bar mesh (`mouthBarGeometry.ts`)

- Half spheroid; base Y from `mouthBarBaseOffset(z, halfZ)` (sigmoid dip seaward).
- Dome on upper hemisphere; 8 ring × 32 segment layout; `computeVertexNormals()`.

### Materials and colours (view)

| Kind | Colour | Notes |
| --- | --- | --- |
| ground | `WATER_COLOUR` (`0x38bdf8`) | `transparent`, `WATER_OPACITY` 0.3, `depthWrite: false` |
| channel | `0xf97316` | opaque |
| mouth-bar | `0x4ade80` | opaque |
| beach-ridge | `0xeab308` | `flatShading: true` |
| group | n/a | label only |

Lights: ambient + hemisphere + directional (fixed positions in view setup).

### Labels

- `THREE.Sprite` + `CanvasTexture`, local offset `y = 0.45`, scale `(1.6, 0.3, 1)`.
- `depthTest: false` on sprite material.
- Opacity driven by `body.showLabel` and fade state in the animation loop.

---

## Three.js scene lifecycle (`WfSchematicView.tsx`)

1. **Mount once** (`useEffect`, empty deps): create renderer (alpha), scene, camera, OrbitControls, one **Group per body id** from `sceneAt(0)`.
2. **Geometries** created at mount; **not** rebuilt when explode changes — only `place(group, body)` updates transforms.
3. **`tick`**: `sceneAt(explodeRef.current)` → update positions + label fade → `controls.update()` → render.
4. **Cleanup**: dispose all geometries, materials, textures, controls, `renderer.forceContextLoss()`.

**Imports:** `import * as THREE from 'three'`; `OrbitControls` from `three/addons/controls/OrbitControls.js`.

**Camera helpers:** `cameraPositionAtDistance`, `zoomDistance`, `wheelZoomStep` live in `src/ui/schematicFrame.ts` (not Three-specific but used by the view).

---

## Key exports from `wfSchematic.ts` (for mesh tests)

| Export | Use |
| --- | --- |
| `CHANNEL_RADIUS`, `CHANNEL_LENGTH` | Channel size (length from `channelSpan()`). |
| `MOUTH_BAR_SCALE`, `MOUTH_BAR_DIP`, `MOUTH_BAR_STEP`, `MOUTH_BAR_YAW_STEP` | Mouth bar layout and mesh. |
| `GROUND_THICKNESS`, `WATER_COLOUR`, `WATER_OPACITY` | Ground slab. |
| `beachRidgeStations`, `beachRidgeRing` | Ridge silhouette. |
| `channelSpan`, `waterlineY`, `mouthBarBaseOffset`, `mouthBarCrownY`, `seawardRidgeBaseY` | Alignment constraints (tests document channel–ridge meeting). |
| `sceneAt`, `bodyCenter`, `EXPLODE_SPREAD` | Layout and explode. |
| `WF_ANCHOR` | Map pin only. |

---

## Tests you should extend

| File | Covers |
| --- | --- |
| [`src/core/wfSchematic.test.ts`](../src/core/wfSchematic.test.ts) | Hierarchy, channel trim, ridge stacking, **radial explode**, labels, `cssEaseOut`. |
| [`src/ui/wfChannelGeometry.test.ts`](../src/ui/wfChannelGeometry.test.ts) | Half-cylinder bounds and face normals. |
| [`src/ui/beachRidgeGeometry.test.ts`](../src/ui/beachRidgeGeometry.test.ts) | Right-flank loft matches core rings; left flank is the X mirror. |
| [`src/ui/mouthBarGeometry.test.ts`](../src/ui/mouthBarGeometry.test.ts) | Spheroid bounds, seaward dip, crown height. |
| [`src/ui/WfSchematicPanel.test.tsx`](../src/ui/WfSchematicPanel.test.tsx) | Panel DOM, resize, list fallback (jsdom has no WebGL). |

Run:

```bash
npm run test -- src/core/wfSchematic.test.ts src/ui/wfChannelGeometry.test.ts src/ui/beachRidgeGeometry.test.ts src/ui/mouthBarGeometry.test.ts
npm run lint && npm run typecheck && npm run build
```

MapLibre / full explode / orbit: **manual** in browser (`npm run dev`, port 5173). At full explode, zoom out to see separation.

---

## UI files (usually leave alone for geometry-only work)

| File | Role |
| --- | --- |
| `src/ui/WfSchematicPanel.tsx` | Shell, explode slider, resize, zoom buttons, WebGL probe. |
| `src/ui/schematicFrame.ts` | Frame limits, zoom math, pan/orbit mode helper. |
| `src/map/WfSchematicPin.tsx` | Map marker. |
| `src/App.tsx` | `wfOpen`, `wfFrame`, panel wrapper position. |

Do not change pin, caption, or panel chrome for a geometry pass unless design explicitly moves.

---

## Not drawn (product)

- Swales, mouth-bar **slab**, lobe **solid** (only **Wf-Lobe** / **Wf-Mouth Bar** group labels).
- Do not texture the PNG onto meshes.

Reference PNG: [`WF_element complex set.png`](../WF_element%20complex%20set.png) (plan only).

---

## Stale references

| Doc | Issue |
| --- | --- |
| [`features/schematic_module.md`](schematic_module.md) | Says explode adds **Y by rank**; branch uses **origin radial** `sceneAt`. |
| [`docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md`](../docs/superpowers/specs/2026-10-09-wf-schematic-panel-design.md) | Original **sphere bands** (8/6/5) and **no pan**; superseded by `DESIGN.md` + this branch. |

**Source of truth for current explode/pan/copy:** [`DESIGN.md`](../DESIGN.md) `### Wf schematic pin`, [`CHANGELOG.md`](../CHANGELOG.md) `[Unreleased]`.

---

## Commands and stack

- **Three.js:** `^0.186.1` (package.json); only the schematic view imports it.
- **Vitest** for core + geometry unit tests.
- Every product commit: line under `CHANGELOG.md` → `## [Unreleased]`.

---

## Quick checklist for a geometry agent

1. Read [`PRODUCT.md`](../PRODUCT.md) / purpose — do not add out-of-scope features.
2. Change silhouette in **core** first (`beachRidgeStations` / `channelSpan` / fan tables), then mesh builders.
3. Keep **`three` out of `src/core/`**.
4. Extend **Vitest** for any new numeric invariant.
5. Manually verify nested (`explode = 0`) and full explode; check channel meets seaward ridge (tests already assert several joins).
6. Do not ease explode or move label band logic unless product asks.
