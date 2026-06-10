# Preview Pan (Grab-to-Scroll) Design

## Problem

When the dial preview is zoomed in beyond the viewport, scrollbars appear. Navigating the preview requires using scrollbars with the mouse — there is no click-and-drag panning.

## Solution

Add grab-to-pan on the preview's background area. When the user clicks and drags on empty space (not on a layer, label, title, or zoom control), the viewport scrolls to follow the pointer.

## Interaction

- **Cursor**: The scroll container shows `cursor: grab`. While actively panning, `cursor: grabbing`.
- **Activation**: `pointerdown` on background area (no layer/label/title hit, no zoom control) enters pan mode.
- **Panning**: `pointermove` adjusts `scrollLeft`/`scrollTop` by the pointer delta.
- **Deactivation**: `pointerup` ends pan mode. Pointer capture ensures reliable tracking.

## Implementation

### Scroll container ref

Add `bind:this` to the existing `overflow-auto` div to access `scrollLeft`/`scrollTop`.

### Pan state

- `isPanning: $state(false)` flag.
- `panStartX, panStartY: number` — initial pointer position when pan started.
- `scrollStartLeft, scrollStartTop: number` — captured at pan start.

### Event flow in `handlePointerDown`

1. If `optimizerStore.optimizerPending`, return.
2. Check target ancestry for `[data-disc-title]`, `.path-label`, or `[data-layer-id]`. If any hit, proceed with existing behavior (title drag, label drag, or layer rotation).
3. Check if target is inside zoom controls (handled via `stopPropagation` already).
4. Otherwise → it's a background click. Enter pan mode: set `isPanning = true`, capture pointer, record `scrollStartLeft`/`scrollStartTop` and `panStartX`/`panStartY`.

### Event flow in `handlePointerMove`

- If `isPanning`, compute `dx = e.clientX - panStartX`, `dy = e.clientY - panStartY`. Set `scrollLeft = scrollStartLeft - dx`, `scrollTop = scrollStartTop - dy`.
- Existing drag handlers remain unchanged; pan check runs first or is mutually exclusive.

### Event flow in `handlePointerUp`

- If `isPanning`, release pointer capture, reset `isPanning` to false.

### Cursor styling

Add CSS on the scroll container:

- Default: `cursor: grab`
- While panning: `cursor: grabbing`

## Files Changed

- `src/lib/components/DialPreview.svelte` — add pan state, scroll container ref, modify pointer handlers, add CSS.
