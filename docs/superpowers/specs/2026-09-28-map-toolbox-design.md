# Map Toolbox — Design Spec

- **Status:** Approved
- **Date:** 2026-09-28
- **Branch:** `cursor/toolbox-feature-plan-3678`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-23-map-ruler-design.md`](2026-09-23-map-ruler-design.md)
- **Plan:** [`feature/toolbox.md`](../../../feature/toolbox.md)

## 1. Goal

Replace the map Measure button with a Toolbox popup that selects Polygon (today's Measure behaviour), a distance-only Ruler, a colour-contrast Lasso, a Circle, and a Square or Rectangle.

The Toolbox is an agreed expansion. Task 2 updates `PRODUCT.md` and `ScaleFinderPurpose.md` to match. Nothing drawn in a session is kept after the page closes.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Tools | Polygon, Ruler, Lasso, Circle, Square (with Rectangle or Square toggle) |
| Polygon | Keeps today's Measure behaviour, including Done, double-click close, area, and Add to list. The list name stays `Measured polygon` |
| Ruler | Distances only. Many clicks are allowed. It never closes and never shows area. Done or double-click finishes the open chain |
| Ruler minimum | Fewer than two points stays adding and shows `Add at least two points.` |
| Circle | Two clicks: centre, then rim. 64 vertices. A radius under one metre shows `The radius is too small.` List name is `Circle` |
| Square / Rectangle | Two clicks with a Rectangle or Square toggle, default Rectangle, sides along local east and north. A square uses the longer side. List names are `Rectangle` and `Square`. A box that is too small shows `The box is too small.` |
| Lasso | Flood-fills 4-connected canvas pixels that are inside the fill only when the maximum of the absolute red, green, and blue differences from the clicked pixel is at most `maxChannelDelta` (default 32, range 0–255)—every channel must be within the limit—inside a radius (default 48 CSS pixels, range 8–128). List name is `Lasso`. No server |
| Lasso failure | Fewer than 8 filled pixels, or a simplified ring under 3 points, shows `No feature found at that contrast.` |
| Lasso canvas | If the canvas cannot be read, the menu says `This basemap does not allow colour sampling.` |
| One drawing | One drawing at a time. Choosing another tool does not replace it and shows `Delete the current drawing before choosing another tool.` |
| Persistence | Nothing drawn is kept after the page closes |
| Line style | Line is `#ffffff` at 2px over a 4px `#0f172a` casing. Closed fill is white at 0.2 opacity |
| Snapshot | The line is inside the snapshot. The Toolbox, popup, and readout are outside it |
| Architecture | Pure modules in `src/core/` plus one `ToolboxSession` reducer. Polygon keeps `src/core/measurement.ts` unchanged. React renders popup and readout only |

## 3. On-screen behaviour

**Toolbox** replaces the **Measure** control over the map, in the same top-left slot, clear of the basemap menu and zoom buttons. Tapping it opens a popup listing Polygon, Ruler, Lasso, Circle, and Square. Choosing a tool starts or continues that tool's draft. The sidebar does not gain a tool section.

While a draft exists, choosing a different tool in the popup does not switch tools. The app shows `Delete the current drawing before choosing another tool.` The user must **Delete** the current draft or **Add to list** (where offered) before another tool can start.

### Polygon

Polygon is today's Measure flow. Behaviour, copy for polygon-specific validation (for example fewer than three corners to close), **Done**, double-click close, segment and area readout, **Add to list**, and **Delete** match [`2026-09-23-map-ruler-design.md`](2026-09-23-map-ruler-design.md). **Add to list** still names the row `Measured polygon`.

### Ruler

Ruler draws an open chain. Each click adds a point. There is no close action and no area line. **Done** or double-click finishes the open chain when there are at least two points. With fewer than two points, the chain stays open for more clicks and the readout shows `Add at least two points.`

The floating readout lists each segment and a total length only. **Add to list** does not appear. **Delete** clears the ruler.

### Circle

Circle uses two clicks: centre, then a point on the rim. A preview follows the pointer after the centre is set. The finished shape is a 64-vertex geographic ring. The readout shows radius and area. **Add to list** and **Delete** appear when the circle is complete. **Add to list** names the row `Circle`.

If the geodesic radius is under one metre, the circle is not committed and the readout shows `The radius is too small.`

### Square and Rectangle

Square tool offers a **Rectangle** or **Square** toggle; default is **Rectangle**. Two clicks define opposite corners of an axis-aligned box in local east and north at the first corner. Preview follows the pointer after the first click.

For **Square**, the side length is the longer of the east and north spans from the first corner. For **Rectangle**, east and north spans are independent.

When the box is too small to be valid, the readout shows `The box is too small.` **Add to list** uses the list name `Rectangle` or `Square` to match the toggle.

### Lasso

Lasso samples the MapLibre canvas at the click. It flood-fills 4-connected pixels that are inside the fill only when the maximum of the absolute red, green, and blue differences from the clicked pixel is at most `maxChannelDelta` (default 32, adjustable 0–255)—every channel must be within the limit—constrained to a circle of radius in CSS pixels (default 48, range 8–128). Pixels are not sent off the device.

The fill boundary is simplified to an ordered geographic ring. Radius and contrast controls on the readout change only while lasso status is **aim**. A **ready** ring is unchanged by those controls; changing the numbers does not re-run the fill.

If fewer than 8 pixels are filled, or simplification yields fewer than 3 ring points, the readout shows `No feature found at that contrast.`

If `readPixels` or equivalent canvas read fails (for example cross-origin tiles), the readout shows `This basemap does not allow colour sampling.` **Add to list** names the row `Lasso`.

### Shared presentation

The draft line uses `#ffffff` at 2px with a 4px `#0f172a` casing. Closed shapes use white fill at 0.2 opacity. Lengths and areas use existing `formatLength` and `formatArea` with tabular numbers.

The Toolbox button, tool popup, and tool readout sit outside the snapshot frame. The white line and closed fill are map layers inside the frame.

Closed outlines become sidebar Polygons only through **Add to list**, same as today's measured polygon. **Add to list** assigns the next unused swatch, stores the outline in metres at the drawn centre, and does not use the import rule that aligns a new Polygon to the first selected centre. List names are `Measured polygon`, `Circle`, `Rectangle`, `Square`, and `Lasso` as above. The draft UI then clears.

## 4. Components and data flow

**Recommendation (from plan):** one `ToolboxSession` reducer owns the active tool and at most one draft. Polygon delegates to existing measurement state and `src/core/measurement.ts` without changing its public behaviour.

| Module (new unless noted) | Role |
| --- | --- |
| `src/core/measurement.ts` | Polygon only; unchanged API |
| `src/core/ruler.ts` | Open chain, segment lengths, total; no area |
| `src/core/circle.ts` | Centre, rim, 64-vertex ring, radius and area |
| `src/core/square.ts` | East–north rectangle or square from two corners |
| `src/core/lasso.ts` | Flood fill on pixel buffer, outline order and simplification |
| `src/core/ringDraft.ts` | Geographic ring to metres Polygon draft for Add to list |
| `src/core/toolboxSession.ts` | Active tool, draft lifecycle, one-drawing rule |
| `src/map/sampleCanvas.ts` | Read map canvas; flip for sampling; no React |
| `src/ui/Toolbox.tsx` | Button and tool picker popup |
| `src/ui/MeasureMenu.tsx` | Polygon readout only (current behaviour) |
| `src/ui/RulerMenu.tsx`, `ShapeMenu.tsx`, `LassoMenu.tsx` | Per-tool readouts |

Map clicks and optional pointer move feed the session reducer. Only the active tool's handler runs. Switching tools in the popup is blocked while a draft exists, with `Delete the current drawing before choosing another tool.`

## 5. Error handling and copy

| Condition | Message |
| --- | --- |
| Ruler **Done** or double-click with fewer than two points | `Add at least two points.` |
| Circle radius under one metre | `The radius is too small.` |
| Rectangle or square too small | `The box is too small.` |
| Lasso fill too small or ring under 3 points | `No feature found at that contrast.` |
| Canvas not readable | `This basemap does not allow colour sampling.` |
| Another tool chosen while a draft exists | `Delete the current drawing before choosing another tool.` |

Polygon validation messages remain those of the existing Measure menu (for example corner counts for close).

**Add to list** on an incomplete or invalid draft does nothing. **Delete** clears the draft and does not remove existing sidebar Polygons unless the user deletes those rows separately.

## 6. Testing

**Vitest for `src/core/`:**

- Ruler segment and total lengths; no closing side; no area.
- Circle ring has 64 vertices; radius and area match geodesic expectations; sub-metre radius rejected.
- Rectangle and square east–north geometry; square uses longer side; too-small box rejected.
- Lasso flood fill connectivity and channel delta; outline simplification; failure when under 8 pixels or under 3 ring points.
- `ToolboxSession`: one draft at a time; tool switch blocked with correct message; delete clears draft.
- `ringDraft` and **Add to list** store the outline in metres at the drawn centre; they do not use the import rule that aligns a new Polygon to the first selected centre.

Unit tests do not mount the real map.

**Manual check (MapLibre):**

- Open Toolbox; exercise each tool's happy path and each error string in section 5.
- Confirm popup and readout are absent from snapshot PNG; line and fill are present.
- Confirm cross-origin or blocked canvas shows `This basemap does not allow colour sampling.` on a basemap that cannot be sampled.
- Confirm one-drawing rule when switching tools mid-draft.

## 7. Out of scope

- User accounts
- Saved projects
- A saved Polygon library
- Named CRS or EPSG reprojection
- Server-side rendering
- Collaborative editing
- A tile proxy
- Sending canvas pixels anywhere but the browser
