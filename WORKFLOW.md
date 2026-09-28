# How to use the design skills in ScaleFindr

This is a handrail for a new session. The skills live in [`.cursor/skills/`](.cursor/skills/). They do not run by themselves. You attach a skill, or you type its slash command, and you say what to do.

Read these first, in this order:

1. [`PRODUCT.md`](PRODUCT.md) is who the product is for and what v1 may do. A skill must not add accounts, a saved Polygon library, CRS reprojection, or server-side features unless you change that file first.
2. [`DESIGN.md`](DESIGN.md) is the look that is already on screen. Night navy panels, one teal accent, Inter, 44px controls, an 8px corner on controls and 12px on grouped panels. A skill that picks a new palette is wrong unless you have asked for a new visual world.
3. [`AGENTS.md`](AGENTS.md) is how to build: Vite, React, TypeScript, Tailwind, geometry in `src/core/`, tests, and a changelog entry.

The app is an Operate surface. A geologist imports an outline, compares it with a real region, and exports a PNG. The map is the work. The sidebar is the instrument panel. Skills that make a marketing site, a second accent, or a playful animation are the wrong tool here.

## How a command actually starts

Cursor’s `/` menu lists skill names. It does not list Impeccable suffixes such as `init` or `polish`.

Type the skill, then the job, in the same message. Several Emil skills answer with only a greeting if you attach them and say nothing else. Always include the task.

```text
/impeccable polish the region search field. Stay inside DESIGN.md. Do not change colours.
```

```text
/emil-design-eng The Polygon switch knob must stay inside the pill. Here is the row in src/ui/PolygonList.tsx.
```

One job per message. Name the files or the screen. Say whether the agent may edit code or only report. A review that must not edit belongs in its own message, not mixed with “and also add the feature.”

Impeccable is one skill. The word after it chooses the playbook:

```text
/impeccable shape
/impeccable critique the sidebar
/impeccable audit
```

UI UX Pro Max is three skills in this repo: `design`, `ui-styling`, and `design-system`. Emil Kowalski is one skill per folder. `pick-ui-library` and `prototype` run only when you name them.

`/impeccable live` and the design detector need the full CLI (`npx impeccable install`). This repo vendors the written playbooks, not that launcher. If the install stops on “invalid zip data”, the hook is not checking your edits. The written commands still work.

## The order for a UI change

Use this whenever the screen changes. Skip a step only when the change is a bugfix inside an existing control.

| Step | Skill | What you get | What you do not get |
| --- | --- | --- | --- |
| 1. Check the product | none, or `/impeccable init` if the product itself changed | Permission to build | A new colour |
| 2. Look up patterns | `ui-styling` or `design-system` | How to build the control in Tailwind without leaving DESIGN.md | A new brand |
| 3. Plan the screen | `/impeccable shape` | Layout, states, empty, error, phone | Code, unless you then ask to build |
| 4. Build | `/impeccable craft` is a deprecated alias. Ask to implement the agreed shape. | React in `src/ui/`, rules in `src/core/` | A restyle of the whole app |
| 5. Motion and feel | Emil skills, one at a time | A specific animation or phone fix | A tour of every skill |
| 6. Finish | `/impeccable polish`, then `audit`, then `harden` | Contrast, focus, copy, edge cases | A redesign |

After the look changes, run `/impeccable document` again so `DESIGN.md` matches the code. Do not let the file and the screen drift.

Geometry, parsing, UTM, and area math do not use these skills. Put that work in `src/core/` and cover it with Vitest. MapLibre WebGL still needs a manual check in the browser.

## UI UX Pro Max

These skills suggest patterns. On this product they must land on the tokens in `DESIGN.md`. If a suggestion introduces a second accent, a light theme, or a marketing hero, reject it.

### `ui-styling`

Use when you are about to write Tailwind for a control that already has a job.

Paste this kind of prompt:

```text
/ui-styling Style the region search field.
Follow DESIGN.md: 44px height, 8px corners, Night field fill, Signal teal focus ring.
Do not add shadcn and do not change the palette.
```

Useful on:

- The import drop zone and the unit toggle. They already exist. Use the skill when the dashed border, the 44px unit buttons, or the error line feel inconsistent with the rest of the sidebar.
- Region search results. The selected row is Selected teal (`#0f766e`) with Mist text. A new filter chip belongs in that pattern.
- A future basemap picker. It is a list, not a new visual system. Selected row, 44px, hairline dividers.

Do not use it to restyle the map canvas. The basemap is geographical. The Polygon colour is data.

### `design-system`

Use when you are adding a token or a component that should be named once and reused. The tokens already live in `tailwind.config.js` and in the frontmatter of `DESIGN.md`.

```text
/design-system Add a warning surface token for the “no MapTiler key” note.
Match the amber already in App.tsx. Update DESIGN.md and tailwind.config.js together.
Do not invent a second palette.
```

Useful on:

- Figure notes in the scale readout. One inset panel, 12px corners, Float shadow only because it pops over a row.
- Export error text. Danger (`#f87171`) is already the delete and error colour. A new error style should reuse it.
- A future legend for several Polygons. Swatches are data colours. The row chrome stays Panel / Inset.

The skill can also plan slides. That is for a talk about the product, not for the app.

### `design`

Use only when the task is brand or a picture, not the working app. The installed copy can talk about logos, banners, and social images. ScaleFindr v1 does not need those.

```text
/design A small mark for the header, one colour, to sit beside the word ScaleFindr on Night (#0b1220).
Do not redesign the app.
```

Useful later, and only if you ask: a conference slide that shows a Polygon on the Nile, or a social still of an exported PNG. Update `PRODUCT.md` brand commitments if the mark becomes official.

The full UI UX Pro Max search database (style, colour, and type lookup by a Python script) is not vendored here. Do not expect `search.py` at the upstream path to exist in this repo. The logo and CIP helper scripts under `.cursor/skills/ui-ux-pro-max/design/scripts/` are the exception.

## Impeccable

One skill, many playbooks. The product mode for the app is Operate. A future public landing page would be Persuade, and you would say that in the prompt so the agent does not decorate the tool like a campaign.

### Build

| Command | When | ScaleFindr example |
| --- | --- | --- |
| `/impeccable init` | The user, the job, or the scope changed. Writes `PRODUCT.md` only. | You decide v1 may save a session. Update the product record before any screen work. |
| `/impeccable document` | The screen and `DESIGN.md` disagree, or you have finished a new visual world. | You change the sidebar width or the accent. Regenerate `DESIGN.md` and `.impeccable/design.json`. |
| `/impeccable shape` | You know the feature is in scope and you want the screen planned before code. | “Shape a basemap menu. It opens from the map, uses the secondary button style, and must not cover zoom.” |
| `/impeccable extract` | A pattern is copied in three places and should become one component. | The primary button classes are repeated on Export, Import, and Measure. Extract one button that still uses Signal teal. |

`/impeccable craft` is a deprecated name for ordinary build work. After shape is agreed, say “implement that shape.”

`init` does not choose colours. `document` does not add features.

### Evaluate, before you polish

| Command | When | ScaleFindr example |
| --- | --- | --- |
| `/impeccable critique` | The screen works and you want a hierarchy review. Report first. | “Critique the sidebar. Import, Polygons, and Find a region should stay in that order. Do not restyle.” |
| `/impeccable audit` | You want accessibility, contrast, keyboard, and small-screen checks. | The search field, the switch, the colour input, and Export. Focus must stay Focus teal (`#5eead4`), 2px, offset 2px. |

Run critique when you are unsure the layout is clear. Run audit when you are about to ship. They overlap. Critique is about understanding. Audit is about failure.

### Refine

| Command | When | When not to |
| --- | --- | --- |
| `/impeccable polish` | The feature is functionally done. Last pass on spacing, type, focus, and alignment. | You still do not know what the control should do. Shape it first. |
| `/impeccable quieter` | Something is louder than the map. | The screen is already night navy and one teal. Quieter is then a no-op. |
| `/impeccable distill` | A panel explains too much. | The import hint is the only instruction a new file format has. Do not strip the UTM comment line. |
| `/impeccable bolder` | A future landing page is timid. | The working app. Bolder fights the One Voice Rule in `DESIGN.md`. |
| `/impeccable harden` | Errors, empty states, and bad files. | Visual taste. |
| `/impeccable onboard` | The first minute: empty map, empty list, first sample. | A settings page you do not have. |

Prompts:

```text
/impeccable polish the measure menu only.
Keep Float shadow, 12px corners, and tabular numbers. Do not move it into the sidebar.
```

```text
/impeccable harden import.
A bad file must leave existing Polygons in place. The message stays danger text, not a new banner style.
```

```text
/impeccable onboard the empty map.
The sentence already says “Import a Polygon to place it here at true ground scale.”
Keep that meaning. Do not add a second hero.
```

### Fix and enhance

| Command | Use on this product | Leave it alone when |
| --- | --- | --- |
| `/impeccable clarify` | Import hint, export hint, unit labels, “Switch a Polygon on to show it here.” Capital P on Polygon. | The area number. That is a measurement, not copy. |
| `/impeccable adapt` | Phone: map on top, sidebar at most 42dvh, 16px text in fields so iOS does not zoom. | You are looking at a desktop-only bug in the UTM parser. |
| `/impeccable layout` | Sidebar rhythm: 32px between sections, 12px under a title, 20px page padding. | The Polygon’s ground shape. Layout of the sidebar is not the geometry of the outline. |
| `/impeccable typeset` | Wordmark tracking, section titles, tabular figures, the 15px scale bar. | You want a second font. `DESIGN.md` is one family, Inter. |
| `/impeccable optimize` | A list of many Polygons janks while scrolling the sidebar. | The map is slow because of tiles. That is the basemap, not CSS. |
| `/impeccable animate` | A switch knob or a menu opening. Prefer Emil’s `animate` skill for the actual motion. | Dragging the Polygon. The shape must follow the pointer. An ease after the drop is optional. A bounce is not. |
| `/impeccable colorize` | Almost never. The accent is already chosen. | Any ordinary screen. |
| `/impeccable delight` | A single considered detail, such as the scale bar staying readable in the PNG. | Confetti, gradients, or a mascot. |
| `/impeccable overdrive` | Not for v1. | You want the tool to feel technical and calm. |

`/impeccable generate` asks for several visual alternatives in the live browser. It needs the full install. Until that works, use Emil’s `prototype` skill only if you explicitly want variants, and tell it to stay inside `DESIGN.md`.

## Emil Kowalski

These skills are about feel. They assume the structure is already right. Run them after shape, not instead of it.

Some of them greet you and wait. Put the question in the first message.

### Feel of the whole interface

`emil-design-eng` is the taste check. It wants a before/after table, exact durations, and no animation that does not teach something.

```text
/emil-design-eng Review the Export snapshot button and the empty-map note.
Press may scale to 0.97 in 120ms ease-out, as in DESIGN.md.
Do not add a shadow to sidebar rows. The Flat Panel Rule stands.
```

Use it on the header, the primary button, the switch, and floating map labels. Do not use it to re-decide the product.

### Motion

Pick one motion skill. Do not stack them in one prompt.

| Skill | You want | ScaleFindr example |
| --- | --- | --- |
| `animate` | Something built. It decides whether to animate at all, then writes it. | The switch knob slide. 160ms, ease-out, transform only. Reduced motion snaps. |
| `review-animations` | A verdict on motion you already wrote. | “Review `.pressable` in `src/index.css`. Approve or reject the 120ms scale.” |
| `improve-animations` | A plan for the whole app, not an edit. | “Plan motion fixes. Do not edit. Dragging a Polygon is not a candidate for bounce.” |
| `find-animation-opportunities` | A list of places that might move, including places that must not. | “Search the sidebar. Reject animation on every keystroke in search.” |
| `animation-vocabulary` | The name of an effect so the next prompt is precise. | “The knob slides inside the pill. What is that called?” Then you call `animate` with that word. |
| `apple-design` | A drag, a sheet, or momentum that should feel physical. | A future phone sheet for the sidebar. The Polygon drag handle. Momentum must not fling the outline past the drop point. |

The ground size of a Polygon is not an animation. Web Mercator draws it larger near the poles. No motion skill should “correct” that by scaling the shape in CSS.

### Phone

`mobile-native` removes the ways a site feels like a desktop page on a phone. It is not a motion skill.

```text
/mobile-native Check the import field, the sidebar scroll, and the map height.
Fields stay at 16px. Buttons must not highlight grey on tap.
The map must not sit under the notch. Do not change the desktop layout.
```

Useful on the sidebar at `42dvh`, the safe-area padding already in the header, and any future bottom sheet. Test on a phone if you can. A narrow desktop window is not a phone.

### Choosing a library

`pick-ui-library` recommends one library from a fixed list. It does not run unless you name it. Look at `package.json` first. This app already uses MapLibre, Turf, and html-to-image. Do not replace those.

```text
/pick-ui-library The snapshot export can fail. I need a toast, not a new banner.
Recommend one library. Style it for Night panels and Body ink. Do not install it until I agree.
```

If the answer is Sonner, the next message is `ask-sonner`, with the night theme called out so the toast is not a white card on a white corner.

Do not pick a drag-and-drop library for the Polygon. The handle is a MapLibre marker because the position is longitude and latitude. A DOM drag library would fight the map.

`prototype` builds several versions of one piece behind a picker. Use it only when you are willing to throw versions away, for example three quiet treatments of the measure menu. Tell it the Float shadow, 12px corners, and tabular numbers are fixed.

## Worked examples

### A change that is in scope now: clearer import errors

The product already imports `.txt` and `.csv`. Making a bad file understandable is harden and clarify, not a new feature.

1. Confirm `PRODUCT.md` still says a bad import must not imply a saved project. The list is session-only.
2. `/impeccable clarify` on the import hint and the error sentence. Keep Polygon capitalised. Keep the `# UTM 36N` and `Poly,Vert,X,Y,Z` facts accurate.
3. `/impeccable harden` so a failed file does not remove Polygons already in the list.
4. `/emil-design-eng` only if the error line collides with the drop zone. Danger text, no new colour.
5. Skip `bolder`, `colorize`, and `delight`.

### A change that is in scope now: the phone layout

1. `/impeccable adapt` with the rule from `DESIGN.md`: below `lg`, the map is first, the sidebar is at most 42dvh.
2. `/mobile-native` for tap highlight, 16px inputs, and the notch.
3. `/impeccable audit` for focus order: header, then map controls, then sidebar.
4. Do not use `animate` to slide the sidebar in on every visit. It is a tool used all day.

### A future feature that is out of scope until you say so: saved projects

`PRODUCT.md` forbids a saved Polygon library in v1. The skill order is:

1. You decide the product change. `/impeccable init` updates `PRODUCT.md`. Do not start in Figma-by-chat.
2. `/impeccable shape` the smallest screen: a name for this session, save, and restore. Empty, error, and signed-out states.
3. `design-system` only if you need one new component. It still uses Night, Panel, and Signal teal.
4. Implement. Persistence is a separate decision (the purpose brief names Supabase as a later option). The skills do not choose the database.
5. `/impeccable harden` for a failed save. `/emil-design-eng` for the button. `ask-sonner` only if you truly need a toast.

### A future feature that is in spirit but not built: rotating a Polygon

If you add rotation, the product rule is the same as dragging: the outline turns around its centre and does not stretch.

1. `/impeccable shape` the handle and the bearing field. The handle is a map marker, like the centre handle.
2. `apple-design` for the drag. `animate` only for the moment after you type a bearing, and only if a short ease helps you see the turn.
3. `review-animations` before you ship that ease.
4. Do not use `ui-styling` to draw the rotated shape in CSS. The vertices are geographic. Rotation belongs in `src/core/`.

### What not to run

- Do not `/impeccable colorize` or `/impeccable bolder` the sidebar.
- Do not ask `design` for a new palette while `DESIGN.md` exists.
- Do not ask `find-animation-opportunities` and then animate everything it lists. It is a menu, not an order.
- Do not use these skills to change area, bearing, or UTM maths. Those are tests in `src/core/`.

## A message you can copy

```text
Read PRODUCT.md and DESIGN.md.
This is an Operate surface. Do not add features PRODUCT.md marks out of scope.
Do not change tokens unless I ask.

Task: <one sentence>.
Skill: <one skill or one /impeccable command>.
Files: <paths>.
You may edit: <yes or no>.
Done when: <what I should see>.
```
