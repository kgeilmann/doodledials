---
id: TASK-007
title: Mark Label should not be selectable
status: Done
assignee: []
created_date: '2026-04-09 23:18'
updated_date: '2026-04-09 23:37'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

When clicking on the mark label, the cursor changes to an text input cursor, additionally the text can be selected with the mouse. As we cannot edit the text and we also do not want to copy it, this is not needed.

The only interaction needed with the label is clicking for layer selection, hovering for layer hightlighting and dragging for layer rotation.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Clicking on label shows pointer cursor, not text input cursor
- [ ] #2 Text cannot be selected with mouse drag
- [ ] #3 Hover highlighting still works
- [ ] #4 Click for layer selection still works
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

## Implementation Plan

### Problem

When clicking on the mark label (layer number), the cursor shows a text input cursor and text can be selected with the mouse. This is unnecessary since the text cannot be edited.

### Solution

Add CSS to make the `.layer-label` non-selectable.

### Steps

1. Add CSS rules to `.layer-label` class in `src/lib/utils/doodledial.ts`:
   - `user-select: none` - prevents text selection
   - `cursor: pointer` - shows pointer cursor for click interaction
   - `cursor: default` on hover for layer highlighting (already handled via existing interaction)

2. Verify the fix works by testing:
   - Clicking on label should not show text cursor
   - Text cannot be selected with mouse
   - Hover highlighting still works
   - Click for layer selection still works
   <!-- SECTION:PLAN:END -->
