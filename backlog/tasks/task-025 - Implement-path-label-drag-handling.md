---
id: TASK-025
title: Implement path label drag handling
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
updated_date: '2026-06-05 18:44'
labels: []
dependencies:
  - TASK-021
  - TASK-022
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add pointer event handlers in DialPreview.svelte to detect path label clicks and drag them when in edit mode. In edit mode, layer rotation dragging should be disabled.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Locate DialPreview.svelte

- File: `src/lib/components/DialPreview.svelte`
- Current drag logic is in `handlePointerDown`, `handlePointerMove`, `handlePointerUp` (lines 28-58)

### 2. Add New State Variables for Label Dragging

Add after existing state variables (around line 10):

```typescript
let isDraggingLabel = $state(false);
let dragLabelLayerId = $state<string | null>(null);
let labelDragStartX = $state(0);
let labelDragStartY = $state(0);
let labelInitialOffsetX = $state(0);
let labelInitialOffsetY = $state(0);
```

### 3. Modify handlePointerDown

Current logic (lines 28-40):

- Gets layerId and isPathLabel from event
- Sets selection/highlight
- If not path label, enables rotation dragging

New logic should be:

```typescript
function handlePointerDown(e: PointerEvent) {
	const target = e.target as HTMLElement;
	const { layerId, isPathLabel } = getLayerIdFromEvent(target);
	if (!layerId) return;

	doodledialStore.setSelectedLayer(layerId);
	doodledialStore.setHighlightedLayer(layerId);

	if (doodledialStore.labelEditMode && isPathLabel) {
		// Enter label drag mode
		isDraggingLabel = true;
		dragLabelLayerId = layerId;

		// Get current offset from store
		const layer = doodledialStore.getLayer(layerId);
		labelInitialOffsetX = layer?.labelOffsetX || 0;
		labelInitialOffsetY = layer?.labelOffsetY || 0;

		// Record starting mouse position
		labelDragStartX = e.clientX;
		labelDragStartY = e.clientY;

		(target as HTMLElement).setPointerCapture(e.pointerId);
	} else if (!doodledialStore.labelEditMode && !isPathLabel) {
		// Normal mode - enable rotation dragging
		isDragging = true;
		dragLayerId = layerId;
		(target as HTMLElement).setPointerCapture(e.pointerId);
	}
	// In edit mode, non-label areas should NOT trigger rotation
}
```

### 4. Modify handlePointerMove

Add logic to handle label dragging:

```typescript
function handlePointerMove(e: PointerEvent) {
	if (isDraggingLabel && dragLabelLayerId) {
		// Calculate delta from drag start
		const deltaX = e.clientX - labelDragStartX;
		const deltaY = e.clientY - labelDragStartY;

		// Apply delta to initial offset
		const newOffsetX = labelInitialOffsetX + deltaX;
		const newOffsetY = labelInitialOffsetY + deltaY;

		// Update store
		doodledialStore.setLayerLabelOffset(dragLabelLayerId, newOffsetX, newOffsetY);
	} else if (isDragging && dragLayerId && !doodledialStore.labelEditMode) {
		// Normal rotation dragging (disabled in edit mode)
		const { cx, cy } = getDiscCenter();
		const currentAngle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
		doodledialStore.setLayerRotation(dragLayerId, currentAngle + 90);
	}
}
```

### 5. Modify handlePointerUp

Add cleanup for label drag:

```typescript
function handlePointerUp(e: PointerEvent) {
	if (isDragging || isDraggingLabel) {
		const target = e.target as HTMLElement;
		target.releasePointerCapture(e.pointerId);
	}
	doodledialStore.setHighlightedLayer(null);
	isDragging = false;
	isDraggingLabel = false;
	dragLayerId = null;
	dragLabelLayerId = null;
}
```

### 6. Add Reactivity for Label Offsets

Add to the existing $effect that triggers preview updates (around line 116):

```typescript
$effect(() => {
	void doodledialStore.layers.length;
	doodledialStore.layers.forEach((l) => {
		void l.visible;
		void l.rotation;
		void l.labelOffsetX; // Add this
		void l.labelOffsetY; // Add this
	});
	void doodledialStore.highlightedLayer;
	void doodledialStore.selectedLayer;
	void doodledialStore.labelEditMode; // Add this - re-render on mode change
	void doodledialStore.config.offsetX;
	void doodledialStore.config.offsetY;
	void doodledialStore.config.scale;
	if (doodledialStore.svgContent) {
		updatePreview();
	}
});
```

### 7. Dependencies

- TASK-020: Layer interface has labelOffsetX/Y
- TASK-021: Store has setLayerLabelOffset method
- TASK-022: Store has labelEditMode state

### 8. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
- Test that in edit mode, labels can be dragged and rotation is disabled
<!-- SECTION:PLAN:END -->
