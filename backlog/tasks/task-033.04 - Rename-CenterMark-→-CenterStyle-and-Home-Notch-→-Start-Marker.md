---
id: TASK-033.04
title: Rename CenterMark → CenterStyle and Home Notch → Start Marker
status: In Progress
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:18'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename `CenterMarkType` → `CenterStyle` with values `'hole' | 'crosshair' | 'none'`. `centerMarkType` property → `centerStyle`. CSS class `.home-notch` → `.start-marker`. `centerHoleDiameter` remains as-is (it's the diameter of the hole, not the style itself). Update all references in types (doodledial.ts), stores (global-config.svelte.ts), utils (doodledial.ts, laser-svg-export.ts, stl-export.ts), components (ExportButton, GlobalConfigDialog), and tests.
<!-- SECTION:DESCRIPTION:END -->
