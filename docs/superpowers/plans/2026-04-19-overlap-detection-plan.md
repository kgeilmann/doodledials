# Overlap Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect overlapping cutout shapes between layers when user requests, show warning icons in layer list

**Architecture:** Render each layer individually to an offscreen canvas, compare pixel data to find overlaps, display results in UI

**Tech Stack:** Svelte 5, SVG.js (@svgdotjs/svg.js), Canvas API

---

### Task 1: Add overlap state to store

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts:1-148`

- [ ] **Step 1: Add overlap state variables**

Add after line 13:

```typescript
let checkingOverlaps = $state<boolean>(false);
let overlaps = $state<Map<string, Set<string>>>(new Map());
```

- [ ] **Step 2: Add getter methods**

Add after line 45 (in return object):

```typescript
get checkingOverlaps() {
    return checkingOverlaps;
},
get overlaps() {
    return overlaps;
},
```

- [ ] **Step 3: Add methods**

Add after line 83 (before addLayer):

```typescript
setCheckingOverlaps(checking: boolean) {
    checkingOverlaps = checking;
},
setOverlaps(newOverlaps: Map<string, Set<string>>) {
    overlaps = newOverlaps;
},
getOverlappingLayers(layerId: string): string[] {
    return Array.from(overlaps.get(layerId) || []);
},
clearOverlaps() {
    overlaps = new Map();
},
```

- [ ] **Step 4: Clear overlaps on layer changes**

In the `addLayer` function after setting the layer, call `clearOverlaps()`:

```typescript
clearOverlaps();
```

In `toggleVisibility`, `setLayerRotation`, `setLayerLabelOffset` - add similar clear call or ensure overlaps are cleared when layers change

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: add overlap detection state to store"
```

---

### Task 2: Create overlap detection utility

**Files:**

- Create: `src/lib/utils/overlap-detection.ts`
- Test: `tests/utils/overlap-detection.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { detectOverlaps } from '$lib/utils/overlap-detection';
import type { Layer, SVGContent } from '$lib/types/doodledial';

describe('detectOverlaps', () => {
	it('returns empty map when no layers', async () => {
		const result = await detectOverlaps(
			[],
			{ raw: '', filename: '' },
			{
				diameter: 200,
				minDiameter: 50,
				maxDiameter: 200,
				borderWidth: 2,
				padding: 0.05,
				offsetX: 0,
				offsetY: 0,
				scale: 1
			}
		);
		expect(result.size).toBe(0);
	});

	it('returns empty map when single layer', async () => {
		const svgContent = {
			raw: '<svg viewBox="0 0 100 100"><g id="layer1"><circle class="cutout" cx="25" cy="50" r="20"/></g></svg>',
			filename: 'test.svg'
		};
		const layers = [{ id: 'layer1', name: 'Layer 1', index: 0, visible: true, rotation: 0 }];
		const config = {
			diameter: 200,
			minDiameter: 50,
			maxDiameter: 200,
			borderWidth: 2,
			padding: 0.05,
			offsetX: 0,
			offsetY: 0,
			scale: 1
		};
		const result = await detectOverlaps(layers, svgContent, config);
		expect(result.size).toBe(0);
	});
});
```

Run: `pnpm vitest tests/utils/overlap-detection.test.ts -v`
Expected: FAIL (module not found)

- [ ] **Step 2: Create overlap-detection.ts**

```typescript
import { SVG, Svg } from '@svgdotjs/svg.js';
import type { Layer, DialConfig, SVGContent } from '$lib/types/doodledial';

const RENDER_SIZE = 200;

interface PixelData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export async function detectOverlaps(
	layers: Layer[],
	content: SVGContent,
	config: DialConfig
): Promise<Map<string, Set<string>>> {
	const overlaps = new Map<string, Set<string>>();

	if (layers.length < 2) {
		return overlaps;
	}

	const layerBitmaps = await renderLayersToBitmaps(layers, content, config);

	for (let i = 0; i < layers.length; i++) {
		for (let j = i + 1; j < layers.length; j++) {
			const bitmapA = layerBitmaps.get(layers[i].id);
			const bitmapB = layerBitmaps.get(layers[j].id);

			if (!bitmapA || !bitmapB) continue;

			if (bitmapsOverlap(bitmapA, bitmapB)) {
				if (!overlaps.has(layers[i].id)) {
					overlaps.set(layers[i].id, new Set());
				}
				if (!overlaps.has(layers[j].id)) {
					overlaps.set(layers[j].id, new Set());
				}
				overlaps.get(layers[i].id)!.add(layers[j].id);
				overlaps.get(layers[j].id)!.add(layers[i].id);
			}
		}
	}

	return overlaps;
}

async function renderLayersToBitmaps(
	layers: Layer[],
	content: SVGContent,
	config: DialConfig
): Promise<Map<string, PixelData>> {
	const bitmaps = new Map<string, PixelData>();
	const doc = SVG(content.raw) as Svg;
	const cx = doc.viewbox().cx;
	const cy = doc.viewbox().cy;

	for (const layer of layers) {
		const svgLayer = doc.findOne('#' + layer.id) as any;
		if (!svgLayer) continue;

		const tempDoc = SVG(content.raw) as Svg;
		const allLayers = tempDoc.findOne('#all');

		const clonedLayer = svgLayer.clone();
		clonedLayer.attr('visibility', 'visible');
		clonedLayer.attr('transform', `rotate(${layer.rotation}, ${cx}, ${cy})`);

		tempDoc.clear();
		if (allLayers) {
			const newGroup = tempDoc.group().id('all');
			newGroup.add(clonedLayer);
		}

		const offsetXPx = config.offsetX * ((config.diameter * 300) / 25400);
		const offsetYPx = config.offsetY * ((config.diameter * 300) / 25400);

		tempDoc.find('.cutout').forEach((c: any) => {
			c.scale(config.scale, cx, cy).translate(offsetXPx, offsetYPx);
		});

		const pixelDiameter = Math.round((config.diameter * 300) / 25400);
		tempDoc.width(pixelDiameter);
		tempDoc.height(pixelDiameter);

		const bitmap = await renderSvgToBitmap(tempDoc.svg(), RENDER_SIZE, RENDER_SIZE);
		bitmaps.set(layer.id, bitmap);
	}

	return bitmaps;
}

async function renderSvgToBitmap(
	svgString: string,
	width: number,
	height: number
): Promise<PixelData> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, width, height);

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0, width, height);
			resolve({
				data: ctx.getImageData(0, 0, width, height).data,
				width,
				height
			});
		};
		img.onerror = reject;
		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
	});
}

function bitmapsOverlap(a: PixelData, b: PixelData): boolean {
	const { width, height } = a;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const aFilled = a.data[idx + 3] > 0;
			const bFilled = b.data[idx + 3] > 0;

			if (aFilled && bFilled) {
				return true;
			}
		}
	}

	return false;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm vitest tests/utils/overlap-detection.test.ts -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/overlap-detection.ts tests/utils/overlap-detection.test.ts
git commit -m "feat: add overlap detection utility"
```

---

### Task 3: Add overlap detection to LayerList

**Files:**

- Modify: `src/lib/components/LayerList.svelte:1-162`

- [ ] **Step 1: Import and add button**

Add to script section after imports:

```typescript
import { detectOverlaps } from '$lib/utils/overlap-detection';
import type { DialConfig } from '$lib/types/doodledial';

let isChecking = $derived(doodledialStore.checkingOverlaps);
let hasSufficientLayers = $derived(doodledialStore.layers.length >= 2);
```

Add button in layer panel header (after Edit Labels button):

```svelte
<span class="text-gray-300">|</span>
<button
	type="button"
	onclick={handleCheckOverlaps}
	disabled={!hasSufficientLayers || isChecking}
	class="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
>
	{isChecking ? 'Checking...' : 'Check Overlaps'}
</button>
```

Add handleCheckOverlaps function:

```typescript
async function handleCheckOverlaps() {
	if (!doodledialStore.svgContent) return;

	doodledialStore.setCheckingOverlaps(true);
	doodledialStore.clearOverlaps();

	try {
		const overlaps = await detectOverlaps(
			doodledialStore.layers,
			doodledialStore.svgContent,
			doodledialStore.config as DialConfig
		);
		doodledialStore.setOverlaps(overlaps);
	} catch (err) {
		console.error('Overlap detection failed:', err);
	} finally {
		doodledialStore.setCheckingOverlaps(false);
	}
}
```

- [ ] **Step 2: Add warning icons**

Add helper:

```typescript
function getOverlappingLayers(layerId: string): string[] {
	return doodledialStore.getOverlappingLayers(layerId);
}
```

Add icon in layer list item (after layer name):

```svelte
{#if getOverlappingLayers(layer.id).length > 0}
	<span
		class="inline-flex items-center gap-1 text-xs text-amber-600"
		title="Overlaps with: {getOverlappingLayers(layer.id)
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

- [ ] **Step 3: Run tests and check**

Run: `pnpm check && pnpm lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/LayerList.svelte
git commit -m "feat: add overlap detection button and warning icons"
```

---

### Task 4: Test and verify

**Files:**

- Manual testing

- [ ] **Step 1: Test with sample SVG**

Upload a sample SVG with multiple overlapping layers

- Click "Check Overlaps" button
- Verify warning icons appear on overlapping layers
- Verify tooltip shows correct overlapping partners

- [ ] **Step 2: Test with non-visible layers**

Make some layers hidden

- Run detection
- Verify non-visible layers still show in overlap results

- [ ] **Step 3: Test clear behavior**

Change layer rotation

- Verify overlaps are cleared (icons disappear)

---

### Task 5: Final commit

- [ ] **Step 1: Commit with all changes**

```bash
git add .
git commit -m "feat: add overlap detection for cutout shapes

- Add overlap state to store
- Create overlap-detection utility
- Add Check Overlaps button to LayerList
- Show warning icons for overlapping layers"
```
