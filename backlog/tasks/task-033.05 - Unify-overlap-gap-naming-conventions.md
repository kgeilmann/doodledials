---
id: TASK-033.05
title: Unify overlap/gap naming conventions
status: To Do
assignee: []
created_date: '2026-06-23 21:00'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure consistent naming for overlap and gap concepts throughout the codebase. `cutoutGap`/`cutout_gap` naming should be consistent (currently uses both `cutoutGaps` and raw `overlaps` in detection store). Standardize variable names: use `overlapMap`, `overlapPixelCount`, `gapMap`, `gapLayers` consistently. Check all references in stores (detection.svelte.ts, doodledial.svelte.ts), components (LayerList), utils (overlap-detection.ts), and tests. This is lower-risk cleanup.
<!-- SECTION:DESCRIPTION:END -->
