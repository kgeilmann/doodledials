---
id: TASK-002
title: Add rotation drag to mark line and label
status: To Do
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 23:02'
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
- [ ] #1 e2e test to check rotation
- [ ] #2 e2e test to check selection
- [ ] #3 e2e test to check highlight on hover
- [ ] #4 all tests pass
<!-- AC:END -->
