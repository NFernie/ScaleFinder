---
name: ScaleFindr
description: A dark map workbench for comparing a field outline with a real region.
colors:
  surface: "#0b1220"
  surface-raised: "#131c2e"
  surface-overlay: "#1b273d"
  accent: "#2dd4bf"
  accent-strong: "#0f766e"
  accent-focus: "#5eead4"
  ink: "#f1f5f9"
  ink-soft: "#cbd5e1"
  muted: "#94a3b8"
  on-accent: "#042f2a"
  on-accent-soft: "#f0fdfa"
  danger: "#f87171"
  warning: "#fde68a"
  warning-border: "#f59e0b"
  scale-ink: "#0f172a"
  scale-paper: "#ffffff"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  section: "32px"
  hit: "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "{spacing.hit}"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#e2e8f0"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "{spacing.hit}"
  input:
    backgroundColor: "rgb(0 0 0 / 0.3)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "{spacing.hit}"
  switch-on:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.scale-paper}"
    rounded: "{rounded.full}"
    height: "24px"
    width: "44px"
---

# Design System: ScaleFindr

## Overview

**Creative North Star: "The night map workbench"**

The map is the work. The sidebar is the instrument panel beside it: import, Polygon list, then region search, in that order. Colour is scarce. Teal means the action you can take or the thing that is selected. Everything else stays on night navy so the basemap and the Polygon remain the brightest objects in the view.

This record describes the interface that is already built. It is an Operate surface: a geologist places an outline, reads a number, and exports a picture.

**Key Characteristics:**

- Night navy panels, one teal accent.
- Inter for the interface. Monospace and tabular figures for measurements.
- 44px hit targets. Press scales to 0.97.
- Hairline white borders. Depth comes from a darker or lighter surface, plus a small shadow on things that float over the map.
- The map keeps the centre of the screen. The sidebar is 380px from the large breakpoint up, and the map sits above it on a phone.

## Colors

Night navy surfaces and one teal voice. Warning and danger appear only for a missing key, an import note, or a destructive action.

### Primary

- **Signal teal** (#2dd4bf): The primary button fill. Export snapshot, the import action, and the measure actions that commit. Text on it is **Ink on teal** (#042f2a).
- **Selected teal** (#0f766e): The on state of a switch, a selected unit, a selected region row, and Measure while it is active. Text on it is **Mist** (#f0fdfa).
- **Focus teal** (#5eead4): The 2px focus ring, offset 2px. The caret in fields is Signal teal.

### Neutral

- **Night** (#0b1220): The page background.
- **Panel** (#131c2e): The sidebar.
- **Inset** (#1b273d): Lists, the unit toggle track, and figure rows.
- **Body ink** (#f1f5f9): Titles and primary reading text.
- **Soft ink** (#cbd5e1): Supporting sentences.
- **Muted** (#94a3b8): Labels, hints, and placeholders.
- **Hairline** (white at 10% or 15%): Panel edges, row dividers, and secondary button strokes.
- **Scale paper** (#ffffff at 94%) and **Scale ink** (#0f172a): The map scale bar only. It must stay light so it reads in a PNG.

### Named Rules

**The One Voice Rule.** Signal teal and Selected teal are the only accents on a working screen. Warning amber and danger red are for a problem or a delete, not for decoration.

## Typography

**Display font:** Inter (with ui-sans-serif, system-ui, sans-serif)
**Body font:** Inter (with the same fallback)
**Label/mono font:** ui-monospace, SFMono-Regular, Menlo, monospace

**Character:** One family. The title is slightly tighter. Measurements and file names switch to figures that line up, not to a second voice.

### Hierarchy

- **Display** (600, 1.125rem, tight tracking): The ScaleFindr wordmark in the header.
- **Title** (600, 0.875rem): Section titles, numbered 1 · Import Polygon, 2 · Polygons, 3 · Find a region.
- **Body** (400, 0.875rem, relaxed leading): Instructions, search results, and button labels.
- **Label** (400, 0.75rem): Hints, the tagline, and figure names. Placeholders are Muted.
- **Mono** (400, 0.75rem): A loaded file name and the equation in a figure note. Lengths and areas use tabular numbers in the body face.

### Named Rules

**The Figure Rule.** A length, an area, or the map scale bar uses tabular numbers. The scale bar is 15px and weight 600 so it survives in an exported PNG.

## Layout

The page is a column: header, then the work area. From the `lg` breakpoint (1024px) the work area is a row: a 380px sidebar and a map that takes the rest. Below that breakpoint the map is on top, at least half the remaining height, and the sidebar follows, at least 12rem and at most 42dvh.

Sidebar sections stack with 32px between them. Inside a section, the title sits 12px above the control. Controls are at least 44px tall. Sidebar padding is 20px, with extra inset for the safe area on a phone. Header padding is 16px, or 20px from the `sm` breakpoint, plus the safe area.

The map scale bar is centred on the bottom edge. Zoom controls stay in the top right, clear of the home indicator. A region name and the ScaleFindr mark float on the map. They must not cover the zoom controls.

## Elevation & Depth

Depth is mostly a change of surface. Night, Panel, and Inset are three steps. Shadows are small and reserved for objects that sit on top of the map or pop out of a row.

### Shadow Vocabulary

- **Float** (`box-shadow: 0 2px 8px rgb(0 0 0 / 0.35)`): Region label, ScaleFindr mark, empty-state note, Measure button, measure menu, and figure notes.
- **Marker** (`box-shadow: 0 2px 6px rgb(0 0 0 / 0.45)`): The drag handle on a Polygon.
- **Knob** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.35)`): The white circle on a switch.

### Named Rules

**The Flat Panel Rule.** Sidebar rows and secondary buttons do not cast a shadow. A border at white 10% or 15%, or a shift to Inset, is enough.

## Shapes

Corners are 8px (`rounded-lg`) on buttons, fields, and the switch hit target. Groups of rows and the drop zone use 12px (`rounded-xl`). The unit toggle uses 6px (`rounded-md`) inside an 8px track. Switches, the drag handle, and the colour of a Polygon are pills or circles.

Borders are 1px. The drop zone is dashed and turns Signal teal while a file is over it. The scale bar has no top border and a 3px ink stroke on the other three sides.

## Components

### Buttons

- **Shape:** 8px corners. Height 44px.
- **Primary:** Signal teal fill, Ink on teal, 14px semibold, horizontal padding 16px. Hover brightens by 5%. Disabled drops to 40% opacity.
- **Secondary:** Transparent fill, slate-200 text, 1px white 15% border, horizontal padding 12px. Hover fills white at 5%.
- **Destructive:** The same secondary shape with danger text.
- **Press:** `.pressable` scales to 0.97. The transition is transform, background, border, and filter over 120ms ease-out. Reduced motion removes the scale.

### Cards / Containers

- **Corner style:** 12px for a group of rows, the drop zone, and the measure menu.
- **Background:** Inset at 60% for lists. The measure menu is Panel at 95%.
- **Shadow strategy:** Float, and only when the container sits over the map or over a row.
- **Border:** 1px white at 10% or 15%.
- **Internal padding:** 12px for menus and notes. The drop zone is 20px.

### Inputs / Fields

- **Style:** 8px corners, 1px white 10% border, black at 30% fill, 12px horizontal padding, 44px tall, 16px text so a phone does not zoom.
- **Focus:** Border becomes Signal teal. The keyboard focus ring is Focus teal, 2px, offset 2px.
- **Error:** Copy turns danger. There is no separate error chrome on the field.

### Navigation

There is no app navigation. The header holds the wordmark and Export snapshot. The sidebar is three numbered sections, not a menu. On a phone the map stays first and the sections scroll beneath it.

### Switch

The track is 24px by 44px, a pill. Off is white at 15%. On is Selected teal. The knob is a 20px white circle with the Knob shadow. It sits 2px from the top and slides from 2px to 20px.

### Map marks

The drag handle is a 20px circle in the Polygon colour with a 2px white stroke and the Marker shadow. A floating label uses Panel at 90%, 8px corners, and the Float shadow.

### Toolbox

The Toolbox replaces Measure. It sits on the map in the top-left slot, outside the snapshot frame. The button and the popup use Panel at 95%, 12px corners on the popup, 8px corners on the tool buttons, and the Float shadow. The active tool uses Selected teal. The readout uses the same panel. Lengths and areas use tabular numbers.

## Do's and Don'ts

### Do:

- **Do** keep primary actions on Signal teal (#2dd4bf) with Ink on teal (#042f2a).
- **Do** keep selected rows and the switch-on state on Selected teal (#0f766e).
- **Do** keep controls at least 44px tall.
- **Do** use tabular numbers for lengths, areas, and the scale bar.
- **Do** leave the map as the largest region, with the scale bar centred and readable in a PNG.

### Don't:

- **Don't** add a second accent colour for ordinary actions.
- **Don't** put a shadow on a sidebar row that is already sitting on Panel.
- **Don't** cover the zoom controls with the region name or the ScaleFindr mark.
- **Don't** shrink body fields below 16px on a phone.
- **Don't** invent a new corner size. Use 8px for controls and 12px for grouped panels.
