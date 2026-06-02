# Layer Visibility Effects

## Summary

Refine the semantics of layer visibility: invisible layers are excluded from overlap detection, export, and optimization, plus a visual banner in the preview panel alerts the user when layers are hidden.

## Changes

### 1. Overlap Detection — exclude invisible layers

**Files:** `src/lib/stores/doodledial.svelte.ts`

In `runOverlapDetection()` and `runCutoutGapDetection()`, filter `layerArray` to only include visible layers before passing to `detectOverlaps` / `detectCutoutGaps`.

Also update the visibility toggling methods (`toggleVisibility`, `showAllLayers`, `hideAllLayers`) to clear overlaps when layers become visible/hidden — currently only `hideAllLayers` and `showAllLayers` clear overlaps, but `toggleVisibility` does not.

### 2. Export — exclude invisible layers

**File:** `src/lib/components/ExportButton.svelte`

In `exportSvg()` and `exportStlFromDialog()`, filter `doodledialStore.layers` to only pass visible layers to the export functions. The laser SVG export already respects `visibility: hidden` via `combineDoodledial`, but invisible layers shouldn't be passed at all — their cutout paths shouldn't become holes in the exported disc, and their marks/labels shouldn't appear.

### 3. Optimization — exclude invisible layers

**File:** `src/routes/+page.svelte`

In `handleRunOptimizer()`, when building the `optimizerInput`, filter `doodledialStore.layers` to only pass visible layers. The optimizer should only consider visible layers for rotation/overlap resolution.

### 4. Preview banner — visual hint for hidden layers

**File:** `src/lib/components/DialPreview.svelte`

Add an amber banner at the top of the preview card when at least one layer is hidden. The banner shows:

- Warning icon + "X of N layers are hidden — excluded from export, optimization, and overlap checks"
- "Show all" action button

The banner should be a fixed element inside the preview container, positioned at the top.

**File:** `src/lib/stores/doodledial.svelte.ts`

Expose a `hiddenLayerCount` derived value so the component can react to it.

## Implementation Order

1. Store: filter layers in overlap/cutout-gap detection, expose `hiddenLayerCount`
2. Export button: filter layers before passing to export functions
3. Optimizer: filter layers before passing to optimizer
4. Preview: add banner component
