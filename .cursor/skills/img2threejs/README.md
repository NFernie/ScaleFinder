# Vendored design skills

These skills are vendored (committed) so Cloud Agents can use them offline. They
drive the **design → implement → polish** workflow described in
[`AGENTS.md`](../../AGENTS.md). Each subfolder keeps its upstream `LICENSE`.

| Folder | Upstream | Use in workflow |
| --- | --- | --- |
| [`ui-ux-pro-max/`](ui-ux-pro-max/) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) | **Design** — `design`, `ui-styling`, `design-system` (styles, palettes, typography, tokens) |
| [`impeccable/`](impeccable/) | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (MIT) | **Design → Implement → Polish** — `SKILL.md` + `reference/` for `shape`, `craft`, `critique`, `polish`, `audit`, `harden`, `animate`, … |
| [`emilkowalski/`](emilkowalski/) | [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT) | **Polish** — `emil-design-eng`, `animate`, `review-animations`, `mobile-native`, `pick-ui-library`, `apple-design`, … |

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
