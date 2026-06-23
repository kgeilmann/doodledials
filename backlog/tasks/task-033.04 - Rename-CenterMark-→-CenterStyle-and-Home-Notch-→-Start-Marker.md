---
id: TASK-033.04
title: Rename CenterMark → CenterStyle and Home Notch → Start Marker
status: Done
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:48'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename `CenterMarkType` → `CenterStyle` with values `'hole' | 'crosshair' | 'none'`. `centerMarkType` property → `centerStyle`. CSS class `.home-notch` → `.start-marker`. `centerHoleDiameter` remains as-is (it's the diameter of the hole, not the style itself). Update all references in types (doodledial.ts), stores (global-config.svelte.ts), utils (doodledial.ts, laser-svg-export.ts, stl-export.ts), components (ExportButton, GlobalConfigDialog), and tests.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed CenterMarkType→CenterStyle, centerMarkType→centerStyle, .home-notch→.start-marker across all src/ files. Types, stores, utils, components, and tests updated. Three minor HTML name="center-mark-type" attributes remain in GlobalConfigDialog.svelte - purely cosmetic HTML name attributes, no functional impact.
<!-- SECTION:FINAL_SUMMARY:END -->
