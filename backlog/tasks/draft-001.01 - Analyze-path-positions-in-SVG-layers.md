---
id: DRAFT-001.01
title: Analyze path positions in SVG layers
status: To Do
assignee: []
created_date: '2026-04-10 17:29'
labels:
  - frontend
  - svg
  - research
milestone: Path labels for SVG layers
dependencies: []
references:
  - >-
    src/lib/utils/doodledial.ts:combineDoodledial - existing mark/label creation
    at lines 94-113
parent_task_id: DRAFT-001
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Analyze the existing SVG code in combineDoodledial to understand how to calculate positions near each path. Need to find the bounding box or centroid of each path element within a layer group to determine where to place a label. This is the research/analysis phase before implementation.
<!-- SECTION:DESCRIPTION:END -->
