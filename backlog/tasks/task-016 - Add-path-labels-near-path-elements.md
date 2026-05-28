---
id: TASK-016
title: Add path labels near path elements
status: Done
assignee: []
created_date: '2026-04-10 17:30'
updated_date: '2026-04-10 17:34'
labels:
  - frontend
  - svg
dependencies: []
references:
  - 'src/lib/utils/doodledial.ts:combineDoodledial - existing mark/label creation'
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Place labels near each SVG path element (not just the marks) showing the layer index. Marks already have labels at the disc edge. Need additional labels near each path so users can match paths to marks. Use similar approach to existing label code in combineDoodledial.

<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Completed: Added path labels near each SVG path element using bbox() method. Labels show same layer index as mark labels and are positioned at the right edge of each path. Subtasks: TASK-017 (analyze), TASK-018 (implement), TASK-019 (verify) all complete.

<!-- SECTION:NOTES:END -->
