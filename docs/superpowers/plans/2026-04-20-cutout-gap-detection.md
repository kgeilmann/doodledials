# Cutout Gap Too Small Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect when cutout paths are within 2mm of each other and show warning icons in the layer list.

**Architecture:** Extend existing pixel-based overlap detection to also detect gaps between cutouts. Render each cutout with a 2mm stroke and check if it touches other cutouts.

**Tech Stack:** Svelte 5, TypeScript, SVG.js

---

### Task 1: Add detectCutoutGaps function to overlap-detection.ts

**Files:**

- Modify: `src/lib/utils/overlap-detection.ts:1-113`

- [ ] **Step 1: Add helper to identify cutout layers**

```typescript
function hasCutout(layer: Layer, svgContent: string): boolean {
	const tempDoc = SVG(svgContent) as Svg;
	const layerElement = tempDoc.findOne('#' + layer.id);
	if (!layerElement) return false;
	const cutout = layerElement.find('.cutout');
	return cutout.length > 0;
}
```

- [ ] **Step 2: Add function to render cutout with stroke**

```typescript
async function renderCutoutWithStroke(
	layer: Layer,
	svgContent: string,
	strokeWidthMm: number,
	renderSize: number,
	dialDiameter: number
): Promise<PixelData> {
	const tempDoc = SVG(svgContent) as Svg;
	tempDoc.find(':not(.cutout)').forEach((e) => e.attr('visibility', 'hidden'));

	const layerElement = tempDoc.findOne('#' + layer.id);
	const cutout = layerElement?.findOne('.cutout');
	if (!cutout) throw new Error('No cutout found');

	const strokeWidthPx = (strokeWidthMm / dialDiameter) * renderSize;
	cutout.attr({
		fill: 'none',
		stroke: 'white',
		'stroke-width': strokeWidthPx
	});

	return renderSvgToBitmap(tempDoc.svg(), renderSize, renderSize);
}
```

- [ ] **Step 3: Add detectCutoutGaps function**

```typescript
export async function detectCutoutGaps(
	layers: Layer[],
	combinedSvg: string,
	gapMm: number = 2,
	dialDiameter: number = 100
): Promise<Map<string, Set<string>>> {
	const gaps = new Map<string, Set<string>>();

	const cutoutLayers = layers.filter((l) => hasCutout(l, combinedSvg));

	if (cutoutLayers.length < 2) {
		return gaps;
	}

	const strokedBitmaps = new Map<string, PixelData>();

	for (const layer of cutoutLayers) {
		const bitmap = await renderCutoutWithStroke(
			layer,
			combinedSvg,
			gapMm,
			RENDER_SIZE,
			dialDiameter
		);
		strokedBitmaps.set(layer.id, bitmap);
	}

	for (let i = 0; i < cutoutLayers.length; i++) {
		for (let j = i + 1; j < cutoutLayers.length; j++) {
			const strokedA = strokedBitmaps.get(cutoutLayers[i].id)!;
			const strokedB = strokedBitmaps.get(cutoutLayers[j].id)!;

			if (bitmapsOverlap(strokedA, strokedB)) {
				if (!gaps.has(cutoutLayers[i].id)) {
					gaps.set(cutoutLayers[i].id, new Set());
				}
				if (!gaps.has(cutoutLayers[j].id)) {
					gaps.set(cutoutLayers[j].id, new Set());
				}
				gaps.get(cutoutLayers[i].id)!.add(cutoutLayers[j].id);
				gaps.get(cutoutLayers[j].id)!.add(cutoutLayers[i].id);
			}
		}
	}

	return gaps;
}
```

The algorithm now:

1. Renders each cutout with a 2mm stroke (N bitmaps)
2. Checks all cutout pairs by comparing their stroked versions
3. This reuses the stroked bitmaps for all pair checks, avoiding redundant rendering

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/overlap-detection.ts
git commit -m "feat: add detectCutoutGaps function"
```

---

### Task 2: Add cutoutGaps state to store

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts:1-195`

- [ ] **Step 1: Import detectCutoutGaps**

```typescript
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';
```

- [ ] **Step 2: Add cutoutGaps state**

```typescript
let cutoutGaps = $state<Map<string, Set<string>>>(new Map());
```

- [ ] **Step 3: Add getter and methods**

```typescript
get cutoutGaps() {
  return cutoutGaps;
},
getCutoutGaps(layerId: string): string[] {
  return Array.from(cutoutGaps.get(layerId) || []);
},
setCutoutGaps(newGaps: Map<string, Set<string>>) {
  cutoutGaps = newGaps;
},
clearCutoutGaps() {
  cutoutGaps = new Map();
},
```

- [ ] **Step 4: Add runCutoutGapDetection function**

```typescript
async function runCutoutGapDetection() {
	if (!combinedSvg || layers.size < 2) {
		cutoutGaps = new Map();
		return;
	}
	try {
		const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
		const result = await detectCutoutGaps(layerArray, combinedSvg);
		cutoutGaps = result;
	} catch (err) {
		console.error('Cutout gap detection failed:', err);
	}
}
```

- [ ] **Step 5: Update triggers to also call runCutoutGapDetection**

In `runCutoutGapDetection`, pass diameter:

```typescript
const result = await detectCutoutGaps(layerArray, combinedSvg, 2, config.diameter);
```

Also call `runCutoutGapDetection()` in `addLayer`, `toggleVisibility`, `setLayerRotation` after the existing overlap detection.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: add cutoutGaps state and detection"
```

---

### Task 3: Add warning icon to LayerList

**Files:**

- Modify: `src/lib/components/LayerList.svelte:1-191`

- [ ] **Step 1: Add derived values for cutout gaps**

```typescript
const cutoutGapsMap = $derived(doodledialStore.cutoutGaps);

function getCutoutGapLayers(layerId: string): string[] {
	return Array.from(cutoutGapsMap.get(layerId) || []);
}
```

- [ ] **Step 2: Add icon next to overlap icon**

```svelte
{#if getCutoutGapLayers(layer.id).length > 0}
	<span
		class="inline-flex items-center gap-1 text-xs text-amber-600 ml-1"
		title="Gap too small with: {getCutoutGapLayers(layer.id)
			.map((id) => doodledialStore.getLayer(id)?.name || id)
			.join(', ')}"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v6a1 1 0 002 0V6a1 1 0 00-1-1z"
				clip-rule="evenodd"
			/>
		</svg>
	</span>
{/if}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/LayerList.svelte
git commit -m "feat: add cutout gap warning icon to layer list"
```

---

### Task 4: Run type check and lint

- [ ] **Step 1: Run pnpm check**

```bash
pnpm check
```

- [ ] **Step 2: Run pnpm lint**

```bash
pnpm lint
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: type and lint errors"
```
