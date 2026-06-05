---
id: TASK-028
title: Disable rotation controls in edit mode
status: To Do
assignee: []
created_date: '2026-04-12 01:13'
updated_date: '2026-06-05 18:44'
labels: []
dependencies: []
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Disable the rotation knob in edit mode since layer rotation is disabled while repositioning labels
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Locate LayerList.svelte

- File: `src/lib/components/LayerList.svelte`
- The RotationKnob component is used for each layer (lines 94-99)
- We need to pass a new `disabled` prop based on edit mode

### 2. Modify RotationKnob Usage

Current code (lines 94-99):

```svelte
<RotationKnob
	value={layer.rotation}
	onchange={(rotation) => handleRotationChange(layer.id, rotation)}
	label="Rotate {layer.name}"
	disabled={!layer.visible}
/>
```

Add `doodledialStore.labelEditMode` to the disabled condition:

```svelte
<RotationKnob
	value={layer.rotation}
	onchange={(rotation) => handleRotationChange(layer.id, rotation)}
	label="Rotate {layer.name}"
	disabled={!layer.visible || doodledialStore.labelEditMode}
/>
```

This will disable the rotation knob when:

- Layer is not visible, OR
- Label edit mode is active

### 3. Visual Feedback for Disabled State

The RotationKnob should already handle the `disabled` prop visually. If not, we may need to check the RotationKnob component and ensure it shows a disabled state.

### 4. Optional: Add Tooltip or Status Message

When edit mode is active, users might be confused why rotation is disabled. Consider adding a small helper text:

```svelte
{#if doodledialStore.labelEditMode}
	<p class="text-xs text-gray-500 mt-2">Rotation disabled while editing labels</p>
{/if}
```

### 5. Dependencies

- TASK-022: Store has labelEditMode state
- TASK-023: Edit mode toggle button exists

### 6. UX Considerations

- Disabling the rotation knob is clearer than just preventing rotation dragging
- Users can see the control is unavailable and understand why
- The disabled state should be visually obvious (grayed out, not clickable)

### 7. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
- Test that rotation knobs are disabled when Edit Labels mode is active
<!-- SECTION:PLAN:END -->
