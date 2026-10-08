# Wf schematic geometry

> **For the next session:** The stand-in boxes and spheres have been replaced. This file records which skill was used and the cast the user locked on 2026-10-08. Do not put the swales, the green slab, or the blue lobe solid back.

## What shipped

`threejs-geometry` only. Positions stay in `src/core/wfSchematic.ts`. Meshes stay in `src/ui/WfSchematicView.tsx`, and the half-cylinder builder is `src/ui/halfChannelGeometry.ts`. `three` is not imported from core.

| Body | Mesh | Frame |
| --- | --- | --- |
| Ground | Thin box, blue, opacity 0.3, `depthWrite` off | Water line. The top of the slab is the base of the channel. Mouth bars sit below it |
| Channel | Custom half-cylinder `BufferGeometry` along **+Z**. Flat face at local y = 0, arc down to `−radius`. `computeVertexNormals()` | Radius is half the earlier full cylinder. The mesh origin is the middle of the flat face. The **+Z** tip meets the thick end of the most seaward beach ridge. Centred at X = 0 |
| Beach ridge | Custom `BufferGeometry` from `beachRidgeRing`. Sigmoid seaward face, `computeVertexNormals()`, flat shading | Thick at the channel, thinner at the alongshore tip. Centreline swings landward, then the tip turns slightly seaward. Crest stays above the water line. The most seaward crest meets the channel top. Each landward ridge is 2% of the reference crest height above the next, and the bases stay at those elevations. Fore-aft width is half the previous thickness. The base is seaward of the crest. Left flank is the right flank mirrored in X |
| Mouth bar | Custom half spheroid in `mouthBarGeometry`. Flat base, dome on top, `computeVertexNormals()` | Nine bars fill a V in front of the channel. Thickness is 50% greater and the long axis is 50% longer, extended seaward. The base follows an exaggerated sigmoid along **+Z**. The landward base of the channel bar matches the base of the most seaward beach ridge. Each bar farther seaward is 5% of the bar thickness lower. The stack stays under the water line |
| Swale, mouth-bar slab, lobe solid | Not drawn | Wf-Lobe and Wf-Mouth Bar remain labels |

+X is alongshore to the right. +Y is up. +Z is seaward. Figure 10’s Wf-Lobe crescents are the ridge shape. Figures 7 and 8 are the stacking reference. The PNG is the plan arrangement, without its grey swales or blue body.

**Architecture:** Positions, ranks, the mouth-bar fan, and the two flanks stay in `src/core/wfSchematic.ts`. Meshes stay in `src/ui/WfSchematicView.tsx`. `three` is not imported from `src/core/`. Explode still adds a Y gap by rank only. The slider still tracks the thumb.

**Tech stack:** Vite, React 18, TypeScript, Tailwind, Vitest, `three` `^0.186.1` (only the schematic view). MapLibre is unchanged.

The earlier stand-in list (blue lobe sphere, green slab, grey swale boxes, square channel) is gone. Do not restore it. Diagram colours stay inside the canvas: gold ridges, green mouth bars, orange channel, blue water line. Do not paint the PNG onto a mesh.

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
2. **Keep the scene graph.** `sceneAt` positions and ranks stay. Mouth bars keep the seaward fan and the descending sigmoid. Beach ridges stay rooted on X = 0 and step in +Z. There are no swales. Explode clamps to 0–1 and adds Y by rank only (`0`, `1.2`, `2.4`, `3.6`).
3. **Silhouette numbers live in core.** `beachRidgeStations` and `beachRidgeRing` are the plan, the taper, and the base shift. `channelSpan` trims the channel. Land is −Z. Sea is +Z. The channel is the axis. Do not draw the PNG into the canvas.
4. **Further mesh edits stay in `geometryFor`.** Ground stays a thin box. Wf-Lobe, Wf-Mouth Bar, and element sets stay labels. Do not add a lobe solid, a mouth-bar slab, or a swale.
5. **Orientation check.** The channel mesh is already in schematic axes: length on Z, flat face on +Y, arc on −Y. Do not rotate a full `CylinderGeometry` back in. Ridge vertices are already in schematic X, Y, Z. The thick end touches the channel and is the seaward side of the bow. The thin end is the alongshore tip and lies landward.
6. **Read materials, then lighting, only if the plan already matches and the solids are hard to read.** Flat shading on wedges. Double-sided thin lenses if a face disappears. Polygon offset if two slabs flicker. Hemisphere light plus the lights already in the view. No shadows.
7. **Explode still tracks the thumb.** Move `position.y` from `sceneAt`. Do not ease it.
8. **Cleanup stays.** Dispose geometries, mesh materials, sprite materials, and label textures, then `renderer.dispose()`, `renderer.forceContextLoss()`, and remove the canvas. The WebGL probe still calls `loseContext()` so it does not hold a slot.
9. **Changelog and tests.** Every product-code commit adds a line under `## [Unreleased]` in [`CHANGELOG.md`](../CHANGELOG.md). Core silhouette data gets a Vitest. The view’s jsdom path stays the text list. MapLibre and the canvas are a manual check: top view against the PNG, then the existing oblique camera, then Explode at 0 and at 1. The panel stays outside the snapshot frame.

Subagents, if the later plan is executed with subagent-driven development: [`.cursor/rules/subagent-models.mdc`](../.cursor/rules/subagent-models.mdc). Only `cursor-grok-*`, `grok-*`, or `composer-*`. Pass `model` explicitly.

## Reference material

Already in the repo. Do not add another paper. Do not ask for a new drawing.

| Reference | Use |
| --- | --- |
| [`WF_element complex set.png`](../WF_element%20complex%20set.png) | Plan arrangement only: land at the top, sea at the bottom, orange channel on the axis, green mouth bars fanning, gold ridges on both flanks. The grey swales and the blue body are not in the model. Do not copy the pixels into the canvas. |
| `2012 Vakarelov And Ainsworth WAVE Architectural Classification Report.pdf`, Figures 7, 8, and 10 | Stacking, and Figure 10’s Wf-Lobe crescents. The ridges taper off the channel and overlap seaward. They are not copies of the drawings. |
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
| Mouth-bar parent slab | Not drawn. The five ovals are the green bodies | A later pass could add a slab under them |
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
