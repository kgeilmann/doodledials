---
id: TASK-033.02
title: Rename Layer Label → Mark Label and Path Label → Cutout Label
status: In Progress
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:19'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename all references to "layer label" and "path label". CSS classes `.layer-label` → `.mark-label`, `.path-label` → `.cutout-label`. Variable names: `layerLabel` → `markLabel`, `pathLabel` → `cutoutLabel`. Functions: `createPathLabel` → `createCutoutLabel`, `removePathLabels` → `removeCutoutLabels`. Store properties: `pathLabelFontSize` → `cutoutLabelFontSize` (in both DialConfig and GlobalConfig), `pathLabelOptimizerEnabled` → `autoLabelPlacementEnabled`. Update ALL references in components (DialPreview, LayerList, ExportButton, GlobalConfigDialog), stores (doodledial.svelte.ts, global-config.svelte.ts), utils (doodledial.ts, path-label-placement.ts, label-raster-collision, laser-svg-export.ts, stl-export.ts), and tests.
<!-- SECTION:DESCRIPTION:END -->
