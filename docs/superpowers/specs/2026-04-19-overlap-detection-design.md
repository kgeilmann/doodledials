# Overlap Detection Design

## Overview

Detect overlapping cutout shapes between layers and display warnings in the layer list when user requests it.

## Trigger

- Button in layer panel header: "Check Overlaps" (icon + text)
- Only enabled when ≥2 layers exist
- Button disabled during detection

## Algorithm (Option A)

### Render Phase

1. Determine render resolution: 200x200 pixels (sufficient for overlap detection, fast)
2. For each layer:
   - Create offscreen canvas at 200x200
   - Render that layer's `.cutout` shapes to canvas as filled paths (any color)
   - Get ImageData (Uint8ClampedArray of RGBA values)
   - Store as 2D boolean array: `hasPixel[x][y] = true` if alpha > 0

### Comparison Phase

1. For each layer pair (i, j) where i < j:
   - Iterate over all pixels
   - If `layerA.hasPixel[x][y]` AND `layerB.hasPixel[x][y]`, overlap exists
   - Break early on first overlap found (don't need full intersection)

### Results

- Store map: `layerId → Set<overlappingLayerId>`
- Clear previous results before new detection

## UI Display

### Layer List

- For each layer, check if it has entries in overlap map
- If overlapping: show warning icon (⚠️) next to layer name
- Icon has tooltip showing all overlapping layers

### Button State

- "Check Overlaps" button in layer panel header
- Icon: warning/triangle icon
- Disabled when <2 layers or detection running
- Shows spinner/loading state during detection

### Clear Behavior

- Clear overlap results when any layer changes (rotation, visibility, content)
- Or: keep results until user runs detection again (simpler)

## Data Flow

```
User clicks "Check Overlaps"
    ↓
renderLayerToCanvas(layer) for each layer
    ↓
compareLayerPairs() - find all overlaps
    ↓
updateStore({ overlaps: Map<layerId, Set<overlappingLayerId>> })
    ↓
LayerList reads store, displays warning icons
```

## Implementation Files

- New: `src/lib/utils/overlap-detection.ts` - core detection logic
- Modify: `src/lib/stores/doodledial.svelte.ts` - add overlap state
- Modify: `src/lib/components/LayerList.svelte` - add button and icons

## Acceptance Criteria

- [ ] Button appears in layer panel header
- [ ] Button disabled when <2 layers
- [ ] Button shows loading state during detection
- [ ] All layer pairs checked (including non-visible)
- [ ] Warning icon appears on affected layers
- [ ] Tooltip shows all overlapping partners
- [ ] Results clear on layer changes (or manual refresh)
