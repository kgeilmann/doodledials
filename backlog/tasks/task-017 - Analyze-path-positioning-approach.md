---
id: TASK-017
title: Analyze path positioning approach
status: Done
assignee: []
created_date: '2026-04-10 17:30'
updated_date: '2026-04-10 17:32'
labels:
  - frontend
  - svg
  - research
milestone: Path labels
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Research how to calculate positions near path elements. Analyze the SVG structure in combineDoodledial to understand how paths are accessed and what methods are available to get their positions (bounding box, path data, etc).

<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Analysis: In combineDoodledial at lines 115-127, paths are accessed via group.children() and filtered with c.svg().startsWith('<path'). The svg.js library provides bbox() method to get bounding boxes. Need to get path bounding box after transforms are applied, or calculate position before transforms. The layer group already contains the path element - can access its bbox() or use the center/edge positions.

Solution: Use svg.js bbox() method on path elements. After transforms (line 117-120), path has cx/cy from bounding box. Position label near the path center or at a corner with offset. Get path's bounding box via c.bbox() which returns {cx, cy, x, y, width, height}. Place label at cx + offset, cy + offset.

<!-- SECTION:NOTES:END -->
