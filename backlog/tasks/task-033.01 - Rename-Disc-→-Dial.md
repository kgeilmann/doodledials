---
id: TASK-033.01
title: Rename Disc → Dial
status: In Progress
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:22'
labels: []
dependencies: []
parent_task_id: TASK-033
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename all references of "Disc"/"disc" to "Dial"/"dial" throughout the codebase. This includes: CSS class `.disc-title` → `.dial-title`, ID `#disc` / `#disc-elements` → `#dial` / `#dial-elements`, `discTitle` → `dialTitle`, `discTitleFontSize` → `dialTitleFontSize`, `discTitleX/Y` → `dialTitleX/Y`, `applyDiscScaling` → `applyDialScaling`, `DISC_PADDING_PX` → `DIAL_PADDING_PX`, DEFAULTS `discTitleFontSize` → `dialTitleFontSize`, `createDiscShape` → `createDialShape`, `discThicknessMm` → `dialThicknessMm`, `discRadiusMm` → `dialRadiusMm`, etc. Search for all instances of "disc" (case-insensitive) in the codebase and rename appropriately.

Files affected: types, stores, utils (doodledial.ts, laser-svg-export.ts, stl-export.ts, overlap-detection.ts, constants.ts), components (DialPreview, LayerList, ExportButton, GlobalConfigDialog), routes/+page.svelte, tests.
<!-- SECTION:DESCRIPTION:END -->
