# Disc Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, user-positionable engraved title to the disc.

**Architecture:** Title text content, position, and font size live as state in `doodledialStore`. Rendering happens in `combineDoodledial()` via an SVG `<text>` element with class `disc-title`. Users drag the title on the disc preview to position it. Exports pick up the `.disc-title` class for engrave styling.

**Tech Stack:** Svelte 5 (runes), SVG.js, Three.js/STLExporter, Vitest

---

### Task 1: Add disc title state to doodledialStore

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Add disc title state variables and reset**

Add these after the existing `cutoutGaps` state (around line 23):

```ts
let discTitle = $state<string>('');
let discTitleX = $state<number>(100);
let discTitleY = $state<number>(20);
let discTitleFontSize = $state<number>(12);
```

Add to the return object (around line 122, before `get config()`):

```ts
get discTitle() { return discTitle; },
get discTitleX() { return discTitleX; },
get discTitleY() { return discTitleY; },
get discTitleFontSize() { return discTitleFontSize; },
```

Add methods (after `setCenterHoleDiameter` around line 173):

```ts
setDiscTitle(text: string) {
    discTitle = text;
},
setDiscTitlePosition(x: number, y: number) {
    discTitleX = x;
    discTitleY = y;
},
setDiscTitleFontSize(size: number) {
    discTitleFontSize = size;
},
```

- [ ] **Step 2: Update `reset()` to clear title state**

In the `reset()` method (around line 374), add after `labelEditMode = false;`:

```ts
discTitle = '';
discTitleX = 100;
discTitleY = 20;
discTitleFontSize = 12;
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

Run: `pnpm exec vitest run src/lib/stores/doodledial-store.spec.ts`
Expected: All tests PASS

---

### Task 2: Add disc title tests for the store

**Files:**

- Modify: `src/lib/stores/doodledial-store.spec.ts`

- [ ] **Step 1: Write tests for disc title state**

Add after the existing `describe` block (after line 73):

```ts
describe('disc title', () => {
	beforeEach(() => {
		doodledialStore.reset();
	});

	it('defaults to empty title', () => {
		expect(doodledialStore.discTitle).toBe('');
		expect(doodledialStore.discTitleX).toBe(100);
		expect(doodledialStore.discTitleY).toBe(20);
		expect(doodledialStore.discTitleFontSize).toBe(12);
	});

	it('setDiscTitle updates title text', () => {
		doodledialStore.setDiscTitle('My Dial');
		expect(doodledialStore.discTitle).toBe('My Dial');
	});

	it('setDiscTitlePosition updates coordinates', () => {
		doodledialStore.setDiscTitlePosition(150, 50);
		expect(doodledialStore.discTitleX).toBe(150);
		expect(doodledialStore.discTitleY).toBe(50);
	});

	it('setDiscTitleFontSize updates font size', () => {
		doodledialStore.setDiscTitleFontSize(18);
		expect(doodledialStore.discTitleFontSize).toBe(18);
	});

	it('reset clears title to defaults', () => {
		doodledialStore.setDiscTitle('My Dial');
		doodledialStore.setDiscTitlePosition(150, 50);
		doodledialStore.setDiscTitleFontSize(18);
		doodledialStore.reset();
		expect(doodledialStore.discTitle).toBe('');
		expect(doodledialStore.discTitleX).toBe(100);
		expect(doodledialStore.discTitleY).toBe(20);
		expect(doodledialStore.discTitleFontSize).toBe(12);
	});
});
```

- [ ] **Step 2: Run the new tests to confirm they fail initially**

Run: `pnpm exec vitest run src/lib/stores/doodledial-store.spec.ts`
Expected: TypeScript/build errors since the store doesn't have these properties yet

- [ ] **Step 3: Implement store methods from Task 1**

(Implement Task 1 steps 1-2 now, then re-run)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/stores/doodledial-store.spec.ts`
Expected: All tests PASS (including new disc title tests)

---

### Task 3: Add disc title rendering to combineDoodledial

**Files:**

- Modify: `src/lib/utils/doodledial.ts`
- Modify: `src/lib/components/DialPreview.svelte`

- [ ] **Step 1: Add disc title fields to CombineDoodledialOptions**

In `src/lib/utils/doodledial.ts`, update the `CombineDoodledialOptions` interface (around line 177):

```ts
export interface CombineDoodledialOptions {
	includePathLabels?: boolean;
	includeHighlighting?: boolean;
	respectLayerVisibility?: boolean;
	applyCutoutTransforms?: boolean;
	applyDiameter?: boolean;
	discTitle?: string;
	discTitleX?: number;
	discTitleY?: number;
	discTitleFontSize?: number;
}
```

- [ ] **Step 2: Add title rendering to combineDoodledial**

At the end of `combineDoodledial()` (after the center hole handling, before `return doc.svg()` around line 370), add:

```ts
const titleText = options?.discTitle;
if (titleText) {
	const titleEl = doc.text(titleText);
	titleEl.addClass('disc-title');
	titleEl.attr('data-disc-title', 'true');
	titleEl.font({
		family: 'sans-serif',
		size: options?.discTitleFontSize ?? 12,
		anchor: 'middle',
		weight: 'bold'
	});
	titleEl.center(options?.discTitleX ?? 100, options?.discTitleY ?? 20);
	titleEl.fill('black');
}
```

- [ ] **Step 3: Pass disc title from DialPreview to combineDoodledial**

In `src/lib/components/DialPreview.svelte`, update the `updatePreview()` function (around line 162) to pass title options:

```ts
const combined = combineDoodledial(
	doodledialStore.svgContent,
	doodledialStore.config,
	layers,
	highlightedLayer,
	currentSelected,
	{
		discTitle: doodledialStore.discTitle,
		discTitleX: doodledialStore.discTitleX,
		discTitleY: doodledialStore.discTitleY,
		discTitleFontSize: doodledialStore.discTitleFontSize
	}
);
```

- [ ] **Step 4: Run lint + type check**

Run: `pnpm check && pnpm lint`
Expected: No errors

---

### Task 4: Add disc title input UI to sidebar

**Files:**

- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add title input and font size control inside Disc Settings section**

In `src/routes/+page.svelte`, inside the Disc Settings section (after `DiameterControl` on line 417 and before the closing `</section>`), add:

```svelte
{#if doodledialStore.svgContent}
	<hr class="my-4 border-gray-100" />
	<div class="flex flex-col gap-3">
		<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
			<span>Title</span>
			<input
				type="text"
				placeholder="Optional disc title..."
				bind:value={doodledialStore.discTitle}
				class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			/>
		</label>
		<div class="flex items-center gap-3">
			<span class="text-xs font-medium text-gray-600 shrink-0">Font size</span>
			<input
				type="range"
				min="8"
				max="36"
				step="1"
				bind:value={doodledialStore.discTitleFontSize}
				class="flex-1 accent-indigo-600"
			/>
			<span class="text-xs text-gray-500 w-8 text-right">{doodledialStore.discTitleFontSize}</span>
		</div>
		<p class="text-xs text-gray-400">Drag title text on the disc to reposition it.</p>
	</div>
{/if}
```

Note: The `bind:value` works because Svelte 5 allows binding to `$state` properties through a get/set proxy on the store return object. However, for this to work, the store needs explicit getters — which it already has for all properties. The `$state` reactivity will flow through the getter automatically.

- [ ] **Step 2: Run lint + type check**

Run: `pnpm check && pnpm lint`
Expected: No errors

---

### Task 5: Add title drag interaction to DialPreview

**Files:**

- Modify: `src/lib/components/DialPreview.svelte`

- [ ] **Step 1: Add title drag state variables**

After the existing drag state (around line 14), add:

```ts
let isDraggingTitle = $state(false);
let titleDragStartSvgX = $state(0);
let titleDragStartSvgY = $state(0);
let titleInitialX = $state(0);
let titleInitialY = $state(0);
```

- [ ] **Step 2: Extend handlePointerDown for title**

In `handlePointerDown` (around line 54), before the path label check, add:

```ts
const isDiscTitle = target.closest('[data-disc-title]') !== null;
if (isDiscTitle && !doodledialStore.labelEditMode) {
	isDraggingTitle = true;
	titleInitialX = doodledialStore.discTitleX;
	titleInitialY = doodledialStore.discTitleY;

	const startPoint = getSvgPoint(e.clientX, e.clientY);
	if (!startPoint) {
		isDraggingTitle = false;
		return;
	}

	titleDragStartSvgX = startPoint.x;
	titleDragStartSvgY = startPoint.y;

	(target as HTMLElement).setPointerCapture(e.pointerId);
	return;
}
```

- [ ] **Step 3: Extend handlePointerMove for title**

In `handlePointerMove` (around line 89), after the `isDraggingLabel` check and before the layer rotation drag, add:

```ts
if (isDraggingTitle) {
	const currentPoint = getSvgPoint(e.clientX, e.clientY);
	if (!currentPoint) return;

	const deltaX = currentPoint.x - titleDragStartSvgX;
	const deltaY = currentPoint.y - titleDragStartSvgY;

	doodledialStore.setDiscTitlePosition(titleInitialX + deltaX, titleInitialY + deltaY);
	return;
}
```

- [ ] **Step 4: Extend handlePointerUp for title**

In `handlePointerUp` (around line 116), add `isDraggingTitle` to the condition and reset:

```ts
if (isDragging || isDraggingLabel || isDraggingTitle) {
	const target = e.target as HTMLElement;
	target.releasePointerCapture(e.pointerId);
}
```

And add to the reset block:

```ts
isDraggingTitle = false;
```

- [ ] **Step 5: Run lint + type check**

Run: `pnpm check && pnpm lint`
Expected: No errors

---

### Task 6: Add disc title to laser SVG export

**Files:**

- Modify: `src/lib/utils/laser-svg-export.ts`

- [ ] **Step 1: Add disc-title to engrave styling**

In `laser-svg-export.ts`, after the existing `doc.find('text')` block (around line 72), add:

```ts
doc.find('.disc-title').forEach((el) => {
	el.addClass(engraveClassName);
	el.css('fill', engraveColor);
});
```

- [ ] **Step 2: Add export test for disc title in laser SVG**

In `src/lib/utils/export-formats.svelte.spec.ts`, add to the `buildExportFixture` helper or add a new test block.

First, we need to be able to test that when disc title is set, it appears. The cleanest approach is to modify the `buildExportFixture` to accept optional title params, then test via `combineDoodledial` directly:

```ts
it('laser export includes disc title when set', () => {
	const { content, layers } = buildExportFixture();
	const combined = combineDoodledial(content, SAMPLE_CONFIG, layers, null, null, {
		discTitle: 'Test Disc',
		discTitleX: 100,
		discTitleY: 30,
		discTitleFontSize: 14
	});
	expect(combined).toContain('Test Disc');
	expect(combined).toContain('disc-title');
});
```

Add this import at the top of the test file if not already present:

```ts
import { combineDoodledial } from './doodledial';
```

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest run src/lib/utils/export-formats.svelte.spec.ts`
Expected: All tests PASS

---

### Task 7: Add disc title to STL export

**Files:**

- Modify: `src/lib/utils/stl-export.ts`

- [ ] **Step 1: Add disc title params to StlExportOptions**

Update the interface (around line 9):

```ts
export interface StlExportOptions {
	discThicknessMm?: number;
	markThicknessMm?: number;
	sampleStepPx?: number;
	discTitle?: string;
	discTitleX?: number;
	discTitleY?: number;
	discTitleFontSize?: number;
}
```

- [ ] **Step 2: Add disc title extrusion to STL export**

In `exportStl()`, after the layer processing loop (after line 373, before `createDiscShape`), add:

```ts
if (options?.discTitle) {
	const titleShapes = labelToThreeShapes(options.discTitle, {
		width: options.discTitle.length * (options.discTitleFontSize ?? 12) * 0.6,
		height: (options.discTitleFontSize ?? 12) * 1.2
	});

	const titleCenterX = (options.discTitleX ?? 100) - cx;
	const titleCenterY = (options.discTitleY ?? 20) - cy;

	for (const shape of titleShapes) {
		const points = shape.getPoints().map((point) => {
			return new THREE.Vector2(
				(titleCenterX + point.x) / MM_TO_PX,
				(titleCenterY + point.y) / MM_TO_PX
			);
		});
		const transformedShape = pathPolygonToShape(points);
		if (!transformedShape) continue;

		const geometry = new THREE.ExtrudeGeometry(transformedShape, {
			depth: markThicknessMm,
			steps: 1,
			bevelEnabled: false
		});
		geometry.translate(0, 0, discThicknessMm);
		topMeshes.push(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
	}
}
```

- [ ] **Step 3: Run lint + type check**

Run: `pnpm check && pnpm lint`
Expected: No errors

---

### Task 8: Wire up exports and final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run lint + type check**

Run: `pnpm check && pnpm lint`
Expected: No errors

- [ ] **Step 3: Manual verification**

1. Start the dev server: `pnpm dev`
2. Open the app and upload an SVG
3. Type a title in the Disc Settings section
4. Verify the title appears on the disc preview
5. Drag the title to reposition it
6. Adjust font size with the slider
7. Clear the title — verify it disappears
8. Export as Laser SVG — verify the title appears with `operation-engrave` class
9. Export as STL — verify the title is included
