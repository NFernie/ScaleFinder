# Toolbox UI Update — Design Spec

- **Status:** Approved for implementation
- **Date:** 2026-09-29
- **Branch:** `cursor/toolbox-ui-update-7f08`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent specs:** [`2026-09-28-map-toolbox-design.md`](2026-09-28-map-toolbox-design.md), [`2026-09-29-lasso-brush-design.md`](2026-09-29-lasso-brush-design.md)
- **Plan:** [`features/toolbox_ui_update.md`](../../../features/toolbox_ui_update.md)
- **Design system:** [`DESIGN.md`](../../../DESIGN.md) Toolbox section

The Toolbox already ships. This addendum changes presentation and map interaction only. It does not add tools, and it does not change measurement, session, or lasso-brush rules except where a section below says so.

The user approved the plan in `features/toolbox_ui_update.md` and ordered implementation. That approval is this spec. The parent files stay as the record of tool behaviour. Where this addendum and a parent sentence disagree about the popup, the cursor, edge pan, or the polygon/ruler rubber-band, this addendum wins. Tool geometry, copy in section 5 of the parent, and the lasso brush stay as specified there.

## 1. Goal

Replace the text list in the Toolbox popup with a bento grid of shape icons, tool-matched cursors, and hover tooltips. While a drawing tool is accepting points, the pointer at the map frame edge pans the map. For Polygon and Ruler, the rubber-band from the last confirmed point to the pointer is drawn behind the cursor.

Geodesic geometry, flood/brush maths, and unit formatting stay in `src/core/`. This work does not add a runtime dependency.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Tools | Unchanged: Polygon, Ruler, Lasso, Circle, Square (Rectangle or Square toggle) |
| One drawing | Unchanged. Another tool while a draft exists shows `Delete the current drawing before choosing another tool.` |
| Popup chrome | Panel at 95%, 12px outer corners, Float shadow `0 2px 8px rgb(0 0 0 / 0.35)`, targets at least 44px |
| Accent | One teal voice on Night navy. No second accent, no light theme, no shadcn |
| Grid | Five buttons, three columns, order Polygon, Ruler, Lasso, Circle, Square. No sixth control |
| Icons | Centred shape marks in `currentColor`. No text label inside the cell |
| Tool name | `aria-label` plus a hover and focus tooltip. Square's accessible name contains "Square" |
| Cursors | One `MapToolCursor` overlay of inline SVG. Native cursor hidden while a tool is set. No cursor package and no second CSS cursor image |
| Lasso Radius | CSS pixels. Default **48**. Clamp **8–128** |
| Lasso Contrast | `maxChannelDelta`. Default **32**. Clamp **0–255**. Per-channel max absolute RGB delta from the sample colour. Alpha is ignored |
| Line style | Unchanged: `#ffffff` 2px on `#0f172a` 4px casing. Closed fill is white at 0.2 opacity |
| Preview split | `overlayOf` keeps confirmed corners and adds `preview` for an open Polygon or Ruler |
| Edge pan | Pure helper `edgePanDelta` in `src/map/mapEdgePan.ts`. Band is 32 CSS pixels. Cap is 16 CSS pixels per axis per call |
| Motion | Chrome only (popup, bento cells, tooltips). Map lines and drag previews do not animate |
| Snapshot | Toolbox, popup, tooltips, readout, and cursor chrome stay outside the snapshot. Lines and fills stay inside |
| Persistence | Nothing drawn is kept after the page closes |

## 3. On-screen behaviour

The Toolbox button stays in the top-left map slot, outside the snapshot, clear of zoom. Closed, only that button shows. Open, the popup is the bento grid. The blocked-message row stays under the grid when a draft blocks a tool change. Readouts (Polygon, Ruler, Lasso, Circle, Square) stay separate panels and keep their actions.

On a 390px-wide phone the grid stays in that top-left slot. Cells stay at least 44px. The popup does not cover the zoom control.

### 3.1 Bento grid

Each cell is a button at least 44px square, 8px corners, icon centred. The active tool uses Selected teal (`#0f766e`) with Mist text. Other cells use a hairline border and Body ink. Keyboard focus uses Focus teal (`#5eead4`), 2px, offset 2px. Press uses the existing `.pressable` scale (0.97, 120ms), removed when reduced motion is on.

Icons, one per `ToolId`:

| Tool | Mark |
| --- | --- |
| Polygon | Irregular closed polygon |
| Ruler | Open polyline |
| Lasso | Ring |
| Circle | Circle |
| Square | Square |

Icons are monochrome Mist or teal through `currentColor`. They do not introduce a second accent.

The cell does not show the long tooltip body. The visible name is the tooltip, not a caption in the tile.

### 3.2 Tooltips

Copy lives in `src/ui/ToolboxTooltips.ts` as `TOOL_TIPS`, a record of `{ title, body }` per `ToolId`. Each cell sets `aria-label` to `title`, a `title` attribute to `title`, and a `role="tooltip"` node (title plus body) linked with `aria-describedby`. The tooltip is shown on hover and on keyboard focus. It is popup chrome, outside the snapshot.

| Tool | Title | Body |
| --- | --- | --- |
| Polygon | Polygon | Click corners on the map. Double-click or Done to close. Area and Add to list when closed. |
| Ruler | Ruler | Click to measure distances along a path. Open chain only — no area. Done or double-click to finish. |
| Lasso | Lasso | Paint on the map to trace a region by colour. Double-click to close the stroke. Adjust Radius and Contrast in the readout while drawing. |
| Circle | Circle | First click sets centre, second sets radius. Add to list when complete. |
| Square | Square / Rectangle | Two clicks for opposite corners. Toggle square or rectangle in the readout. |

Lasso Radius and Contrast controls in the readout set `title` to these sentences:

- **Radius (8–128 px):** Size of the colour-search disc around your brush. **Low (8–24):** tight, precise edges. **High (64–128):** grabs a wider area; use on large uniform regions; may include unlike colours.
- **Contrast (0–255):** How similar a pixel’s RGB must be to the seed colour. **Low (0–16):** only nearly identical colours. **High (48–255):** includes more variation; **32** is default. **255** is maximally permissive.

Those sentences describe the shipped brush. They do not change when Radius and Contrast apply: only while the lasso stroke is open, and only to later samples. A closed ring is not rebuilt. List names stay `Measured polygon`, `Circle`, `Rectangle`, `Square`, `Lasso`, and `Lasso (fixed)`.

### 3.3 Tool cursors

While `session.tool` is set, the map hides the native cursor and `MapToolCursor` draws a mark that follows the pointer, above the map canvas, with `pointer-events: none`. When the tool is cleared or the session closes, the overlay unmounts and the native cursor returns.

| Tool | Cursor |
| --- | --- |
| Polygon | Crosshair |
| Ruler | Crosshair |
| Circle | Circle |
| Square | Square |
| Lasso | Lasso ring whose diameter equals the current Radius in CSS pixels |

Lasso diameter uses `session.lasso.radiusPx` when a draft exists, otherwise 48. The value is clamped to 8–128. Changing Radius while the stroke is open updates the cursor on the next paint. The hotspot is the centre of the mark.

The mark is inline SVG in `MapToolCursor`. The map container uses `cursor: none` while `session.tool` is set, so the overlay is the only cursor. There is no second cursor image and no new npm package.

### 3.4 Edge pan

While the map is accepting points, a pointer inside a **32 CSS pixel** band on any side of the map frame pans the map so the user can keep placing points. Accepting points means the same condition as today's `mapAcceptsPoints`: Polygon `adding`, Ruler `adding`, Circle `centre`, Square `origin`, or Lasso `drawing`.

`edgePanDelta(pointer, viewport, edgePx)` in `src/map/mapEdgePan.ts` is pure. `pointer` is CSS pixels from the top-left of the map frame. It returns `{ x, y }` in CSS pixels for `map.panBy`.

For an axis of length `span` and position `pos`, apply these checks in order and keep the first match:

- If `span` is less than or equal to `edgePx * 2`, that component is 0.
- If `pos` is less than or equal to `edgePx`, the raw delta is `pos - edgePx` (negative toward the start edge).
- If `pos` is greater than or equal to `span - edgePx`, the raw delta is `pos - (span - edgePx)` (positive toward the end edge).
- Otherwise the raw delta is 0.
- Clamp each raw delta to the range −16 through 16.

`x` uses `pointer.x` and `viewport.width`. `y` uses `pointer.y` and `viewport.height`. A corner may set both components. The caller passes `edgePx` of **32**. A pointer at `{ x: 980, y: 400 }` in a `{ width: 1000, height: 800 }` frame with `edgePx` 24 yields a positive `x` and a zero `y`.

`App` calls `map.panBy` with that delta and animation off when the delta is non-zero and the map is accepting points. It does not pan when no tool is drawing.

Lasso brush rule stays: while status is `drawing`, MapLibre drag-pan stays off, and a drag in the interior extends the stroke. Edge pan is an extra `panBy` only inside the 32px band. It does not turn interior drag into a pan. Samples along the stroke continue while the edge pan runs.

### 3.5 Polygon and Ruler preview behind the pointer

Circle and Square already fold `session.hover` into the ring inside `overlayOf`. That stays. Lasso guide and colour parts stay as the brush spec defines them. This section is Polygon and Ruler only.

`acceptHover` sets `session.hover` when Polygon or Ruler status is `adding`. For those tools in any other status it sets `hover` to null. Circle and Square keep their current `acceptHover` branches. Confirmed corners do not include the hover point. `overlayOf` still omits `preview` unless status is `adding`, so a stale hover cannot draw a rubber-band after Done.

`ToolboxOverlay` gains optional `preview?: LngLat[]`. For Polygon or Ruler with status `adding`, at least one confirmed corner, and a hover point, `preview` is the confirmed corners followed by the hover point. Otherwise `preview` is omitted. Confirmed `corners` stay the committed points only, and `closed` is unchanged.

`MeasurementOverlay` draws `preview` as its own GeoJSON line **under** the confirmed line, with the same white 2px stroke and 4px navy casing. The shared prefix sits under the confirmed line. The last segment, from the last confirmed point to the pointer, is the visible rubber-band. `MapToolCursor` paints above the canvas, so that segment is behind the cursor.

Example: confirmed corners `[a, b]` and hover `c` yield `preview` `[a, b, c]` and confirmed corners `[a, b]`.

A closed Polygon and a finished Ruler (`done`) omit `preview`. Circle, Square, and Lasso do not set `preview`.

Map geometry and this rubber-band do not animate.

### 3.6 Motion

Baseline, until the Emil pass records a replacement:

- `.toolbox-pop` fades and rises 8px in 160ms ease-out.
- `.pressable` is transform, background, border, and filter over 120ms ease-out, scale 0.97.
- Bento hover, press, and tooltip reveal use opacity and transform only.
- `prefers-reduced-motion: reduce` snaps all of that motion.

Do not animate the confirmed line, the preview segment, the lasso guide, or a drag preview.

## 4. Components and data flow

Geometry and the one-drawing reducer stay in `src/core/`. UI and map chrome call those modules. They do not reimplement length, area, rings, or the lasso brush.

| Path | Responsibility |
| --- | --- |
| Create: `src/ui/ToolIcon.tsx` | SVG icon for one `ToolId` |
| Create: `src/ui/ToolboxTooltips.ts` | `TOOL_TIPS` title and body, including Radius and Contrast sentences for the readout |
| Create: `src/map/mapEdgePan.ts` | `edgePanDelta`. No React, no MapLibre |
| Create: `src/map/MapToolCursor.tsx` | Cursor mark from the active tool and lasso Radius |
| Modify: `src/ui/Toolbox.tsx` | Bento grid, icons, tooltips, selected and focus states, blocked message under the grid |
| Modify: `src/ui/LassoMenu.tsx` | Radius and Contrast tooltip text from section 3.2. Controls otherwise unchanged |
| Modify: `src/core/toolboxSession.ts` | `acceptHover` for open Polygon and Ruler. `overlayOf` sets `preview` and leaves confirmed corners without the hover point |
| Modify: `src/map/MeasurementOverlay.tsx` | Confirmed line and preview line as separate features; preview underneath |
| Modify: `src/App.tsx` | Edge pan on pointer move while accepting points; mount the cursor; keep lasso drag-pan off while `drawing` |
| Modify: `src/map/MapView.tsx` | Optional cursor class on the canvas container |
| Modify: `src/index.css` | Bento and tooltip motion, and `prefers-reduced-motion` |
| Test: `src/ui/Toolbox.test.tsx` | Bento buttons expose accessible names for each tool |
| Test: `src/core/toolboxSession.test.ts` | `overlayOf` preview for an open Polygon with hover |
| Test: `src/map/mapEdgePan.test.ts` | Sign of the pan vector at each edge |

`src/core/measurement.ts`, `ruler.ts`, `circle.ts`, `square.ts`, and `lasso.ts` keep their public geometry. `overlayOf` only chooses which coordinates are confirmed and which are the hover tail.

## 5. Error handling and copy

Parent and lasso-brush messages are unchanged:

| Condition | Message |
| --- | --- |
| Ruler **Done** or double-click with fewer than two points | `Add at least two points.` |
| Circle radius under one metre | `The radius is too small.` |
| Rectangle or square too small | `The box is too small.` |
| Lasso fill too small or ring under 3 points | `No feature found at that contrast.` |
| Canvas not readable | `This basemap does not allow colour sampling.` |
| Another tool chosen while a draft exists | `Delete the current drawing before choosing another tool.` |

The blocked sentence stays under the grid. Tooltips do not replace it. Edge pan and the cursor do not run a new error path. If the pointer cannot be read, the delta is `{ x: 0, y: 0 }` and the native map cursor is left as it was.

## 6. Testing

**Vitest**

- Toolbox popup, menu open: each tool button's accessible name matches Polygon, Ruler, Lasso, Circle, and Square. Square's name matches `/square/i`.
- `overlayOf` on an adding Polygon with corners `[a, b]` and hover `c` returns `preview` `[a, b, c]` and confirmed corners `[a, b]`. A closed Polygon omits `preview`.
- `edgePanDelta` returns positive `x` when the pointer is inside the right band, and `{ x: 0, y: 0 }` when the pointer is inset from every edge. Each component stays within ±16.

Unit tests do not mount MapLibre.

**Manual check (MapLibre)**

- Bento shows shape icons. Names appear on hover and on keyboard focus.
- Each tool changes the map cursor. Lasso cursor grows and shrinks with Radius 8–128.
- Polygon and Ruler: the rubber-band to the pointer sits behind the cursor. Confirmed segments stay visible.
- Pointer in the edge band pans the map while Polygon, Ruler, Circle, Square, or Lasso is accepting points. Interior lasso drag still paints and does not drag-pan.
- Popup motion snaps when reduced motion is on.
- Snapshot PNG includes the line and fill, and omits the Toolbox, tooltip, and readout.

## 7. Out of scope

- A sixth tool, or any change to Polygon, Ruler, Circle, Square, or Lasso geometry beyond `acceptHover` and `preview`
- Sidebar restyle, GIS columns, accounts, saved projects, or a tile proxy
- A cursor or icon npm package
- Animating map lines or drag previews
- Rewriting `2026-09-28-map-toolbox-design.md` or `2026-09-29-lasso-brush-design.md`
- Editing `DESIGN.md` in the same change as this spec (that sentence lands when the UI ships)
