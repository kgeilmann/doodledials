---
id: TASK-005
title: Reset offsets and scale on new SVG upload
status: To Do
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 22:51'
labels: []
dependencies: []
priority: medium
ordinal: 500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In FileUpload.svelte, after processing a new SVG file, call doodledialStore.setOffsetX(0), setOffsetY(0), and setScale(1) to reset the values to defaults.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 e2e test checking the reset exists and passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Phase 1: Add reset calls to FileUpload.svelte

In `src/lib/components/FileUpload.svelte`, after setting the SVG content in `processFile()`, add calls to reset offsetX, offsetY, and scale to their defaults:

```typescript
// After line 55 (setSvgContent call), add:
doodledialStore.setOffsetX(0);
doodledialStore.setOffsetY(0);
doodledialStore.setScale(1);
```

### Phase 2: Add e2e test

Add a Playwright e2e test to verify that uploading a new SVG resets the offsets and scale:
- Upload an SVG file
- Modify offsetX, offsetY, and scale values via the UI
- Upload a new SVG file
- Verify that offsetX, offsetY are reset to 0 and scale is reset to 1
<!-- SECTION:PLAN:END -->
