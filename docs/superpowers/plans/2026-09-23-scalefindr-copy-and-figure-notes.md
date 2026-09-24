# ScaleFindr copy and figure notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the on-screen product to ScaleFindr, capitalise Polygon in visible sentences, and show a hover explanation with an equation above each scale figure.

**Architecture:** Copy changes stay in the existing React components. The scale list owns one open panel at a time. Geometry functions are unchanged; `characteristicLengthM` remains the stored square-side value. The panel lives in the sidebar, outside the snapshot frame.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Site name ScaleFindr only in the header, browser title, map chip, and snapshot file name (`scalefindr-snapshot.png`, or `scalefindr-` plus the region name).
- Repository, npm package, and `ScaleFinderPurpose.md` stay ScaleFinder.
- Visible sentences use Polygon. Code identifiers such as `PolygonPreview` stay as they are.
- Third figure label is **Equivalent square side**. Value remains `sqrt(planform area)`.
- One panel per figure, above the row; below the row only if the top of the sidebar would clip it.
- Hover opens where hover exists. Keyboard focus opens the same panel. A tap opens it on touch. A tap outside, Escape, leaving the row, or opening another row closes it.
- The open panel is excluded from the PNG.
- Import hint: "Use a two-column file of X and Y values exported from your GIS software. An optional Z column is kept and not used for the planform."
- Plain text equations. No math-typesetting library.
- Update `CHANGELOG.md` under `## [Unreleased]`.

---

### Task 1: Scale figure label and panel

**Files:**
- Modify: `src/ui/ScaleReadout.tsx`
- Test: `src/ui/ScaleReadout.test.tsx`

**Interfaces:**
- Consumes: `PolygonStats.characteristicLengthM`, `formatArea`, `formatLength`
- Produces: visible label `Equivalent square side`; a `role="tooltip"` with the figure equation while that row is open

- [x] **Step 1: Write the failing test**

Expect `Equivalent square side`, reject `Characteristic length`, and expect the planform equation after `mouseEnter` on the Planform area row.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/ScaleReadout.test.tsx`
Expected: FAIL because the label is still Characteristic length and no tooltip exists.

- [x] **Step 3: Implement the scale list panel**

Three static notes. One `openLabel`. Hover, focus, touch tap, Escape, and pointerdown outside. Flip below the row when `getBoundingClientRect().top` is above the sidebar.

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ui/ScaleReadout.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

### Task 2: Site name, Polygon sentences, and import hint

**Files:**
- Modify: `index.html`
- Modify: `src/App.tsx`
- Modify: `src/ui/ImportPanel.tsx`
- Modify: `src/map/PolygonOverlay.tsx`
- Modify: `src/ui/PolygonPreview.tsx`
- Test: `src/ui/ImportPanel.test.tsx`

**Interfaces:**
- Consumes: none from Task 1
- Produces: visible strings listed in the spec; snapshot basename `scalefindr-`

- [x] **Step 1: Write the failing import test**

Expect the two-column X and Y sentence and `Polygon here`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/ImportPanel.test.tsx`
Expected: FAIL on the missing hint.

- [x] **Step 3: Update visible copy**

Header, title, map chip, snapshot names, import heading and hint, export hint, drag sentence, empty-map line, overlay label, preview label.

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/ui/ImportPanel.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

### Task 3: Changelog and full verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-09-23-scalefindr-copy-and-figure-notes-design.md` (status Approved)

- [x] **Step 1: Record the behaviour change under `## [Unreleased]`**
- [x] **Step 2: Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`**
- [x] **Step 3: Manually hover each figure and confirm the panel is not inside the map frame**
- [x] **Step 4: Commit**
