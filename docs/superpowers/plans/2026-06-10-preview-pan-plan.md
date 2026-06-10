# Preview Pan (Grab-to-Scroll) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-and-drag panning on empty background space in the dial preview when zoomed in.

**Architecture:** Add pan state variables and logic to `DialPreview.svelte`. Detect background clicks (no layer/label/title hit) in `handlePointerDown`, then translate pointer movement to `scrollLeft`/`scrollTop` adjustments on the scroll container.

**Tech Stack:** Svelte 5 (runes), TypeScript

---

### Task 1: Add pan state and scroll container ref to DialPreview

**Files:**

- Modify: `src/lib/components/DialPreview.svelte`

- [ ] **Step 1: Add pan state variables and scroll container ref** after existing state declarations (line ~21)

Insert after `let didDrag = false;`:

```ts
let scrollContainer: HTMLDivElement | null = $state(null);
let isPanning = $state(false);
let panStartX = 0;
let panStartY = 0;
let scrollStartLeft = 0;
let scrollStartTop = 0;
```

- [ ] **Step 2: Bind the scroll container ref** on the `overflow-auto` div (line 307)

Change:

```svelte
<div class="absolute inset-0 overflow-auto flex">
```

To:

```svelte
<div class="absolute inset-0 overflow-auto flex" bind:this={scrollContainer}>
```

- [ ] **Step 3: Modify `handlePointerDown` to detect background and enter pan mode** (around line 71)

Replace the existing function with this version that adds background-drag panning:

```ts
function handlePointerDown(e: PointerEvent) {
	if (optimizerStore.optimizerPending) return;
	didDrag = false;
	const target = e.target as HTMLElement;

	const isDiscTitle = target.closest('[data-disc-title]') !== null;
	if (isDiscTitle) {
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

	const { layerId, isPathLabel } = getLayerIdFromEvent(target);
	if (!layerId && !isDiscTitle) {
		// Background click — start pan mode
		if (!scrollContainer) return;
		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		scrollStartLeft = scrollContainer.scrollLeft;
		scrollStartTop = scrollContainer.scrollTop;
		scrollContainer.setPointerCapture(e.pointerId);
		return;
	}

	doodledialStore.setHighlightedLayer(layerId!);

	if (isPathLabel) {
		isDraggingLabel = true;
		dragLabelLayerId = layerId;

		const layer = doodledialStore.getLayer(layerId!);
		labelInitialOffsetX = layer?.labelOffsetX || 0;
		labelInitialOffsetY = layer?.labelOffsetY || 0;
		labelDragLayerRotation = layer?.rotation || 0;

		const startPoint = getSvgPoint(e.clientX, e.clientY);
		if (!startPoint) {
			isDraggingLabel = false;
			dragLabelLayerId = null;
			return;
		}

		labelDragStartSvgX = startPoint.x;
		labelDragStartSvgY = startPoint.y;

		(target as HTMLElement).setPointerCapture(e.pointerId);
	} else if (!isPathLabel) {
		isDragging = true;
		dragLayerId = layerId;
		(target as HTMLElement).setPointerCapture(e.pointerId);
	}
}
```

- [ ] **Step 4: Add pan handling to `handlePointerMove`** (around line 127)

Insert at the start of the function body (before the existing checks):

```ts
if (isPanning) {
	const dx = e.clientX - panStartX;
	const dy = e.clientY - panStartY;
	if (scrollContainer) {
		scrollContainer.scrollLeft = scrollStartLeft - dx;
		scrollContainer.scrollTop = scrollStartTop - dy;
	}
	return;
}
```

The full function becomes:

```ts
function handlePointerMove(e: PointerEvent) {
	if (isPanning) {
		const dx = e.clientX - panStartX;
		const dy = e.clientY - panStartY;
		if (scrollContainer) {
			scrollContainer.scrollLeft = scrollStartLeft - dx;
			scrollContainer.scrollTop = scrollStartTop - dy;
		}
		return;
	}
	if (isDraggingLabel && dragLabelLayerId) {
		// ... existing label drag code ...
	} else if (isDraggingTitle) {
		// ... existing title drag code ...
	} else if (isDragging && dragLayerId) {
		// ... existing layer drag code ...
	}
}
```

- [ ] **Step 5: Modify `handlePointerUp` to end pan mode** (around line 164)

Add `isPanning` handling at the start:

```ts
function handlePointerUp(e: PointerEvent) {
	if (isPanning) {
		isPanning = false;
		if (scrollContainer) {
			scrollContainer.releasePointerCapture(e.pointerId);
		}
		return;
	}
	if (isDragging || isDraggingLabel || isDraggingTitle) {
		const target = e.target as HTMLElement;
		target.releasePointerCapture(e.pointerId);
	}
	doodledialStore.setHighlightedLayer(null);
	isDragging = false;
	isDraggingLabel = false;
	isDraggingTitle = false;
	dragLayerId = null;
	dragLabelLayerId = null;
}
```

- [ ] **Step 6: Add grab cursor styling** after existing CSS (after line 433)

```css
:global(.pan-container) {
	cursor: grab;
}
:global(.pan-container:active) {
	cursor: grabbing;
}
```

And add the `pan-container` class to the scroll container div (line 307):

```svelte
<div class="absolute inset-0 overflow-auto flex pan-container" bind:this={scrollContainer}>
```

- [ ] **Step 7: Run checks**

```bash
pnpm check
pnpm lint
```

Expected: No errors or warnings.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/DialPreview.svelte docs/superpowers/specs/2026-06-10-preview-pan-design.md docs/superpowers/plans/2026-06-10-preview-pan-plan.md
git commit -m "feat: add grab-to-pan on preview background when zoomed in"
```
