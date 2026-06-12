# Decouple Dial Diameter from Cutout Scaling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure SVG generation so that changing the dial diameter scales the disc circle, marks, and labels but leaves cutout paths at a fixed visual size.

**Architecture:** Move disc-related elements (disc circle, center hole, per-layer marks and layer labels) into a dedicated `#disc-elements` group. The SVG viewport always uses `maxDiameter`. In `combineDoodledial`, scale `#disc-elements` by `diameter / maxDiameter` about the center. Cutout paths stay in their layer groups at normalized coordinates.

**Tech Stack:** TypeScript, Svelte 5, svg.js, Vitest

---

### Task 1: Restructure `parseSvgPaths` — create `#disc-elements` group

**Files:**

- Modify: `src/lib/utils/doodledial.ts:16-145`

- [ ] **Step 1: Update `parseSvgPaths` to create a `#disc-elements` group and move disc elements into it**

Current structure:

```
<g id="all">
  <g id="layer-0" class="layer">
    <path class="cutout"/>
    <g><line class="mark-line"/><text class="layer-label"/></g>
    <text class="path-label"/>
  </g>
  ...
</g>
<circle id="disc"/>
<circle id="center-hole"/>
```

New structure:

```
<g id="all">
  <g id="disc-elements">
    <circle id="disc"/>
    <circle id="center-hole"/>
    <g data-layer-id="layer-0"><line class="mark-line"/><text class="layer-label"/></g>
    ...
  </g>
  <g id="layer-0" class="layer">
    <path class="cutout"/>
    <text class="path-label"/>
  </g>
  ...
</g>
```

Change `parseSvgPaths` to:

- Add `const discElements = SVG().group().attr('id', 'disc-elements');` after creating `#all`.
- Replace `doc.circle(...).id('disc')` with `discElements.circle(...).id('disc')` (move to group).
- Replace `doc.circle(...).id('center-hole')` with `discElements.circle(...).id('center-hole')`.
- After creating each mark (`const mark = createMark(...)`), add mark to `discElements` instead of layer: replace `layer.add(mark)` with `discElements.add(mark)`.
- After the per-path loop, add `discElements` to `#all`: `all.add(discElements)`.
- Keep `all.add(layer)` for each layer group — unchanged.

- [ ] **Step 2: Run existing tests to verify baseline passes**

Run: `pnpm vitest run`
Expected: All tests pass. (If they don't, note failures for later — the SVG structure change may affect tests.)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/ src/lib/utils/doodledial.ts
git commit -m "refactor(parsesvgpaths): move disc elements into #disc-elements group"
```

---

### Task 2: Update `combineDoodledial` — fixed viewport + scale disc-elements

**Files:**

- Modify: `src/lib/utils/doodledial.ts:291-397`

- [ ] **Step 1: Update `combineDoodledial` to use fixed viewport and scale disc-elements**

Key changes:

1. Viewport is always `(config.maxDiameter * DPI) / MM_PER_INCH` pixels (instead of `config.diameter`-based).
2. Find `#disc-elements` and apply `scale(diameter/maxDiameter)` about center.
3. Keep existing cutout transform logic unchanged (rotation, `applyCutoutTransformsForGroup`, offset).
4. Keep `applyDiameter` option flag — when true, disc-elements get scaled; when false, no scaling (diameter treated as maxDiameter).

Replace the `applyDiameter` block (lines 349-353) with:

```typescript
const pixelDiameter = (config.maxDiameter * DPI) / MM_PER_INCH;
doc.width(pixelDiameter);
doc.height(pixelDiameter);

if (applyDiameter) {
	const discElements = doc.findOne('#disc-elements') as G | null;
	if (discElements) {
		const scaleFactor = config.diameter / config.maxDiameter;
		discElements.scale(scaleFactor, cx, cy);
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat(combinedoodledial): fixed viewport at maxDiameter, scale disc-elements by diameter"
```

---

### Task 3: Update optimizer template functions

**Files:**

- Modify: `src/lib/utils/doodledial.ts:210-246` (`createOptimizerSvgTemplate`)
- Modify: `src/lib/utils/doodledial.ts:273-289` (`precomputeOptimizerSvgContent`)

- [ ] **Step 1: Update viewport and disc scaling in optimizer template functions**

Both `createOptimizerSvgTemplate` and `precomputeOptimizerSvgContent` currently set viewport to `config.diameter`-based pixels. Change to `config.maxDiameter` and scale `#disc-elements` identically to `combineDoodledial`.

For `createOptimizerSvgTemplate`:

```typescript
// Replace:
const pixelDiameter = (config.diameter * DPI) / MM_PER_INCH;
doc.width(pixelDiameter);
doc.height(pixelDiameter);

// With:
const pixelDiameter = (config.maxDiameter * DPI) / MM_PER_INCH;
doc.width(pixelDiameter);
doc.height(pixelDiameter);

const discElements = doc.findOne('#disc-elements') as G | null;
if (discElements) {
	discElements.scale(config.diameter / config.maxDiameter, cx, cy);
}
```

For `precomputeOptimizerSvgContent` — same change (lines 281-288).

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "fix(optimizer): use maxDiameter viewport and scale disc-elements"
```

---

### Task 4: Verify laser export works correctly

**Files:**

- Inspect: `src/lib/utils/laser-svg-export.ts`

- [ ] **Step 1: Verify laser export behavior**

The laser SVG export calls `combineDoodledial(content, config, layers, null, null, { applyDiameter: true, ... })`. After Task 2, `applyDiameter: true` will scale disc-elements by `diameter/maxDiameter`. The viewport will be maxDiameter-based.

This should work correctly — the disc circle path will be at the right physical size in the SVG. No code change needed, just verification.

- [ ] **Step 2: Verify tests pass for export-formats**

Run: `pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts`
Expected: All pass. If tests fail, inspect and fix:

- `getParsedGeometry` finds `#disc` — should still work (ID is unique in document).
- `laser export keeps text and marks operations` — marks are now in `#disc-elements` but still present in SVG string.

---

### Task 5: Verify STL export works correctly

**Files:**

- Inspect: `src/lib/utils/stl-export.ts`

- [ ] **Step 1: Verify STL export still works**

STL export reads `content.raw` directly (not through `combineDoodledial`). The raw SVG now has `#disc-elements` group containing the disc circle.

The key line is (stl-export.ts:352):

```typescript
const discCircle = doc.findOne('#disc');
```

This still works because `doc.findOne('#disc')` finds the element by ID regardless of parent group nesting.

The `viewboxToMmScale` computation uses `discCircle.attr('r')` — the radius value is unchanged.

The cutout transforms use `doc.find('.cutout')` — cutout paths are still in layer groups with class `cutout`. No change needed.

- [ ] **Step 2: Run STL export test**

Run: `pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "STL"`
Expected: Pass.

---

### Task 6: Run full test suite and fix any failures

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass.

If any tests fail, fix them with minimal changes (usually test assertions that check SVG structure).

Common areas that might need test updates:

- `export-formats.svelte.spec.ts` — `getParsedGeometry` might need updates if SVG structure affects assertion values.
- `scale-transform.svelte.spec.ts` — tests cutout transform matrix, should be unaffected.

- [ ] **Step 2: Run lint and typecheck**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

---

### Task 7: Verify preview rendering in browser

- [ ] **Step 1: Start dev server and visually verify**

Run: `pnpm dev`
Expected: App loads. Upload an SVG. Change the diameter slider — disc circle and marks should scale, cutout paths should stay the same pixel size. Change the Scale slider — cutout paths should scale (existing behavior unchanged).

- [ ] **Step 2: Commit final changes**

```bash
git add -A
git commit -m "feat: decouple dial diameter from cutout scaling"
```
