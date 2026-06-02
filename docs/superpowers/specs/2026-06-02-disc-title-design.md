# Disc Title — Design Spec

## Overview

Add an optional engraved title to the disc that users can enter, position by dragging, and resize via controls in the sidebar.

## Data Model

New state in `doodledialStore` (top-level, same as `svgContent`, `combinedSvg`):

| Property            | Type     | Default       | Description                                    |
| ------------------- | -------- | ------------- | ---------------------------------------------- |
| `discTitle`         | `string` | `''`          | Title text content. Empty = no title rendered. |
| `discTitleX`        | `number` | SVG center X  | X position (SVG coords) of the title text      |
| `discTitleY`        | `number` | ~15% from top | Y position (SVG coords) of the title text      |
| `discTitleFontSize` | `number` | `12`          | Font size in SVG units (px)                    |

Methods:

- `setDiscTitle(text: string)` — set title text
- `setDiscTitlePosition(x: number, y: number)` — set position (from drag)
- `setDiscTitleFontSize(size: number)` — set font size

Default position: horizontally centered at the disc top (same X as disc center, Y = disc top ~15% inward).

## UI

The title controls live inside the existing **Disc Settings** sidebar section, below the diameter control and separated by a divider:

- **Title** — text input, placeholder "Optional disc title..."
- **Font size** — range slider with numeric display, range ~8–36

When `discTitle` is empty, no title text appears on the disc or in exports. The Disc Settings section heading already reads "Disc Settings" — no changes needed there.

## SVG Rendering

In `combineDoodledial()`, when `discTitle` is non-empty, add:

```svg
<text class="disc-title" data-disc-title="true"
      x="{discTitleX}" y="{discTitleY}"
      font-size="{discTitleFontSize}" font-weight="bold"
      font-family="sans-serif" text-anchor="middle"
      fill="black">The Title</text>
```

The title text sits in the root SVG (not inside any layer group), so it always renders on top and isn't affected by layer rotation.

## Drag Interaction

In `DialPreview.svelte`, augment the pointer event handlers:

- `handlePointerDown`: check if the target has `data-disc-title` attribute. If so, start title drag (set `isDraggingTitle = true`, capture pointer).
- `handlePointerMove`: if `isDraggingTitle`, compute the new SVG coordinates from the pointer position (same `getSvgPoint` helper used for path labels) and call `doodledialStore.setDiscTitlePosition(x, y)`.
- `handlePointerUp`: end drag, release pointer capture.

No rotation compensation needed — the title sits in root SVG coords (unlike path labels which live inside rotated layer groups).

Title dragging works without a special mode toggle — the user can always drag the title when they click on it.

## Exports

### Laser SVG (`laser-svg-export.ts`)

The `.disc-title` element is styled with the engrave class (same as existing text/labels):

```ts
doc.find('.disc-title').forEach((el) => {
	el.addClass(engraveClassName);
	el.css('fill', engraveColor);
});
```

### STL (`stl-export.ts`)

The title is sampled as glyph outlines (using `labelToThreeShapes`) and extruded onto the disc top surface, matching the existing `path-label` and `layer-label` handling but with title's own position and font size.

## Implementation Order

1. Add `discTitle`, `discTitleX`, `discTitleY`, `discTitleFontSize` state + methods to `doodledial.svelte.ts`
2. Add title input + font size control to `+page.svelte` inside the Disc Settings section
3. Add title rendering to `combineDoodledial()`
4. Add title drag handling to `DialPreview.svelte`
5. Add title export handling to `laser-svg-export.ts` and `stl-export.ts`
6. Add title to optimizer SVG template in `createOptimizerSvgTemplate` if needed
