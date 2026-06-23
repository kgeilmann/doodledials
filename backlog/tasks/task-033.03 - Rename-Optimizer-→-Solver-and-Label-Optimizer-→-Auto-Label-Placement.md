---
id: TASK-033.03
title: Rename Optimizer → Solver and Label Optimizer → Auto Label Placement
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
Rename "Force-Directed Optimizer" → "Force-Directed Solver" and "Bruteforce Optimizer" → "Bruteforce Solver". Also rename "Path Label Optimizer" → "Auto Label Placement" (this was covered in the previous subtask for the config key). This subtask focuses on: renaming `OptimizerMode` type values, `optimizerMode` → `solverMode`, `optimizerStore` → `solverStore`, `optimizerPending` → `solverPending`, all `optimizer*` state fields in the store, file names (src/lib/stores/optimizer.svelte.ts → solver.svelte.ts, src/lib/optimizer/ → src/lib/solver/), component references (OptimizerProgressOverlay, OptimizerConfigDialog, BruteforceResultDialog), and global config keys (`forceDirectedOptimizerEnabled` → `forceDirectedSolverEnabled`, `optimizerGapDefault` → `solverGapDefault`, `bruteforceTimeLimit` → `bruteforceTimeLimit`). Update ALL imports, exports, and test references.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed all Optimizer→Solver references across src/ and tests/. Files renamed: optimizer.svelte.ts→solver.svelte.ts, run-optimizer→run-solver, run-bruteforce-optimizer→run-bruteforce-solver, OptimizerConfigDialog/OptimizerProgressOverlay components. All exports, types, store getters, config keys, and imports updated. pnpm check and eslint pass.
<!-- SECTION:FINAL_SUMMARY:END -->
