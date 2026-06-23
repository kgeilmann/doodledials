---
id: TASK-033.05
title: Unify overlap/gap naming conventions
status: Done
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:59'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure consistent naming for overlap and gap concepts throughout the codebase. `cutoutGap`/`cutout_gap` naming should be consistent (currently uses both `cutoutGaps` and raw `overlaps` in detection store). Standardize variable names: use `overlapMap`, `overlapPixelCount`, `gapMap`, `gapLayers` consistently. Check all references in stores (detection.svelte.ts, doodledial.svelte.ts), components (LayerList), utils (overlap-detection.ts), and tests. This is lower-risk cleanup.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed checkingOverlaps→isDetecting and setCheckingOverlaps→setDetecting in detection store, doodledial wrapper, and test file since the loading state tracks both overlap AND gap detection. Existing naming was already consistent - overlaps/cutoutGaps maps are clearly separated and uniformly named across all files.
<!-- SECTION:FINAL_SUMMARY:END -->
