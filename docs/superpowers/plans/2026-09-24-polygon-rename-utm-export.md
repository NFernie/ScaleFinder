# Polygon rename and UTM export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename a Polygon, export it as UTM easting and northing, and import that file as a local Polygon plus a fixed twin.

**Architecture:** Zone conversion and file text live in `src/core/utm.ts` and `src/core/polygonExport.ts`. A fixed Polygon keeps its anchor when the list is re-centred or stacked on a region. The row UI matches the existing 44px controls.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, Vitest, Testing Library, MapLibre via react-map-gl.

## Global Constraints

- One name is the row label and the download name.
- Enter, Tab, and blur save a trimmed name. Escape restores the previous name. A blank name is refused.
- X and Y are UTM metres in the zone of the Polygon’s current centre. Z is 0.
- One part uses `Vertices,X,Y,Z`. Several parts, and Export selected, use `Poly Number,Vertices,X,Y,Z`.
- Export selected uses the first switched-on Polygon’s zone and leaves other zones out of the file.
- A UTM file adds a local Polygon and a fixed twin named with ` (fixed)`. The fixed twin has no drag marker.
- A two-column file adds only the local Polygon. A UTM file with no zone line adds only the local Polygon and says so.
- No new projection library.

---

### Task 1: UTM conversion and file text

- [x] Tests for zone labels, round trip, southern false northing, names, four-column and five-column files, and import.
- [x] Implement `src/core/utm.ts` and `src/core/polygonExport.ts`.
- [x] Commit.

### Task 2: List, map, and import wiring

- [x] Fixed Polygons stay put. Rows can be renamed and exported. A UTM import adds the twin.
- [x] Run `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- [x] Commit.

### Task 3: Manual check

- [ ] Rename, export, import the file, and confirm the fixed twin stays put after Re-centre.
