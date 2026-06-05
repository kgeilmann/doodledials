---
id: TASK-024
title: Add visual indicator for edit mode
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
updated_date: '2026-06-05 18:44'
labels: []
dependencies: []
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Add visual feedback in DialPreview (e.g., different cursor, highlighted labels) when in edit mode so users know they can drag labels

<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

### 1. Locate DialPreview.svelte

- File: `src/lib/components/DialPreview.svelte`
- The component renders the SVG preview and handles pointer events
- Need to add visual feedback when `doodledialStore.labelEditMode` is true

### 2. Add Edit Mode Indicator in SVG Container

Modify the SVG container div to add conditional classes based on edit mode:

```svelte
<div
  class="bg-white rounded-xl shadow-lg p-4 flex items-center justify-center overflow-hidden relative z-10 {doodledialStore.labelEditMode ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}"
  ...
>
```

### 3. Add Cursor Feedback

When in edit mode, path labels should have a grab cursor. This is handled via CSS injected into the SVG or via inline styles. Options:

**Option A - CSS Class (Recommended)**
Add a style block that targets `.path-label` when parent is in edit mode. However, since the SVG is rendered via `{@html}`, we need to inject CSS via the style attribute or a global stylesheet.

**Option B - Add class to container**
Add conditional class to container that enables a CSS rule:

```svelte
<div
  class="... {doodledialStore.labelEditMode ? 'edit-mode' : ''}"
  ...
>
```

Then add global CSS in a `<style>` block in DialPreview:

```svelte
<style>
	:global(.edit-mode .path-label) {
		cursor: grab;
	}
	:global(.edit-mode .path-label:hover) {
		fill: #6366f1;
		font-weight: bold;
	}
</style>
```

### 4. Add Info Overlay (Optional but Helpful)

Add a small tooltip or overlay in edit mode:

```svelte
{#if doodledialStore.labelEditMode}
	<div class="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow">
		Drag labels to reposition
	</div>
{/if}
```

### 5. Dependencies

- Depends on TASK-022 (store has labelEditMode)
- Depends on TASK-023 (button toggles edit mode)

### 6. Design Decisions

- Ring/border indicator on container when in edit mode
- Cursor change on path labels (grab/grabbing)
- Optional: tooltip showing edit mode instructions

### 7. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
- Test visually that edit mode indicators appear when button is clicked
<!-- SECTION:PLAN:END -->
