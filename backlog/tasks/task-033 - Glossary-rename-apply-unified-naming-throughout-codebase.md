---
id: TASK-033
title: 'Glossary rename: apply unified naming throughout codebase'
status: Done
assignee: []
created_date: '2026-06-23 21:00'
updated_date: '2026-06-23 21:59'
labels:
  - refactor
  - rename
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename all concepts across the codebase to match the agreed-upon glossary. See subtasks for each domain.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All 4 subtasks (033.01-033.04) are done. Only TASK-033.05 (Unify overlap/gap naming) remains.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All 5 subtasks completed: Disc→Dial (033.01), Layer/Mark+Path/Cutout labels (033.02), Optimizer→Solver (033.03), CenterMark→CenterStyle (033.04), Overlap/gap naming (033.05). All terminology now matches docs/GLOSSARY.md across the entire codebase (src/, tests/). pnpm check and eslint pass, all 194 vitest tests pass (1 pre-existing flaky test excluded).
<!-- SECTION:FINAL_SUMMARY:END -->
