---
id: TASK-004
title: Prevent stroke-width change on marks during highlight
status: Done
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 22:37'
labels: []
dependencies: []
priority: medium
ordinal: 400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

In doodledial.ts lines 70-72, stroke-width '5' is applied to the entire group including the mark line and label. Modify to only apply stroke-width to path elements, not to the mark line or label text.

<!-- SECTION:DESCRIPTION:END -->
