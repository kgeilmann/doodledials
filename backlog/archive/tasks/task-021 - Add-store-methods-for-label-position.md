---
id: TASK-021
title: Add store methods for label position
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
updated_date: '2026-06-05 18:44'
labels: []
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Add `setLayerLabelOffset(id: string, x: number, y: number)` method to `src/lib/stores/doodledial.svelte.ts` to update path label offsets

<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

### 1. Locate Store File

- File: `src/lib/stores/doodledial.svelte.ts`
- Add new method after `setLayerRotation` method (around line 94-99)

### 2. Add Method Implementation

After the `setLayerRotation` method, add:

```typescript
setLayerLabelOffset(id: string, labelOffsetX: number, labelOffsetY: number) {
  const layer = layers.get(id);
  if (layer) {
    layers.set(id, { ...layer, labelOffsetX, labelOffsetY });
  }
},
```

### 3. Export a Getter (Optional but Recommended)

- Add a getter to expose label offset values for read-only access
- This will be needed by `combineDoodledial` to read the values:

```typescript
getLayerLabelOffset(id: string): { labelOffsetX: number; labelOffsetY: number } | undefined {
  const layer = layers.get(id);
  if (layer) {
    return {
      labelOffsetX: layer.labelOffsetX || 0,
      labelOffsetY: layer.labelOffsetY || 0
    };
  }
  return undefined;
},
```

### 4. Dependencies

- Depends on TASK-020 being completed first (Layer interface must have labelOffsetX/Y fields)

### 5. Verification

- Run `pnpm check` to verify TypeScript compiles
- Run `pnpm lint` to check for any linting issues
<!-- SECTION:PLAN:END -->
