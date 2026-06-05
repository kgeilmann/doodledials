---
id: TASK-027
title: Add cursor and style changes
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
updated_date: '2026-06-05 18:44'
labels: []
dependencies:
  - TASK-025
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Change cursor to "grab" when hovering path labels in edit mode, "grabbing" when dragging to provide better UX feedback
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Locate Where to Add CSS

- File: `src/lib/components/DialPreview.svelte`
- The SVG is rendered via `{@html}` which means we need to use global CSS or style injection to target elements inside the rendered SVG

### 2. Add Style Block for Cursor Changes

Add a `<style>` block in the component (before the template section or in the script section):

```svelte
<style>
	:global(.label-edit-mode .path-label) {
		cursor: grab;
	}
	:global(.label-edit-mode .path-label:active) {
		cursor: grabbing;
	}
</style>
```

### 3. Apply Edit Mode Class to Container

In the DialPreview template, add the class conditionally to the container div (around line 142-154):

```svelte
<div
  class="bg-white rounded-xl shadow-lg p-4 flex items-center justify-center overflow-hidden relative z-10 {doodledialStore.labelEditMode ? 'label-edit-mode' : ''}"
  ...
>
```

### 4. Additional Visual Feedback (Optional Enhancement)

Add hover effect for labels in edit mode to make them more visible:

```svelte
<style>
	:global(.label-edit-mode .path-label) {
		cursor: grab;
		transition:
			fill 0.2s ease,
			font-weight 0.2s ease;
	}
	:global(.label-edit-mode .path-label:hover) {
		fill: #6366f1;
		font-weight: 700;
	}
	:global(.label-edit-mode .path-label:active) {
		cursor: grabbing;
	}
</style>
```

### 5. Dependencies

- TASK-024: Visual indicator for edit mode (container styling)
- TASK-025: Drag handling implemented

### 6. Implementation Notes

- The SVG is rendered via `{@html}`, so standard Svelte reactive styles on inner elements won't work
- Using `:global()` selector targets elements inside the injected HTML
- The class is conditionally applied to the parent container, enabling the CSS rules to activate

### 7. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
- Test that cursor changes from default to "grab" when hovering over labels in edit mode
<!-- SECTION:PLAN:END -->
