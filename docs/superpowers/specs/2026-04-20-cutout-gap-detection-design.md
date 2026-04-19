# Cutout Gap Too Small Detection

## Overview

Detect when cutout paths are too close to each other (within 2mm) and warn users in the layer list.

## Background

The existing overlap detection uses pixel-based rendering to detect overlapping layers. This approach will be extended to detect gaps that are too small between cutouts.

## Distance Threshold

- 2mm gap distance (fixed)

## Algorithm

1. Extract all layers that contain a cutout path (path with CSS class `cutout`)
2. For each cutout pair:
   - Render the first cutout with a 2mm stroke (fill must be transparent/invisible)
   - Render the second cutout normally
   - Check if the stroked cutout's pixels touch any pixels of the second cutout
   - If touch detected, record as a gap violation
3. Return a Map of cutout ID → Set of cutout IDs it conflicts with

### Rendering Approach

- Use the same `renderLayersToBitmaps()` infrastructure from overlap detection
- When rendering a cutout for gap detection, apply a 2mm stroke instead of using the path's default stroke
- The stroke width in SVG units needs to account for the render size vs actual dial diameter

## UI

- Warning icon in layer list (same icon as overlap warning)
- Tooltip shows which cutouts the gap violation is with

## Implementation

### Files to Modify

1. `src/lib/utils/overlap-detection.ts`
   - Add `detectCutoutGaps()` function

2. `src/lib/stores/doodledial.svelte.ts`
   - Add `cutoutGaps` state
   - Add `runCutoutGapDetection()` function
   - Trigger detection on layer changes

3. `src/lib/components/LayerList.svelte`
   - Add warning icon for cutout gaps

### State

```typescript
let cutoutGaps = $state<Map<string, Set<string>>>(new Map());
```

### Trigger Events

- New SVG upload
- Layer add/remove
- Layer rotation change
- Layer visibility change (affects what's considered)

## Acceptance Criteria

1. Cutout pairs with gaps < 2mm show warning icon in layer list
2. Tooltip identifies which cutouts conflict
3. Detection runs automatically on relevant layer changes
