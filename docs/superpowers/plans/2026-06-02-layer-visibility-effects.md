# Layer Visibility Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invisible layers are excluded from overlap detection, export, and optimization, with a visual banner in the preview when layers are hidden.

**Architecture:** Four independent changes: (1) filter invisible layers before overlap/cutout-gap detection in the store, (2) filter before passing to export functions, (3) filter before passing to optimizer, (4) add an amber banner bar to DialPreview. No new files needed — all changes are modifications to existing files.

**Tech Stack:** TypeScript, Svelte 5 (runes), Tailwind CSS

---

### Task 1: Store — filter invisible layers from overlap/cutout-gap detection

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts:32-67`

- [ ] **Step 1: Update `runOverlapDetection()` to filter invisible layers**

Replace:

```typescript
async function runOverlapDetection() {
	if (!combinedSvg || layers.size < 2) {
		overlaps = new Map();
		return;
	}
	checkingOverlaps = true;
	try {
		const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
		const result = await detectOverlaps(layerArray, combinedSvg);
		overlaps = result;
	} catch (err) {
		console.error('Overlap detection failed:', err);
	} finally {
		checkingOverlaps = false;
	}
}
```

With:

```typescript
async function runOverlapDetection() {
	if (!combinedSvg || layers.size < 2) {
		overlaps = new Map();
		return;
	}
	checkingOverlaps = true;
	try {
		const layerArray = Array.from(layers.values())
			.filter((l) => l.visible)
			.sort((a, b) => a.index - b.index);
		if (layerArray.length < 2) {
			overlaps = new Map();
			return;
		}
		const result = await detectOverlaps(layerArray, combinedSvg);
		overlaps = result;
	} catch (err) {
		console.error('Overlap detection failed:', err);
	} finally {
		checkingOverlaps = false;
	}
}
```

- [ ] **Step 2: Update `runCutoutGapDetection()` to filter invisible layers**

Replace:

```typescript
async function runCutoutGapDetection() {
	if (!combinedSvg || layers.size < 2) {
		cutoutGaps = new Map();
		return;
	}
	try {
		const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
		const optimizerGapMm = config.optimizerGapMm ?? 2;
		const result = await detectCutoutGaps(layerArray, combinedSvg, optimizerGapMm, config.diameter);
		cutoutGaps = result;
	} catch (err) {
		console.error('Cutout gap detection failed:', err);
	}
}
```

With:

```typescript
async function runCutoutGapDetection() {
	if (!combinedSvg || layers.size < 2) {
		cutoutGaps = new Map();
		return;
	}
	try {
		const layerArray = Array.from(layers.values())
			.filter((l) => l.visible)
			.sort((a, b) => a.index - b.index);
		if (layerArray.length < 2) {
			cutoutGaps = new Map();
			return;
		}
		const optimizerGapMm = config.optimizerGapMm ?? 2;
		const result = await detectCutoutGaps(layerArray, combinedSvg, optimizerGapMm, config.diameter);
		cutoutGaps = result;
	} catch (err) {
		console.error('Cutout gap detection failed:', err);
	}
}
```

- [ ] **Step 3: Expose `hiddenLayerCount` on the store**

Add after the `getLayerArray` function:

```typescript
function getHiddenLayerCount(): number {
	return Array.from(layers.values()).filter((l) => !l.visible).length;
}
```

Add to the returned object (after `get layers()`):

```typescript
get hiddenLayerCount() {
    return getHiddenLayerCount();
},
```

- [ ] **Step 4: Run tests to verify**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

---

### Task 2: Export — filter invisible layers before export

**Files:**

- Modify: `src/lib/components/ExportButton.svelte:33-47`

- [ ] **Step 1: Add a helper to get visible layers and apply in both export paths**

At the top of the `<script>` block, add a helper:

```typescript
function getVisibleLayers() {
	return doodledialStore.layers.filter((l) => l.visible);
}
```

Update `exportSvg()`:

```typescript
function exportSvg() {
	if (!doodledialStore.svgContent) return;

	try {
		const svg = exportLaserSvg(
			doodledialStore.svgContent,
			doodledialStore.config,
			getVisibleLayers()
		);
		createDownload(svg, 'doodledial.svg', 'image/svg+xml');
		menuOpen = false;
	} catch (err) {
		doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
	}
}
```

Update `exportStlFromDialog()`:

```typescript
function exportStlFromDialog() {
	if (!doodledialStore.svgContent) return;

	try {
		const stl = exportStl(doodledialStore.svgContent, doodledialStore.config, getVisibleLayers(), {
			discThicknessMm: parseThickness(discThicknessMm, 3),
			markThicknessMm: parseThickness(markThicknessMm, 0.5)
		});
		createDownload(stl, 'doodledial.stl', 'model/stl');
		closeStlDialog();
	} catch (err) {
		doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
	}
}
```

- [ ] **Step 2: Run checks**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

---

### Task 3: Optimizer — filter invisible layers

**Files:**

- Modify: `src/routes/+page.svelte:214-219`

- [ ] **Step 1: Filter invisible layers from optimizer input**

Replace:

```typescript
const optimizerInput = {
	diameter: doodledialStore.config.diameter,
	config: doodledialStore.config,
	layers: doodledialStore.layers,
	svgContent: doodledialStore.svgContent
};
```

With:

```typescript
const optimizerInput = {
	diameter: doodledialStore.config.diameter,
	config: doodledialStore.config,
	layers: doodledialStore.layers.filter((l) => l.visible),
	svgContent: doodledialStore.svgContent
};
```

- [ ] **Step 2: Run checks**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

---

### Task 4: Preview banner — visual hint for hidden layers

**Files:**

- Modify: `src/lib/components/DialPreview.svelte`

- [ ] **Step 1: Add the hidden-layer banner to the preview**

Add to the `<script>` block after the existing imports and state:

```typescript
const hiddenCount = $derived(doodledialStore.hiddenLayerCount);
```

Add inside the preview container (after the label-edit-mode indicator div, before the SVG container), wrapped in a conditional:

```svelte
{#if hiddenCount > 0}
	<div
		class="absolute top-0 left-0 right-0 bg-amber-400 text-amber-900 text-xs px-3 py-2 rounded-t-xl flex items-center gap-2 z-20 shadow-sm"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-4 w-4 shrink-0"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fill-rule="evenodd"
				d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
				clip-rule="evenodd"
			/>
		</svg>
		<span class="flex-1">
			{hiddenCount} of {doodledialStore.layers.length} layers hidden — excluded from export, optimization,
			and overlap checks
		</span>
		<button
			type="button"
			onclick={() => doodledialStore.showAllLayers()}
			class="bg-amber-300 hover:bg-amber-200 active:bg-amber-400 px-2 py-0.5 rounded text-xs font-medium transition-colors"
		>
			Show all
		</button>
	</div>
{/if}
```

Place this immediately after the label-edit-mode `<div>` (around line 228) but the wrapper div already has `class="relative z-10"` etc. Actually, the banner should be inside the preview container but absolutely positioned at the top. The preview container is:

```html
<div
	class="bg-white rounded-xl shadow-lg p-4 flex items-center justify-center overflow-hidden relative z-10 ..."
	bind:this="{svgContainer}"
	...
>
	{#if doodledialStore.labelEditMode}
	<div class="absolute top-2 left-2 ...">Drag labels to reposition</div>
	{/if}
	<div class="max-w-full max-h-full flex items-center justify-center">
		{@html doodledialStore.combinedSvg || ''}
	</div>
</div>
```

The banner should go inside the same container, between the label-edit-mode text and the SVG div. Since the container already has `relative`, the banner can be `absolute top-0 left-0 right-0`.

- [ ] **Step 2: Run checks**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings
