---
id: TASK-001
title: Fix layer list hover/select to highlight path
status: Done
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 21:47'
labels: []
dependencies: []
priority: medium
ordinal: 100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

In LayerList.svelte line 112, handleMouseEnter passes layer.svgElementId but should pass layer.id. The highlightedLayer should be compared against layer.id in the preview, not svgElementId.

<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

## Implementation Plan

### Problem Analysis

- `highlightedLayer` stores a string identifier for the currently highlighted layer
- In LayerList.svelte, `handleMouseEnter` passes `layer.svgElementId` (e.g., "layer-0")
- In `handleMouseLeave`, it passes `selectedLayer?.svgElementId`
- But `handleSelect` uses `layer.id` to set `selectedLayer`

The store's `id` and `svgElementId` happen to have the same value ("layer-N"), but the code is inconsistent - hover uses svgElementId while selection uses id.

### Solution

Change `handleMouseEnter` in LayerList.svelte to pass `layer.id` instead of `layer.svgElementId`, making it consistent with how `handleSelect` works.

### Changes Required

1. **LayerList.svelte**: Line 112 - change `layer.svgElementId` to `layer.id`

### Verification

- Hovering a layer in the list should highlight the corresponding path in the preview
- Selecting a layer should also work as before
<!-- SECTION:PLAN:END -->
