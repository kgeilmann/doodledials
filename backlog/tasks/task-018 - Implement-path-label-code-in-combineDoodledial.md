---
id: TASK-018
title: Implement path label code in combineDoodledial
status: Done
assignee: []
created_date: '2026-04-10 17:30'
updated_date: '2026-04-10 17:33'
labels:
  - frontend
  - svg
  - implementation
milestone: Path labels
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Implement code to add text labels near each SVG path element within a layer group. The label should display the layer index (same as mark label) and be positioned near the path. Apply similar styling to existing layer-label class.

<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implementation: Added path label code in the forEach loop at lines 115-141. After path transforms, get bbox() and place label at pathBbox.x2 + 4 (right side of path) with vertical centering. Uses same layerIndex text, class 'path-label', font size 10 (smaller than mark label for distinction).

<!-- SECTION:NOTES:END -->
