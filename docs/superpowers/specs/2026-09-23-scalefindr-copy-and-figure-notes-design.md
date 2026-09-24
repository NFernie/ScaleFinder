# ScaleFindr copy and figure notes — Design Spec

- **Status:** Approved
- **Date:** 2026-09-23
- **Branch:** `cursor/impeccable-ui-polish-2528`
- **Purpose doc:** [`ScaleFinderPurpose.md`](../../../ScaleFinderPurpose.md)
- **Parent spec:** [`2026-09-22-scalefinder-v1-design.md`](2026-09-22-scalefinder-v1-design.md)

## 1. Goal

Change the on-screen name to ScaleFindr, capitalise Polygon in visible sentences, replace the label "Characteristic length" with "Equivalent square side", and show a short explanation with an equation above each scale figure.

The area, span, and square-side numbers stay on the same calculations as today. This spec does not add a user guide, multiple Polygons, per-Polygon colours, or a map ruler.

## 2. Confirmed decisions

| Area | Decision |
| --- | --- |
| Site name | ScaleFindr in the header, browser title, map chip, and snapshot file name (`scalefindr-snapshot.png`, or `scalefindr-` plus the region name) |
| Unchanged names | Repository, npm package, and `ScaleFinderPurpose.md` stay ScaleFinder |
| Polygon | Capital P in visible sentences. Code identifiers such as `PolygonPreview` stay as they are |
| Third figure | Label becomes **Equivalent square side**. The value remains `sqrt(planform area)`, still stored as `characteristicLengthM` |
| Explanations | One panel per figure, opened above that row |
| Pointer | Hover opens the panel where hover exists. Keyboard focus opens the same panel |
| Touch | A tap opens the panel. A tap outside closes it |
| Dismissal | Leaving the row, Escape, or opening another row closes the current panel |
| Placement | Above the row. If the panel would be clipped by the top of the sidebar, it opens just below the row |
| Snapshot | The open panel is excluded from the PNG |
| Import hint | "Use a two-column file of X and Y values exported from your GIS software. An optional Z column is kept and not used for the planform." |
| Math rendering | Plain text equations. No math-typesetting library |

## 3. Copy

### 3.1 Name and Polygon

Visible product name becomes ScaleFindr. The header subtitle becomes "Superimpose a true-scale field Polygon on a world map." The browser title becomes "ScaleFindr — True-scale Polygon comparison on a world map."

These sentences capitalise Polygon:

- "1 · Import Polygon"
- "Drop a .txt or .csv Polygon here"
- "Choose Polygon file"
- "Import a Polygon to export"
- "Drag the marker on the map to reposition the Polygon."
- "Import a Polygon to place it here at true ground scale."

The import format hint replaces the current "Rows of X, Y[, Z]…" line with: "Use a two-column file of X and Y values exported from your GIS software. An optional Z column is kept and not used for the planform." Z remains accepted by the parser.

### 3.2 Figure panels

Each panel shows the figure name, the description, then the equation.

| Figure | Description | Equation |
| --- | --- | --- |
| Planform area | Horizontal area of the Polygon from X and Y. Z is ignored. | A = ½ \|Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)\| |
| Max span | Longest straight line between any two vertices. | d = max √[(xᵢ − xⱼ)² + (yᵢ − yⱼ)²] |
| Equivalent square side | Side of a square with the same planform area. | L = √A |

## 4. Components

The explanations live in the scale list (`ScaleReadout`). No new dependency. `computeStats` is unchanged: planform area is the shoelace area, max span is the longest vertex-to-vertex distance, and the square side is the square root of that area.

One panel is open at a time. The row is reachable by pointer, touch, and keyboard. The open panel is associated with the row for assistive tech (`aria-describedby` while open) and uses the existing dark surface. It is not a browser `title` tooltip.

Import errors are unchanged. The panel does not replace them.

## 5. Testing

- The scale-list test expects "Equivalent square side" and does not expect "Characteristic length".
- A component test opens a row and finds that figure's equation.
- The import test expects the two-column X and Y sentence and Polygon with a capital P.
- Existing geometry tests still cover area, span, and `characteristicLengthM`. Those numbers do not change.
- Manual check: hover each figure, tap a figure at phone width, and export a snapshot. The panel is absent from the PNG.

## 6. Out of scope

- User-guide pop-out beside Import.
- More than one Polygon in a project, show/hide, aligned centres, or custom colours.
- A ruler for custom map distances.
- Renaming the Git repository, the npm package, or the purpose document.
