---
id: TASK-002
title: Add rotation drag to mark line and label
status: To Do
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 23:20'
labels: []
dependencies: []
priority: medium
ordinal: 200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In doodledial.ts, add pointer event handlers to the mark line and layer label so users can drag them to rotate the layer. Calculate rotation based on the angle between the disc center and the pointer position.

Mark line and layer label also modify selection and highlighting
- hovering over line or label highlights the layer
- clicking on line or label selects the layer
- behaviour is the same as the corresponding actions in the layerlist
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 e2e test to check rotation
- [x] #2 e2e test to check selection
- [x] #3 e2e test to check highlight on hover
- [x] #4 all tests pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

See: `plan/feature-rotation-drag-mark-label-1.md`

### Summary
- 3 phases: Core rotation logic, Selection/highlighting, Testing
- 19 tasks total
- Key files: doodledial.ts, component handling SVG, rotation.spec.ts
- All 4 acceptance criteria must pass
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Note: Rotation calculation logic exists in RotationKnob.svelte (getAngle function, angle delta normalization). Create src/lib/utils/rotation.ts to extract common rotation utilities instead of recreating.
<!-- SECTION:NOTES:END -->
