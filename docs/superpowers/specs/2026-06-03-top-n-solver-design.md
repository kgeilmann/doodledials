# Top-N Solver Solutions

## Summary

Show the top 12 best layouts during brute-force optimization and let the user pick one after the run completes. Live 4×3 thumbnail grid in the progress overlay; split-pane preview + picker in the result dialog.

## Motivation

The brute-force optimizer finds many feasible solutions but only surfaces the single best one. The user wants to browse the top solutions visually and choose, rather than accepting whatever the ranking algorithm decides is #1.

## Constraints

- Only applies to the brute-force optimizer (not force-directed)
- N=12 fixed (no config needed)
- Order of displayed solutions is not significant (insertion order)
- Ranking criteria: same `isBetterLayout()` function (min gap > variance > deviation sum > lexicographic)
- No performance regression: thumbnail SVGs use string substitution (`combineOptimizerSvgTemplate`), not canvas renders

## Architecture

### 1. Optimizer changes (`src/lib/optimizer/run-bruteforce-optimizer.ts`)

**Keep `bestLayout` for pruning, add `topLayouts: Record<string, number>[]` for display**

- Constant `MAX_TOP_LAYOUTS = 12`
- `bestLayout` remains the single incumbent used for bound pruning (`assignedMinGapUpperBound < incumbentMinGap`) — this must be the best layout found so far for correct pruning.
- New function `addToTopLayouts(candidate)`: appends if < 12; otherwise finds the worst layout via `analyzeCircularGaps` + `isBetterLayout` and replaces if candidate is strictly better. Returns `boolean` (whether the list changed).
- When a candidate becomes the new `bestLayout`, it also goes through `addToTopLayouts` (so the top-12 always includes the global best).
- Add `topLayouts` to `OptimizerResult`, `BruteforceResumeContext`, and `OptimizerProgress`

**Progress reporting**

- Extend `OptimizerProgress` with optional fields:
  - `topLayouts?: Record<string, number>[]`
  - `optimizerSvgTemplate?: OptimizerSvgTemplate` — serializable template needed for thumbnail rendering in the UI
- Track a `topLayoutsDirty` flag in the optimizer. When `addToTopLayouts` returns true, set the flag. On each progress report call, if the flag is set, include `topLayouts` and `optimizerSvgTemplate` in the payload and clear the flag.
- This ensures thumbnails are only computed (sent over the progress callback) when the set actually changes.

### 2. UI — Progress Overlay (`src/routes/+page.svelte`)

- Add state: `optimizerTopLayouts: Record<string, number>[]`
- Add state: `optimizerThumbnailSvgs: string[]` (computed SVG strings for each top layout)
- Add state: `optimizerSelectedThumbnailIndex: number | null` — which thumbnail is currently selected
- In the progress handler, when `progress.topLayouts` is present, update `optimizerTopLayouts`
- Compute thumbnail SVGs: `combineOptimizerSvgTemplate(optimizerSvgTemplate, layout)` — triggered by a `$derived` or `$effect` watching `optimizerTopLayouts`
- Overlay layout changes:
  - Widen the overlay panel (e.g., `max-w-4xl`)
  - Below the progress bar/time: render a 4×3 grid of thumbnail containers (120px square)
  - Each thumbnail: `{@html svg}` inside a small bordered container
  - Empty slots (fewer than 12 solutions yet): dashed border placeholder
  - Click on a thumbnail: set `optimizerSelectedThumbnailIndex`, show a compact stats bar below the grid ("Min gap: 27°, Variance: 156")
  - Cancel button remains at the bottom

### 3. UI — Result Picker Dialog (`src/routes/+page.svelte`)

Replace the current `bruteforceResultDialogOpen` section with:

- Dialog width: `max-w-4xl` (or `max-w-5xl`)
- Split layout:
  - **Left panel** (280px): Compact 2×6 thumbnail grid
    - Each thumbnail ~100px square with rank number badge
    - Selected thumbnail gets an indigo border (`border-3 border-indigo-500`)
  - **Right panel** (flex-1): Large preview of the selected layout
    - Title bar: "Selected: Layout #N" + stats (min gap, variance, deviation sum)
    - Full-size SVG preview area (~300px min-height) using `combineOptimizerSvgTemplate`
    - Summary stats below: combinations searched, feasible layouts, elapsed, stop reason
- Footer bar:
  - Left: "Continue searching" button (only when `stopReason === 'time_limit'`)
  - Right: Cancel + "Accept Layout" buttons
- Accepting applies the selected layout to the main dial via `doodledialStore.applyLayerRotations()`

### 4. Resume Context

`BruteforceResumeContext` carries both:

- `bestLayout: Record<string, number> | null` (incumbent for pruning — unchanged)
- `topLayouts: Record<string, number>[]` (up to 12 layouts for display — new)
- `feasibleSolutionsFound: number` (unchanged)

When resuming, the optimizer restores both `bestLayout` and `topLayouts` from the resume context so continued searches preserve the top-12 and pruning works correctly.

### Data Flow

```
search() finds feasible solution at leaf node:
  → if isBetterLayout(candidate, bestLayout): bestLayout = candidate
  → addToTopLayouts(candidate) → if changed, set topLayoutsDirty flag
    → next onProgress() call where flag is set includes topLayouts[] + optimizerSvgTemplate
      → UI stores topLayouts, computes thumbnail SVGs via combineOptimizerSvgTemplate
        → 4×3 grid re-renders (new/updated cells)

After run completes:
  → OptimizerResult contains topLayouts[] + bestLayout
  → Result dialog opens with left/right split
  → User clicks thumbnails to preview at full size
  → User clicks "Accept Layout" → applyLayerRotations(selectedLayout)
```

### Performance

- `addToTopLayouts` is O(N) where N=12 — trivial
- Thumbnail SVGs are `combineOptimizerSvgTemplate` which is string replacement (no DOM, no canvas) — negligible cost
- Only recomputed when `topLayouts` actually changes (not on every progress tick)
- The existing `bestLayout` for bound pruning is unchanged — no impact on search performance
