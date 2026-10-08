# Vendored design skills

These skills are vendored (committed) so Cloud Agents can use them offline. They
drive the **design → implement → polish** workflow described in
[`AGENTS.md`](../../AGENTS.md). Each subfolder keeps its upstream `LICENSE` when
that file exists.

| Folder | Upstream | Use in workflow |
| --- | --- | --- |
| [`ui-ux-pro-max/`](ui-ux-pro-max/) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) | **Design** — `design`, `ui-styling`, `design-system` (styles, palettes, typography, tokens) |
| [`impeccable/`](impeccable/) | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (MIT) | **Design → Implement → Polish** — `SKILL.md` + `reference/` for `shape`, `craft`, `critique`, `polish`, `audit`, `harden`, `animate`, … |
| [`emilkowalski/`](emilkowalski/) | [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT) | **Polish** — `emil-design-eng`, `animate`, `review-animations`, `mobile-native`, `pick-ui-library`, `apple-design`, … |
| [`img2threejs/`](img2threejs/) | [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) (Apache-2.0) | **3D reconstruction** — read [`img2threejs/SKILL.md`](img2threejs/SKILL.md) to turn a reference image into a procedural, animation-ready Three.js model (not in ScaleFinder v1 scope unless explicitly requested) |
| [`threejs-skills/`](threejs-skills/) | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) (MIT, claimed in README; no `LICENSE` file in the tree) | **Three.js API notes** — geometry, scene setup, materials, lighting, and interaction for the Wf schematic. Skill files live under `threejs-skills/skills/threejs-*/SKILL.md`. Workflow: [`features/schematic_module.md`](../../features/schematic_module.md) |

## How to use

1. **Design:** consult `ui-ux-pro-max/design` + `ui-ux-pro-max/ui-styling` for
   visual direction, then `impeccable/reference/shape.md` to plan the surface.
2. **Implement:** follow `impeccable/reference/craft.md`; build with the app's
   Vite + React + TS + Tailwind stack.
3. **Polish:** apply `emilkowalski/*` (motion, design-eng, mobile-native) and
   `impeccable/reference/polish.md` + `audit.md` + `harden.md`.

## Notes on what was vendored

- **impeccable**: `SKILL.md` and `reference/` only. The full CLI, live-browser
  detector bundle, and deterministic detector scripts are **not** vendored (they
  are large and need the CLI). For `/impeccable live` / detector features, install
  the full tool with `npx impeccable install` at the repo root.
- **ui-ux-pro-max**: the `design`, `ui-styling`, and `design-system` skills (with
  their reference data). Non-relevant skills (banner-design, slides, brand) and
  the 11 MB canvas-font bundle were omitted. Full skill: `npx ui-ux-pro-max-cli`.
- **emilkowalski**: the web design/motion skills. `animate-expo` (React Native)
  and `write-swift` (Swift) were omitted as out of scope. Update with
  `npx skills@latest add emilkowalski/skills`.
- **img2threejs**: full upstream checkout at `main` @ `809b72d` (skill v2.0.0 per
  `SKILL.md`), including `forge/`, `grimoire/`, and docs. Optional domain plugins
  (CS2, animated-character, etc.) are **not** vendored — use `npx img2threejs install`
  or the [img2 harness](https://github.com/img2threejs/img2) when you need them.
  Refresh: re-clone or `npx img2threejs update --ref <tag|sha>` into this folder.
- **threejs-skills**: full upstream checkout of
  [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) `main`
  @ `b1c623076c661fc9b03dac19292e825a5d106823` (“Remove Claude Code from
  acknowledgments”). Ten `SKILL.md` files under `skills/`. The upstream README
  still says to clone `pinkforest/threejs-playground` into `.claude/skills`;
  ScaleFindr reads the copies here. The README states MIT and the checkout has
  no `LICENSE` file. Skills were audited upstream against Three.js r160+. This
  app uses `three` `^0.186.1`. Prefer `import * as THREE from 'three'` and
  `three/addons/` when an example is required. Do not copy the skill’s
  `three/examples/jsm` import paths. Refresh by re-copying that commit into
  this folder, without its `.git` directory.
