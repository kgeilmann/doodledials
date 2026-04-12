---
id: TASK-023
title: Create Edit Labels button
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
labels: []
dependencies: [TASK-022]
priority: high
ordinal: 4000
---

## Description

Add an "Edit Labels" toggle button in LayerList.svelte that switches between normal and edit mode. Only visible when layers exist.

## Implementation Plan

### 1. Locate and Examine LayerList.svelte

- File: `src/lib/components/LayerList.svelte`
- The component already shows controls for layers when `doodledialStore.layers.length > 0`
- Currently has Show All/Hide All buttons in the header area (lines 55-71)

### 2. Add Edit Labels Button

Add a new button next to "Show All" / "Hide All" buttons. The button should:

- Display "Edit Labels" when off, "Done" or "Exit Edit" when active
- Have toggle behavior (click to enter edit mode, click again to exit)
- Have distinct styling to indicate active state

Example implementation location (after line 71):

```svelte
<button
	type="button"
	onclick={() => doodledialStore.toggleLabelEditMode()}
	class="text-xs {doodledialStore.labelEditMode
		? 'text-indigo-600 font-bold bg-indigo-100 px-2 py-1 rounded'
		: 'text-indigo-600 hover:text-indigo-800 font-medium'}"
>
	{doodledialStore.labelEditMode ? 'Done' : 'Edit Labels'}
</button>
```

### 3. Add Visual Separator

Add a `|` separator before the new button for visual grouping:

```svelte
<span class="text-gray-300">|</span>
<button...>Edit Labels</button>
```

### 4. Dependencies

- Depends on TASK-022 (store must have `labelEditMode` state and `toggleLabelEditMode()` method)

### 5. UX Considerations

- Button should clearly show ON/OFF state
- When ON, consider showing a subtle indicator in the main preview area
- The button should only appear when layers exist (already handled by `{#if doodledialStore.layers.length > 0}`)

### 6. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
