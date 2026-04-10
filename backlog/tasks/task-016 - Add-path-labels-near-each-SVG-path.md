---
id: TASK-016
title: Add path labels near each SVG path
status: To Do
assignee: []
created_date: '2026-04-10 17:29'
labels:
  - frontend
  - svg
dependencies: []
references:
  - >-
    src/lib/utils/doodledial.ts:combineDoodledial - where marks and labels are
    created
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add labels near each path in the SVG that show the same content as the mark labels (layer index). The marks already have labels showing layer numbers. Need to also place labels near each path so users can identify which path corresponds to which mark/layer. This involves calculating positions near each path element and adding text labels there.
<!-- SECTION:DESCRIPTION:END -->
