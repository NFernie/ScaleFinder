# Element Mesh List

Inventory of **Three.js element meshes** already built for the Wf type schematic, on branch `cursor/wf-schematic-panel-design-69e0`.

**Scenes:** `wf` (`src/core/wfSchematic.ts`, pin at 18.601312°N, 92.674937°W) and `asym` (`src/core/asymWfSchematic.ts`, pin at Sfântu Gheorghe). Both render in [`src/ui/WfSchematicView.tsx`](../src/ui/WfSchematicView.tsx) via `geometryFor()`. Layout, ranks, nested poses, yaw, and explode come from core `sceneAt(explode)` — meshes do not choose where they sit.

**Axes:** +X alongshore (right flank), +Y up, +Z seaward. Land is −Z; the channel sits on the axis.

| Name | File | Geometry (size, shape) | Where used | Scene arrangement (position / taper / angles) |
| --- | --- | --- | --- | --- |
| **Ground (water slab)** | Inline in `WfSchematicView.tsx` (`BoxGeometry`) | Box **8 × 0.05 × 6** (`GROUND_THICKNESS`). Blue, 30% opacity, `depthWrite` off. | `wf` and `asym` — body `ecs`, kind `ground`. | Nested under origin stack: top of slab = water line (`waterlineY()`), below channel base. Parent of `ec-lobe` and `ec-mouth`. Explode: centre moves radially (`EXPLODE_SPREAD` = 5× at slider 1). |
| **Channel (half cylinder)** | [`src/ui/halfChannelGeometry.ts`](../src/ui/halfChannelGeometry.ts) | Custom `BufferGeometry`. Half-cylinder along **+Z**: radius **0.1** (`CHANNEL_RADIUS`), length **~2.57** (`CHANNEL_LENGTH` from `channelSpan()`). Flat face at **y = 0** (top); arc to **y = −radius**. End caps at **z = ±length/2**. Origin = centre of flat face. | `wf` and `asym` — body `e-channel`, kind `channel`. | Nested in mouth-bar complex: **(0, channelSpan().flatY, channelSpan().centerZ)**. **+Z** tip meets thick end of most seaward beach ridge; landward reach **1.55** beyond landward ridge stack. No yaw. |
| **Mouth bar (half spheroid)** | [`src/ui/mouthBarGeometry.ts`](../src/ui/mouthBarGeometry.ts) | Custom `BufferGeometry`. Half spheroid: diameters **X 0.5, Y 0.084, Z 1.08** (`MOUTH_BAR_SCALE`). Flat base follows sigmoid dip seaward (`MOUTH_BAR_DIP` **0.18**); dome on upper hemisphere (8 rings × 32 segments). Local **y = 0** on landward rim of base. | `wf` and `asym` — **18** elements: `e-mouth-0…8` (seaward fan) and `e-mouth-prox-0…8` (proximal fan), kind `mouth-bar`. | Under `es-mouth` → `ec-mouth`. **Two fans:** (1) seaward V in front of channel; (2) proximal fan from landward ridge under channel, prograding seaward. Fan template **9** bars; X centres scaled by `MOUTH_FAN_X_SCALE` (doubled overlap vs original **0.32** gap → **~0.14** between inner bars). Each seaward step: **−5%** of bar thickness in Y (`MOUTH_BAR_STEP`), **+1°** yaw per step off-axis (`MOUTH_BAR_YAW_STEP`, sign from X). Landward apex crown aligned to **channel centre Y** (`mouthBarComplexLift()`). |
| **Beach ridge (symmetric loft)** | [`src/ui/beachRidgeGeometry.ts`](../src/ui/beachRidgeGeometry.ts) | Custom lofted `BufferGeometry` from `beachRidgeStations` + `beachRidgeRing` in core. Alongshore **X 0.1 → 3.45** (channel → tip), **10** stations. Cross-section: crest + logistic seaward face (`RIDGE_FACE_SLOPE` **0.25**, base sheared seaward **0.12**). Half-width **0.13** tapering to tip **0.015**. Height thick at channel, tip above water. **Right** flank built in +X; **left** = mirror X + flipped winding. `flatShading` in view. | **`wf`:** all **8** ridges (`e-ridge-l-0…3`, `e-ridge-r-0…3`). **`asym`:** **right** flank only (`e-ridge-r-*`). | Per flank: set group at **x = ±1.7**, **4** elements indexed **0 = landward … 3 = seaward**. Nested Z step **0.34** at channel end; Y step **2%** of reference crest between ridges (`RIDGE_DOWNSTEP`). Plan centreline: landward bow + tip sigmoid; **20°** landward shear at channel on most seaward ridge, **12%** less per step landward (`beachRidgePlanAngleDeg`). Tips taper together; channel stays seaward apex. |
| **Beach ridge (asymmetric loft)** | [`src/ui/asymmetricBeachRidgeGeometry.ts`](../src/ui/asymmetricBeachRidgeGeometry.ts) + centreline [`src/core/asymmetricBeachRidgePlan.ts`](../src/core/asymmetricBeachRidgePlan.ts) | Same cross-section and taper as symmetric (`beachRidgeRing`). Plan centreline: **crescent** — seaward bow **0.72** above channel–tip chord, crest at **33%** of length from channel (`ASYM_RIDGE_CREST`), blends onto symmetric curve by **58%** length; **25** stations. Left flank mirror same as symmetric mesh. | **`asym` only:** **left** flank (`e-ridge-l-*`). Dispatch: `beachRidgeMesh('asym', id)` in [`src/core/schematicScene.ts`](../src/core/schematicScene.ts). | Same nested poses and stack as symmetric left flank; only the lofted plan shape differs (convex seaward bow with crest in channel half, outer tip matches symmetric tip). |

## Not drawn as meshes

| Name | Notes |
| --- | --- |
| **Rank groups** (`ec-lobe`, `ec-mouth`, `es-ridge-l/r`, `es-mouth`, …) | Labels only; no geometry (`kind: 'group'`). |
| **Swale, mouth-bar slab, lobe solid** | Intentionally omitted (see [`features/schematic_module.md`](schematic_module.md)). |

## Built, not yet in a scene view

| Name | File | Geometry (size, shape) | Where used | Scene arrangement (position / taper / angles) |
| --- | --- | --- | --- | --- |
| **Tidal channel (funnel half cylinder)** | [`src/ui/tidalChannelGeometry.ts`](../src/ui/tidalChannelGeometry.ts) | Custom `BufferGeometry`. Half-circle cross-section (flat **y = 0**, arc downward). Length **1.5× CHANNEL_LENGTH**, extra length landward; seaward tip stays with the half channel. Landward width **2 × CHANNEL_RADIUS**. Constant width until mid-length, then a **u²** flare concave toward the centre to **5×** width (`TIDAL_CHANNEL_SEAWARD_WIDTH_RATIO`). | **None yet** — plan preview only (`tidalChannelPlanSvg`). Not in `geometryFor()`. | When wired: **+Z** seaward, flat top **y = 0**. No nested pose defined. |

## Helpers (not scene meshes)

| Name | File | Purpose |
| --- | --- | --- |
| **Asymmetric plan SVG** | `asymmetricBeachRidgePlanSvg()` in `asymmetricBeachRidgeGeometry.ts` | 2D plan comparison (symmetric dashed vs asymmetric solid). Not wired into `WfSchematicView`. |
| **Tidal channel plan SVG** | `tidalChannelPlanSvg()` in `tidalChannelGeometry.ts` | Plan view of funnel vs constant half channel. Not wired into `WfSchematicView`. |

## Core silhouette (no Three.js)

| Module | Role |
| --- | --- |
| [`src/core/wfSchematic.ts`](../src/core/wfSchematic.ts) | Symmetric scene: `beachRidgeStations`, `beachRidgeRing`, `channelSpan`, mouth-bar fan, `sceneAt`, anchors `WF_ANCHOR`. |
| [`src/core/asymWfSchematic.ts`](../src/core/asymWfSchematic.ts) | Copy of symmetric layout; left ridges use `asymmetricBeachRidgeStations` for centres/explode; anchor `ASYM_WF_ANCHOR`. |
| [`src/core/schematicScene.ts`](../src/core/schematicScene.ts) | `SchematicSceneId` (`wf` \| `asym`) and ridge mesh dispatch. |

## Tests

| Mesh | Test file |
| --- | --- |
| Half channel | [`src/ui/wfChannelGeometry.test.ts`](../src/ui/wfChannelGeometry.test.ts) (imports `halfChannelGeometry`) |
| Tidal channel (funnel) | [`src/ui/tidalChannelGeometry.test.ts`](../src/ui/tidalChannelGeometry.test.ts) |
| Mouth bar | [`src/ui/mouthBarGeometry.test.ts`](../src/ui/mouthBarGeometry.test.ts) |
| Symmetric ridge | [`src/ui/beachRidgeGeometry.test.ts`](../src/ui/beachRidgeGeometry.test.ts) |
| Asymmetric ridge | [`src/ui/asymmetricBeachRidgeGeometry.test.ts`](../src/ui/asymmetricBeachRidgeGeometry.test.ts) |
| Layout / asym scene | [`src/core/wfSchematic.test.ts`](../src/core/wfSchematic.test.ts), [`src/core/asymWfSchematic.test.ts`](../src/core/asymWfSchematic.test.ts) |

Related narrative: [`features/schematic_module.md`](schematic_module.md), [`features/wfpaneldesignsummary.md`](wfpaneldesignsummary.md).
