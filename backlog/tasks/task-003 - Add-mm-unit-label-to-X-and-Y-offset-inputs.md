---
id: TASK-003
title: Add mm unit label to X and Y offset inputs
status: To Do
assignee: []
created_date: '2026-04-09 21:42'
updated_date: '2026-04-09 22:44'
labels: []
dependencies: []
priority: medium
ordinal: 300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In DiameterControl.svelte, the X Offset and Y Offset input fields currently don't show a unit label. Add "mm" unit labels next to them similar to how the diameter input has a mm label.

The value has to be interpreted converted to px when applied to the svg, analogous to the disc diameter
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The X Offset input field displays an "mm" unit label next to it
- [ ] #2 The Y Offset input field displays an "mm" unit label next to it
- [ ] #3 The unit labels match the styling of the existing diameter mm label
- [ ] #4 The offset values are correctly converted from mm to px when applied to the SVG
<!-- AC:END -->
