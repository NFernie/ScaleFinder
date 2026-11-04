# 3D explode by scale taxonomy — Design Spec

- **Status:** Design approved 2026-11-04. Implementation plan: [`docs/superpowers/plans/2026-11-04-3d-explode-taxonomy.md`](../plans/2026-11-04-3d-explode-taxonomy.md).
- **Date:** 2026-11-04
- **Branch:** `3d_explode_update` (cut from `main` at `7d79fd4`; the panel-design branch, PR #18, is already in `main`)
- **Revises:** the Explode and Camera parts of [`2026-10-09-wf-schematic-panel-design.md`](2026-10-09-wf-schematic-panel-design.md), and the Explode paragraph and camera paragraph under `### Wf schematic pin` in [`DESIGN.md`](../../../DESIGN.md). Pins, caption, title, resize, colours, and every mesh stay as they are.
- **Taxonomy source:** the Taxonomy section of [`features/elementmeshlist.md`](../../../features/elementmeshlist.md) on `main`.
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)

## 1. Goal

Make Explode open the four scales of the new taxonomy, one stage at a time, so each scale can be told apart by its parts:

**ECS → EC → ES → E** (element complex set, element complex, element set, element).

Not everything explodes. The element complexes separate, one element set in each complex rises, and the elements of that set spread out. The rest stays nested. A viewer sees a worked example of each smaller scale and can still see the larger scales around it. The camera frames the arrangement as the slider moves, and pan and zoom reach every mesh at full explode.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Stages | Three equal stages on the one 0–1 slider: ECS → EC (0 to ⅓), EC → ES (⅓ to ⅔), ES → E (⅔ to 1). Linear with the thumb. No ease and no snapping |
| EC stage | Each element complex moves as one rigid block, away from the ECS centre, in the XZ plane. Y never changes |
| ES stage | In each element complex, one element set rises straight up in Y. The other element sets stay nested in the complex cluster |
| E stage | The elements of each risen element set spread out in a circle in the XZ plane around that set's centre, at the risen height. Elements of the other sets stay nested |
| Risen set | The middle one: ridge index 2 of a flank, and bars 3–5 of a fan. One in every element complex: 5 in `wf` and `asym`, 9 in `tfw` |
| ECS | The water slab (`ecs`) stays put. Its centre is the pivot for the EC stage |
| Standalone elements | The channels and the delta plain have no element set or element complex. They move as EC-level pieces in the EC stage and never rise |
| Markers | Four markers on the Explode slider at 0, ⅓, ⅔, and 1, labelled ECS, EC, ES, E. Indicators only, not buttons |
| Labels | Taxonomy labels that follow their cluster. One per EC, one per risen ES, then one per kind of element plus each standalone element |
| Camera | Slider movement auto-frames every mesh. Manual orbit, zoom, and Space-drag pan stay. Pan is clamped to the full-explode sphere. Zoom-out reaches the fit distance |
| Extent | Measured from the real meshes at mount |
| Start camera | Unchanged on open and on pin switch |
| Scenes | `wf`, `asym`, and `tfw` all use the same module |

## 3. Taxonomy classification

A body's element complex and element set are derived from its id. The ids are consistent across the three scenes (checked on 2026-11-04 against `sceneAt(0)` of each).

`{f}` is a flank: `l`, `r`, or `hl`.

| Id | EC key | ES index |
| --- | --- | --- |
| `e-ridge-{f}-{i}` | `ridge-{f}` | `i` |
| `e-swale-{f}-{k}` | `ridge-{f}` | `k + 1` (the set of the seaward ridge of that gap) |
| `e-shale-{f}-{k}` | `ridge-{f}` | `k + 1` |
| `e-mouth-{n}` | `mouth` | `floor(n / 3)` |
| `e-mouth-prox-{n}` | `mouth-prox` | `floor(n / 3)` |
| `e-mouth-sea-{n}` | `mouth-sea` | `floor(n / 3)` |
| `e-mouth-dist-{n}` | `mouth-dist` | `floor(n / 3)` |
| `e-mouth-l-{n}` | `mouth-l` | `floor(n / 3)` |
| `e-mouth-l-prox-{n}` | `mouth-l-prox` | `floor(n / 3)` |
| `e-mouth-l-dist-{n}` | `mouth-l-dist` | `floor(n / 3)` |
| `e-channel`, `e-channel-l`, `e-channel-l-join`, `e-deltaplain` | none (standalone) | none |

Bodies of `kind: 'group'` and the `ground` body are not classified. Any other body that matches no row is an error, and a test fails on it.

Resulting counts, which equal the Taxonomy section of `features/elementmeshlist.md`:

| Scene | EC | ES | E |
| --- | --- | --- | --- |
| `wf`, `asym` | 5 (2 flanks, 3 fans) | 19 | 54 (53 classified + `e-channel`) |
| `tfw` | 9 (3 flanks, 6 fans) | 33 | 97 (93 classified + 4 standalone) |

**Centres, all measured at rest (nested pose):**

- An element's centre is `bodyCenter(body)`.
- An ES centre is the mean of its member centres.
- An EC centre is the mean of its member centres.
- A standalone element is its own centre.
- The ECS pivot is the centre of the `ecs` body. In `tfw` that is the extended slab, so the pivot is the scene's plan centre.

## 4. Stage maths

With `t` the clamped slider value:

```text
u1 = clamp(3t,     0, 1)   // ECS → EC
u2 = clamp(3t - 1, 0, 1)   // EC → ES
u3 = clamp(3t - 2, 0, 1)   // ES → E
```

A body's position is `nested + Δ`, where `Δ` is the sum of the three stage terms below. A body with no term for a stage contributes zero for it. At `t = 0` every position equals `nested` exactly.

**Stage 1, EC.** For an EC (or a standalone element) with centre `C` and pivot `P`, every member gets the same offset:

```text
Δ1 = (C - P)_xz × (S_EC - 1) × u1        // Y component is 0
```

That is a scale about the pivot in the ground plane. A block at the pivot does not move. The arrangement inside the EC does not change.

**Stage 2, ES.** In each EC, the risen ES (ridge index 2, or bars 3–5) gets:

```text
Δ2 = (0, H × u2, 0)
```

Every member of that ES gets the same Δ2. Other sets get none.

**Stage 3, E.** For each risen ES with member count `n` and centre `Cs` (at rest), take each member's rest bearing `θ` in XZ from `Cs`. Sort the members by `θ`, breaking ties by id. Assign ring angles `φ_k = φ0 + 2πk / n` in that order, where `φ0` is the circular mean of `θ_k − 2πk / n`, so the ring turns as little as possible and left stays left. When every offset is zero, `φ0` points seaward (+Z). Then:

```text
target_k = R_E × (cos φ_k, 0, sin φ_k)                     // relative to Cs
Δ3_k     = (target_k - (Ck - Cs))_xz × u3                  // Y component is 0
```

Elements of the other sets get none.

**Starting values** (tuned by eye in the browser during implementation, then recorded in `CHANGELOG.md` and as the constants in the code):

| Constant | Start | Why |
| --- | --- | --- |
| `S_EC` | 3 | `wf` reaches about 11 from the pivot at full explode, against about 19 today at 5× |
| `H` | 1.5 | Ridges are about 0.3 thick, so the lift reads clearly |
| `R_E` for a ridge set | 2.4 | Ridge, swale, and shale are strips about 3.4 long, so the ring has to clear their length |
| `R_E` for a mouth-bar set | 0.9 | Bars are about 0.5 × 1.1 |

Measured at rest on `wf`: EC centres sit 0.75 to 3.23 from the pivot, and the elements of one set sit only 0.1 to 0.9 from their set centre. Scaling alone would not separate them, which is why stage 3 uses a ring.

## 5. Slider markers

- The control stays the native range input. Role `slider`, name **Explode**, 0–1, step 0.01, the End key, and the focus ring stay.
- A marker row sits under the track. Four ticks at 0, ⅓, ⅔, 1, labelled **ECS**, **EC**, **ES**, **E** in the Label type (0.75rem).
- The thumb gets a fixed 16px width through a small CSS class, so tick positions `calc(8px + (100% - 16px) × f)` line up in every browser.
- A marker the thumb is on or past reads as reached: Mist text and a Signal teal tick. An unreached marker is Muted text and a white 15% tick. No new accent colour.
- The markers are `aria-hidden` indicators. The slider's `aria-valuetext` carries the stage:

| Slider | Value text |
| --- | --- |
| 0 | Nested |
| above 0 and below ⅓ | Element complexes separating |
| ⅓ | Element complexes separated |
| above ⅓ and below ⅔ | Element sets rising |
| ⅔ | Element sets risen |
| above ⅔ and below 1 | Elements spreading |
| 1 | Elements spread |

- The row adds height, so `PANEL_VERTICAL_CHROME_FALLBACK_PX` rises by the row's height.

## 6. Labels

The thresholds stay at 0, ⅓, and ⅔. The content follows the taxonomy. Each label sprite sits on its cluster and moves with it. The 120 ms fade-in stays.

| Slider | Labels shown |
| --- | --- |
| 0 | The ECS label only |
| above 0 | One per EC, 5 or 9 |
| above ⅓ | One per risen ES, 5 or 9 |
| above ⅔ | One per kind of E that has spread (Beach ridge, Swale, Shale, Mouth bar), plus each standalone element |

**EC names:**

| Scene | Names |
| --- | --- |
| `wf`, `asym` | Beach-ridge complex, left. Beach-ridge complex, right. Mouth-bar complex, proximal. Mouth-bar complex, seaward. Mouth-bar complex, distal |
| `tfw` | Beach-ridge complex, left. Beach-ridge complex, right. Beach-ridge complex, half channel. Mouth-bar complex, tidal proximal. Mouth-bar complex, tidal mid. Mouth-bar complex, tidal seaward. Mouth-bar complex, half-channel proximal. Mouth-bar complex, half-channel seaward. Mouth-bar complex, half-channel distal |

**ES names:** Beach-ridge set, Mouth-bar set.

**E labels:** each kind's representative is the first element of that kind found when scanning risen sets in this EC order: `ridge-r`, `ridge-l`, `ridge-hl`, `mouth`, `mouth-prox`, `mouth-sea`, `mouth-dist`, `mouth-l`, `mouth-l-prox`, `mouth-l-dist`, and within a set by id. A standalone element uses its existing body name.

**Structure:**

- The EC and ES labels are label-only bodies (`kind: 'group'`) emitted by the explode module. They carry a flag so the WebGL-failure text list leaves them out.
- The old scene-graph groups (`ec-lobe`, `ec-mouth`, `es-ridge-l`, …) stay for structure and parent links. They sit at their nested position at every `t` and never show a label.

## 7. Camera

**Extent, measured once at mount.** After the view builds its meshes, it places every body at slider values 0, ⅓, ⅔, and 1, takes the union of the mesh boxes (labels excluded), and keeps the bounding sphere of that union as the **full-explode sphere**. Each body moves linearly within a stage, so that union contains every intermediate pose. It then puts everything back at the current slider value.

**Limits.** In `schematicFrame.ts`, pure functions:

- `fitDistance(radius, fovDeg, aspect, margin = 1.15)` is `radius × margin / sin(half-angle)`, where the half-angle is the smaller of the vertical half-FOV and the horizontal half-FOV for that aspect.
- `maxDistance = max(ZOOM_MAX, fitDistance of the full-explode sphere)`. `ZOOM_MIN` stays 2 and `ZOOM_MAX` stays 60 as the floor.
- `zoomDistance(distance, direction, limits?)` takes optional limits and defaults to the constants, so existing calls keep working.
- The zoom buttons, the wheel, and the orbit controls all read the same per-scene limits.
- `camera.far = max(100, maxDistance + 2 × radius)`.

**Pan clamp.** After each controls update, the look-at target is pulled back inside the full-explode sphere when it leaves it. Every mesh can reach the centre of the view, and the scene cannot be dragged out of sight.

**Auto-frame.** On every change of the slider value (drag, keys, End), and not on open or pin switch:

1. Measure the bounding sphere of every mesh at the current slider value.
2. Keep the camera's viewing direction.
3. Set the look-at target to the sphere centre and the distance to `fitDistance` of that sphere, clamped to the limits.

There is no glide. Manual orbit, zoom, and pan work between slider changes, and the next slider change re-frames.

**Known step.** The start camera is unchanged: `(6.5, 5.5, 7.5)` looking at `(0, 0.4, 0.6)`, a distance of about 10.8. On `tfw` that view already crops the nested scene, which needs about 17. So the first slider movement on `tfw` steps once to the fitted view. On `wf` and `asym` the step is about 6%. This is accepted.

## 8. Architecture and files

| Path | Change |
| --- | --- |
| `src/core/explode.ts` (new, no `three`) | Classification, the three stages, the constants `S_EC`, `H`, `R_E`, label-only taxonomy bodies, label thresholds. Takes a rest list of bodies, the scene id, `t`, and a `centerOf` function. Taking `centerOf` as a parameter avoids an import cycle with `wfSchematic.ts` |
| `src/core/wfSchematic.ts`, `asymWfSchematic.ts`, `tfwEcsSchematic.ts` | Each `sceneAt` builds its rest list as it does today (including generated swales, shales, the delta plain, and the `tfw` extras), then calls the module. Deleted: the explode math in `asymWfSchematic.ts` and `explodePosition` in `tfwEcsSchematic.ts`. `EXPLODE_SPREAD` is retired |
| `src/core/wfSchematic.ts` (types) | `SceneBody` gains an optional flag marking label-only taxonomy bodies |
| `src/ui/schematicFrame.ts` | `fitDistance`, the framing step, the pan clamp, `zoomDistance` limits |
| `src/ui/WfSchematicView.tsx` | Extent measurement at mount, per-scene limits, auto-frame on slider change, pan clamp, far plane |
| `src/ui/WfSchematicPanel.tsx` | Marker row, `aria-valuetext`, the larger chrome estimate, the text list skipping label-only bodies |

`three` stays out of `src/core/`. The `sceneAt` return type (`PlacedBody[]`) does not change, so the view's per-frame placement code stays as it is.

## 9. Tests

- **`src/core/explode.test.ts` (new).**
  - Every body in all three scenes is classified or standalone. The EC, ES, and E counts match section 3.
  - At `t = 0`, positions equal the nested pose exactly.
  - At `t = ⅓`, each EC is a rigid block, and its centre's distance from the pivot is `S_EC` times its rest distance.
  - At `t = ⅔`, only the risen set of each EC has risen by `H`, and every other body is where it was at ⅓.
  - At `t = 1`, the elements of each risen set sit evenly on a ring of the expected radius around the set's centre.
  - Y is unchanged in stages 1 and 3.
  - Positions are linear in `t` within a stage.
  - Label counts at each threshold.
- **`src/core/wfSchematic.test.ts`.** The radial-from-origin and old label-band assertions are replaced by the new contract.
- **`src/ui/schematicFrame.test.ts`.** `fitDistance` (tighter-angle choice and margin), the framing step (direction kept), the pan clamp, `zoomDistance` with and without limits.
- **`src/ui/WfSchematicPanel.test.tsx`.** Four markers; reached state at 0, ⅓, ⅔, and 1; the value text; role and name unchanged; the text list excludes label-only bodies.
- **Manual (jsdom has no WebGL).** Tune `S_EC`, `H`, and `R_E` by eye. Record a walkthrough in `wf`, `asym`, and `tfw` at 0, ⅓, ⅔, and 1. Check auto-frame, manual pan between slider moves, the pan clamp, and that every mesh is visible at 1 after zooming fully out.
- **Gates.** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## 10. Documentation, in the same change set

- **`DESIGN.md`.** Replace the Explode paragraph and add to the camera paragraph (proposed text below).
- **`features/elementmeshlist.md`.** The Ground row's explode sentence, the new core module under Core silhouette, the new tests under Tests, and a note that EC and ES labels are label-only bodies.
- **`features/wfpaneldesignsummary.md` and `features/schematic_module.md`.** Both describe the radial explode and `EXPLODE_SPREAD`.
- **`CHANGELOG.md`.** An entry under `## [Unreleased]`.
- **`PRODUCT.md`.** No change. It does not mention Explode.

Proposed `DESIGN.md` Explode paragraph, replacing the current one:

> Explode runs from nested to pulled apart in three equal stages, one for each step down the four scales: element complex set, element complex, element set, element. The solids track the thumb with no extra ease. In the first stage each element complex moves as one block, away from the centre of the water slab in the ground plane, and keeps its own arrangement. Height does not change. In the second stage one element set in each element complex rises straight up, and the others stay in their cluster. In the third stage the elements of each risen set spread out in a circle in the ground plane around the centre of that set. Everything else stays nested, so a few examples of the smaller scales show while the larger scales stay in view. The slider has four markers at 0, ⅓, ⅔, and 1, labelled ECS, EC, ES, and E. A marker reads as reached once the thumb is on or past it. Names accumulate: the element complex set at 0, each element complex after the slider leaves 0, each risen element set after ⅓, and after ⅔ one Beach ridge, one Swale, one Shale, one Mouth bar, and each single element.

Proposed addition to the camera paragraph:

> Moving the Explode slider frames the whole arrangement: the camera keeps its viewing direction and moves its look-at point and distance so every solid is in view. Orbit, zoom, and pan still work between slider moves. Pan stops at the edge of the fully exploded arrangement, and zoom-out reaches far enough to see all of it.

## 11. Out of scope

- Click-to-jump on the markers.
- Any glide or animation of the auto-frame.
- Labels on every element.
- A change to any mesh, to the pin, to the caption, or to the resize behaviour.
- A taxonomy-shaped WebGL-failure text list.
- New scenes.
- A change to the start camera.

## 12. Risks and tuning

- **Spread sizes.** `S_EC`, `H`, and `R_E` are starting values. Strips on a ring can still overlap in projection. Tune by eye, and record the final numbers.
- **ECs near the pivot.** In `tfw` the left convex flank sits only 0.36 from the pivot, so scaling barely moves it. If two blocks end up too close, add a per-EC minimum gap after visual review.
- **Id coupling.** The classification reads ids. A new id family needs a new row in section 3. The "every body is classified" test fails loudly when one is missing.
- **First-move step on `tfw`.** Accepted, see section 7.
- **UI chrome.** The marker row is a small change to an existing surface. After it works, run one `impeccable polish` pass on the slider row, one skill per message as `WORKFLOW.md` says.
