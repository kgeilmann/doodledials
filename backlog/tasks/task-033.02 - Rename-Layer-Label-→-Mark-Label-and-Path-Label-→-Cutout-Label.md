---
id: TASK-033.02
title: Rename Layer Label → Mark Label and Path Label → Cutout Label
status: Done
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:50'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename all references to "layer label" and "path label". CSS classes `.layer-label` → `.mark-label`, `.path-label` → `.cutout-label`. Variable names: `layerLabel` → `markLabel`, `pathLabel` → `cutoutLabel`. Functions: `createPathLabel` → `createCutoutLabel`, `removePathLabels` → `removeCutoutLabels`. Store properties: `pathLabelFontSize` → `cutoutLabelFontSize` (in both DialConfig and GlobalConfig), `pathLabelOptimizerEnabled` → `autoLabelPlacementEnabled`. Update ALL references in components (DialPreview, LayerList, ExportButton, GlobalConfigDialog), stores (doodledial.svelte.ts, global-config.svelte.ts), utils (doodledial.ts, path-label-placement.ts, label-raster-collision, laser-svg-export.ts, stl-export.ts), and tests.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
LayerLabel→MarkLabel method rename in stores/components/tests is the largest remaining chunk (~61 references). Also need to rename "Path Label" user-visible strings in GlobalConfigDialog.svelte (7 references) to "Cutout Label". Core config keys (pathLabelFontSize→cutoutLabelFontSize, includePathLabels→includeCutoutLabels, pathLabelOptimizerEnabled→autoLabelPlacementEnabled) are already done.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed all LayerLabel→MarkLabel methods in layers.svelte.ts, doodledial.svelte.ts, LayerList.svelte, DialPreview.svelte, layers.spec.ts, label-placement-store.spec.ts, layer-management.spec.ts. Renamed "Path Label" UI strings to "Cutout Label" / "Auto Label Placement" in GlobalConfigDialog.svelte. Renamed CSS classes in app.css. Updated center-mark-type HTML name attributes to center-style. Fixed "disc sizes" test description to "dial sizes". All 194 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
