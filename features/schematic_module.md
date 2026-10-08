# Wf schematic geometry

> **For the next session:** This file is the workflow for fixing the Three.js solids. It is not a new spec and it is not an implementation plan.
>
> Do not change product code from this file. The hierarchy, pin, panel, and caption stay as approved in [`docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md`](../docs/superpowers/specs/2026-10-08-wf-schematic-pin-design.md). The next session replaces the stand-in meshes, one kind at a time, using the skill order below.

**Goal:** Make the Wf schematic solids read like the plan in `WF_element complex set.png` and like the cartoon shapes already named in the approved spec: a lobate slab, a tapering channel, wedges, lenses, and mounds.

**Architecture:** Positions, ranks, the mouth-bar fan, and the two flanks stay in `src/core/wfSchematic.ts`. Meshes stay in `src/ui/WfSchematicView.tsx`. `three` is not imported from `src/core/`. If a silhouette is stored as numbers, those numbers are plain data in core and have a Vitest check. Explode still adds a Y gap by rank only. The slider still tracks the thumb.

**Tech stack:** Vite, React 18, TypeScript, Tailwind, Vitest, `three` `^0.186.1` (only the schematic view). MapLibre is unchanged.

## What is wrong

`geometryFor` in `src/ui/WfSchematicView.tsx` builds every solid from `BoxGeometry` or a scaled `SphereGeometry`. The approved arrangement is already in `sceneAt`. The picture is wrong because the meshes ignore the shapes the spec named.

| Kind | Shipped mesh | Shape the spec and the plan view ask for |
| --- | --- | --- |
| Ground | Box `8 × 0.05 × 6` | Thin ground slab. A box is enough. |
| Lobe | Sphere scaled `1.6, 0.18, 1` | One lobate slab, seaward of the fan, matching the blue body. An oval pancake does not. |
| Mouth-bar parent | Box `3.4 × 0.06 × 2.2` | Shallow slab landward of the lobe, under the fan. The green fan in the screenshot is the mounds, not this rectangle. |
| Channel | Box `0.28 × 0.12 × 2.4` | One straight channel-fill that tapers seaward. The braided texture in the screenshot is not modelled. |
| Mouth bar | Sphere scaled `1.2, 0.45, 1` | One smooth mound. Five of them, already fanned in core. |
| Beach ridge | Box `0.55 × 0.16 × 0.9` | A wedge, thicker on the landward side and thinner toward the sea. Four on each flank, stepping alongshore away from the channel. |
| Swale | Box `0.4 × 0.06 × 0.7` | A thin lens in the trough between wedges. Three on each flank. |
| Element set | Tiny box, used as a label anchor | No extra solid. The label stays. |

Colours already match the diagram palette (gold ridges, grey swales, green mouth bars, orange channel, blue lobe). Do not recolour the panel. Do not paint `WF_element complex set.png` onto a mesh.

Coordinate frame, already used by `sceneAt`: **+X** alongshore to the right, **+Y** up, **+Z** seaward. Land is −Z. The screenshot has land at the top of the image and the sea at the bottom.

## Skill set

Vendored from [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) `main` @ `b1c623076c661fc9b03dac19292e825a5d106823` into [`.cursor/skills/threejs-skills/`](../.cursor/skills/threejs-skills/). Each skill is a `SKILL.md` of API notes audited upstream against Three.js **r160+**. This app is on **r186**. Read the skill, then check the r186 docs for any constructor you actually call. Prefer `import * as THREE from 'three'`. If an addon is required, import it from `three/addons/`. The skills still show some `three/examples/jsm` paths (text geometry, `BufferGeometryUtils`, and one fundamentals merge example). Do not copy those paths.

The upstream README still tells you to clone `pinkforest/threejs-playground` into `.claude/skills`. Ignore that. Read the copies in this repo. The README says MIT. The checkout has no `LICENSE` file.

| Skill | Use on this module | Why |
| --- | --- | --- |
| [`threejs-geometry`](../.cursor/skills/threejs-skills/skills/threejs-geometry/SKILL.md) | **Primary.** Read first. | `ExtrudeGeometry` from a `Shape` for the lobe plan and any other outline. `LatheGeometry` for a mound and a lens. `CylinderGeometry(radiusTop, radiusBottom, …)` for a channel that tapers, then rotate it so the narrow end points +Z. Custom `BufferGeometry` for a wedge that is thick on −Z and thin on +Z, then `computeVertexNormals()`. `geometry.rotateX`, `translate`, and `scale` to put an extruded plan into the XZ frame. `EdgesGeometry` only while comparing a silhouette. |
| [`threejs-fundamentals`](../.cursor/skills/threejs-skills/skills/threejs-fundamentals/SKILL.md) | **Primary.** Read second. | Right-handed axes: +X right, +Y up, +Z toward the viewer in a default camera. Schematic +Z is seaward, so an extrude (depth along the shape’s Z) must be rotated onto the map plan. `OrthographicCamera` looking down −Y is the check against the PNG. `AxesHelper` is for that check. `Group` is already how ranks sit. The cleanup sample matches the dispose path already in the view; keep `forceContextLoss()` as well, because r186 `renderer.dispose()` does not release the context. |
| [`threejs-materials`](../.cursor/skills/threejs-skills/skills/threejs-materials/SKILL.md) | **Light.** After the silhouettes match. | Stay on `MeshStandardMaterial` and the existing colours. `flatShading` helps a wedge read as a wedge. `DoubleSide` if a thin lens shows a missing back. `polygonOffset` if the slab and the ground z-fight. Do not switch to glass, clearcoat, or `MeshPhysicalMaterial`. |
| [`threejs-lighting`](../.cursor/skills/threejs-skills/skills/threejs-lighting/SKILL.md) | **Light.** After the silhouettes match. | Add a `HemisphereLight` (sky and ground) beside the existing ambient and directional lights so thickness is visible. Skip shadows, image-based lighting, `RectAreaLight`, and light animation. |
| [`threejs-interaction`](../.cursor/skills/threejs-skills/skills/threejs-interaction/SKILL.md) | **Authoring only, unless a person asks to ship it.** | `OrbitControls` from `three/addons/controls/OrbitControls.js` lets a person orbit while comparing the top view to the PNG. The shipped camera can stay the fixed one at `(6.5, 5.5, 7.5)` looking at `(0, 0.4, 0.6)`. If controls ship, they must not take the map’s pointer, and `controls.dispose()` runs in the same cleanup as the renderer. Skip raycasting, drag controls, and selection. |
| [`threejs-animation`](../.cursor/skills/threejs-skills/skills/threejs-animation/SKILL.md) | **Do not use.** | Explode is a direct Y offset from the slider. No `AnimationMixer`, morph, spring, or sine motion on the solids. |
| [`threejs-textures`](../.cursor/skills/threejs-skills/skills/threejs-textures/SKILL.md) | **Do not use.** | Labels are already canvas sprites. Do not texture the PNG or a report figure onto the model. |
| [`threejs-shaders`](../.cursor/skills/threejs-skills/skills/threejs-shaders/SKILL.md) | **Do not use.** | The failure is the mesh, not the shading model. |
| [`threejs-postprocessing`](../.cursor/skills/threejs-skills/skills/threejs-postprocessing/SKILL.md) | **Do not use.** | No bloom, outline pass, or depth of field. |
| [`threejs-loaders`](../.cursor/skills/threejs-skills/skills/threejs-loaders/SKILL.md) | **Do not use.** | Solids stay authored in code. No GLTF. |

[`img2threejs`](../.cursor/skills/img2threejs/SKILL.md) does not apply. It rebuilds one physical object from a photo. A delta scene fails its intake, and it cannot emit ranks or an explode slider.

UI skills (UI UX Pro Max, Impeccable, Emil) do not run for this pass. The pin, panel, caption, and colours are locked in [`DESIGN.md`](../DESIGN.md) under `### Wf schematic pin`. Run them only if a later change touches that chrome, and then follow [`WORKFLOW.md`](../WORKFLOW.md): one skill per message.

## Workflow

One skill per message. Do not open a skipped skill “for context”.

1. **Read geometry, then fundamentals.** Confirm the frame: +X alongshore right, +Y up, +Z seaward. Write down which constructor each kind will use before editing the view.
2. **Keep the scene graph.** `sceneAt` positions and ranks stay. Mouth bars stay at `{0, 0.35}, {0.45, 0.7}, {-0.75, 1.05}, {1.1, 1.4}, {-1.5, 1.8}` as `(x, z)`. Ridges stay at `|x|` `1.1, 1.8, 2.5, 3.2` and `z = -0.4`. Swales stay at `1.45, 2.15, 2.85`. Explode clamps to 0–1 and adds Y by rank only (`0`, `1.2`, `2.4`, `3.6`).
3. **Optional silhouette table, in core, before the meshes.** If a plan outline needs numbers, measure them from `WF_element complex set.png` (773×424) into plain `{ x, z }` points. Land (top of the image) is −Z. Sea (bottom) is +Z. The channel is the axis. Store that table in `src/core/` with no `three` import, and unit-test the point count, the axis, and that seaward points have larger `z` than landward points. Do not draw the PNG into the canvas.
4. **Replace `geometryFor` one kind at a time,** in this order: lobe, channel, beach-ridge wedge, swale lens, mouth-bar mound. Ground stays a thin box. Element-set groups stay labels. After each kind, look at an orthographic top view (camera on −Y, looking at the origin) next to the PNG. `EdgesGeometry` can show the plan edges during that check. Remove the helper and the edge overlay before the kind is done.
5. **Orientation check.** Extrude depth starts on the shape’s own Z. `rotateX` (see geometry “Clone and Transform”) lays that plan onto schematic XZ. A wedge’s thick end is landward (−Z). A channel’s narrow end is seaward (+Z).
6. **Read materials, then lighting, only if the plan already matches and the solids are hard to read.** Flat shading on wedges. Double-sided thin lenses if a face disappears. Polygon offset if two slabs flicker. Hemisphere light plus the lights already in the view. No shadows.
7. **Explode still tracks the thumb.** Move `position.y` from `sceneAt`. Do not ease it.
8. **Cleanup stays.** Dispose geometries, mesh materials, sprite materials, and label textures, then `renderer.dispose()`, `renderer.forceContextLoss()`, and remove the canvas. The WebGL probe still calls `loseContext()` so it does not hold a slot.
9. **Changelog and tests.** Every product-code commit adds a line under `## [Unreleased]` in [`CHANGELOG.md`](../CHANGELOG.md). Core silhouette data gets a Vitest. The view’s jsdom path stays the text list. MapLibre and the canvas are a manual check: top view against the PNG, then the existing oblique camera, then Explode at 0 and at 1. The panel stays outside the snapshot frame.

Subagents, if the later plan is executed with subagent-driven development: [`.cursor/rules/subagent-models.mdc`](../.cursor/rules/subagent-models.mdc). Only `cursor-grok-*`, `grok-*`, or `composer-*`. Pass `model` explicitly.

## Reference material

Already in the repo. Do not add another paper. Do not ask for a new drawing.

| Reference | Use |
| --- | --- |
| [`WF_element complex set.png`](../WF_element%20complex%20set.png) | Plan to match. Land at the top, sea at the bottom. Orange channel on the axis. Green mouth bars fanning sideways and seaward. Gold beach-ridge wedges and grey swales stepping away from the channel on both flanks. Blue lobate body seaward of the fan. Measure a normalized outline from this file if step 3 needs numbers. Do not copy the pixels into the canvas. |
| `2012 Vakarelov And Ainsworth WAVE Architectural Classification Report.pdf`, Figures 7, 8, and 10 | Nesting, and the cartoon sections: beach-ridge wedge thicker landward and thinning seaward, swale lens, shingled beach-ridge set, mouth-bar mound. Figure 8’s channel-fill is generic. The screenshot is why the channel is in this schematic. No measured lengths. |
| `Ainsworth et al 2011…pdf` | Process code only. Wf means wave-dominated, fluvial-influenced. It does not define element set or element complex. |
| [ExtrudeGeometry](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry), [Shape](https://threejs.org/docs/#api/en/extras/core/Shape), [LatheGeometry](https://threejs.org/docs/#api/en/geometries/LatheGeometry), [CylinderGeometry](https://threejs.org/docs/#api/en/geometries/CylinderGeometry) at the installed three version | The skill is audited at r160+. Confirm bevel, depth, and radius argument order against r186 before writing the mesh. |
| Approved spec, “Nested arrangement” | Which body is parent of which, and the sentence that these solids are not copies of the report drawings. Similarity is the arrangement and the cartoon shape, not a traced figure. |

## Leave these alone

- Pin at `44.878674, 29.515563`, inside the snapshot. Panel outside the snapshot, bottom-right. On a phone-width Danube framing the open panel may cover the pin. Close and Escape return focus to `#wf-schematic-pin` synchronously.
- Caption: “Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.”
- Diagram colours stay inside the canvas. Panel chrome stays the locked toolbox classes. No second accent, no light theme, no shadcn.
- Schematic units are not metres and are not georeferenced.
- WebGL failure stays a text list grouped by parent. The slider does not move that text.
- Do not restart the UI design chain. Do not vendor another 3D stack.

## Decisions a person can still change

The shapes above are already in the approved spec. These three are the only open calls. Default them as written if nobody answers.

| Topic | Default in this file | Why a person might change it |
| --- | --- | --- |
| Mouth-bar parent slab | Stays a thin shore-perpendicular slab under the five mounds | The green fan in the PNG could be read as that parent’s outline instead |
| Orbit controls | Authoring check only. Shipped camera stays fixed | A person may want to orbit the shipped diagram |
| PNG vertex table | Measure one only if a `Shape` needs an outline that boxes cannot imply | The cartoons in Figures 8 and 10 may be enough without tracing the PNG |

## Files the later change is allowed to touch

| Path | Responsibility |
| --- | --- |
| Modify: `src/ui/WfSchematicView.tsx` | Replace `geometryFor`. Optional hemisphere light and flat shading after the plans match. |
| Modify: `src/core/wfSchematic.ts` | Only if step 3 adds a plain silhouette table. Do not move positions. |
| Test: `src/core/wfSchematic.test.ts` | Point count, axis, and seaward `z` if that table exists. |
| Modify: `CHANGELOG.md` | One line under `## [Unreleased]` for the mesh change. |

Do not edit the pin, the panel shell, `App.tsx`, `PRODUCT.md`, or `DESIGN.md` for a geometry-only pass.
