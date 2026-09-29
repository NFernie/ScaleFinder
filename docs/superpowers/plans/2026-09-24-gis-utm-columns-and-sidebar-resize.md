# GIS UTM columns and sidebar resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read and write UTM files as `Poly,Vert,X,Y,Z`, and let the sidebar be dragged until reload.

**Architecture:** Header rules stay in `src/core/polygonExport.ts`. The drag width stays in `App.tsx` and is clamped by `src/ui/sidebarWidth.ts`. `SidebarResizeHandle` is the wide-screen edge control.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Zone line is `# UTM 36N` or `# UTM 36S`.
- Written header is `Poly,Vert,X,Y,Z`.
- `Vert` or `Vertices` is the vertex column. `Poly` or `Poly Number` is the polyline column.
- A polyline with fewer than three points is dropped.
- Sidebar starts at 380px, stays at least 280px, and leaves the map at least 320px.
- Arrow keys move 16px. Width is not stored. The handle is hidden below the wide-screen breakpoint.
- No new library.

### Task 1: GIS table

**Files:**
- Modify: `src/core/polygonExport.ts`
- Test: `src/core/polygonExport.test.ts`

- [x] Export writes `# UTM 36N` and `Poly,Vert,X,Y,Z`. One part uses Poly `1`. Several parts use the next Poly number and restart Vert.
- [x] Export selected uses the same header, one Poly number per included Polygon.
- [x] Import accepts `Vert` and `Vertices`. A two-column file returns null. Parts shorter than three points are dropped.

### Task 2: Sidebar handle

**Files:**
- Create: `src/ui/sidebarWidth.ts`
- Create: `src/ui/SidebarResizeHandle.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/sidebarWidth.test.ts`, `src/ui/SidebarResizeHandle.test.tsx`, `src/App.test.tsx`

- [x] Default width is 380. Clamp keeps the list at 280 and the map at 320.
- [x] The handle matches the existing dark controls: 44px target, `white/25` grip, accent focus ring, hidden below `lg`.
- [x] A `Poly,Vert,X,Y,Z` import still adds the local Polygon and the fixed twin.
