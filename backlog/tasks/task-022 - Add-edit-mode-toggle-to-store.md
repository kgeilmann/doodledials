---
id: TASK-022
title: Add edit mode toggle to store
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
labels: []
dependencies: []
priority: high
ordinal: 3000
---

## Description

Add `labelEditMode: boolean` state and `toggleLabelEditMode()` method to store to control whether users can drag labels

## Implementation Plan

### 1. Locate Store File

- File: `src/lib/stores/doodledial.svelte.ts`
- Add new state variable alongside existing state variables (around line 13-14)

### 2. Add State Variable

Add after `let selectedLayer = $state<string | null>(null);`:

```typescript
let labelEditMode = $state<boolean>(false);
```

### 3. Add Getter

Add to the return object (after `get selectedLayer()`):

```typescript
get labelEditMode() {
  return labelEditMode;
},
```

### 4. Add Toggle Method

Add method to the return object (after `setSelectedLayer`):

```typescript
toggleLabelEditMode() {
  labelEditMode = !labelEditMode;
},
```

Alternatively, add explicit set methods:

```typescript
setLabelEditMode(enabled: boolean) {
  labelEditMode = enabled;
},
```

### 5. Behavior Notes

- When `labelEditMode` is `true`:
  - Path labels become draggable
  - Layer rotation dragging is disabled (via pointer event handling)
- When `labelEditMode` is `false`:
  - Normal behavior restored
  - Rotation dragging enabled

### 6. Dependencies

- No dependencies on other tasks (can be done independently)

### 7. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
