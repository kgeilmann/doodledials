---
goal: Add rotation drag to mark line and label in doodledial
version: 1.0
date_created: 2026-04-10
last_updated: 2026-04-10
owner: doodledials team
status: 'In progress'
tags: ['feature', 'doodledial', 'rotation', 'interaction']
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This plan implements drag-to-rotate functionality for the mark line and layer label in the doodledial SVG. Users will be able to directly rotate layers by dragging these elements, calculating rotation based on the angle between the disc center and pointer position.

## 1. Requirements & Constraints

- **REQ-001**: Add pointer event handlers (pointerdown, pointermove, pointerup) to mark line and label for rotation
- **REQ-002**: Calculate rotation as angle between disc center and pointer position
- **REQ-003**: Mark line and label must highlight layer on hover (mouseenter/mouseleave)
- **REQ-004**: Mark line and label must select layer on click
- **REQ-005**: Rotation must update the layer's rotation property in the state
- **REQ-006**: Selection and highlighting behavior must match layer list behavior
- **TEST-001**: Write e2e test for rotation via drag gesture on mark/label
- **TEST-002**: Write e2e test for selection via click on mark/label
- **TEST-003**: Write e2e test for highlight on hover
- **TEST-004**: All tests must pass

## 2. Implementation Steps

### Implementation Phase 1 - Core Rotation Logic

- GOAL-001: Add rotation drag interaction to mark line and label elements

| Task     | Description                                                                                          | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `src/lib/utils/rotation.ts` with extracted common rotation utilities from RotationKnob.svelte |           |      |
| TASK-002 | Add `getAngleFromCenter(cx, cy, x, y)` function that calculates angle from a center point            |           |      |
| TASK-003 | Add `normalizeAngleDelta(delta)` function for wrap-around handling (lines 55-56 in RotationKnob)     |           |      |
| TASK-004 | Modify `combineDoodledial` to add CSS classes to mark line for targeting (e.g., `class="mark-line"`) |           |      |
| TASK-005 | Add `data-layer-id` attribute to mark line and label elements to identify the layer                  |           |      |
| TASK-006 | Add event handler setup in the component that renders the doodledial SVG                             |           |      |
| TASK-007 | Implement pointerdown handler to track drag start position                                           |           |      |
| TASK-008 | Implement pointermove handler to calculate and update rotation during drag                           |           |      |
| TASK-009 | Implement pointerup/pointerleave handler to end drag                                                 |           |      |
| TASK-010 | Update layer state with new rotation value                                                           |           |      |

### Implementation Phase 2 - Selection and Highlighting

- GOAL-002: Add selection and hover highlighting to mark line and label

| Task     | Description                                                               | Completed | Date |
| -------- | ------------------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Add mouseenter handler to mark/label to set highlightedLayer state        |           |      |
| TASK-010 | Add mouseleave handler to mark/label to clear highlightedLayer state      |           |      |
| TASK-011 | Add click handler to mark/label to set selectedLayer state                |           |      |
| TASK-012 | Ensure highlight/selection colors match layer list behavior (#6366f1)     |           |      |
| TASK-013 | Pass highlightedLayerId and selectedLayerId to combineDoodledial function |           |      |

### Implementation Phase 3 - Testing

- GOAL-003: Implement e2e tests for all acceptance criteria

| Task     | Description                                               | Completed | Date |
| -------- | --------------------------------------------------------- | --------- | ---- |
| TASK-014 | Write e2e test to verify rotation via dragging mark line  |           |      |
| TASK-015 | Write e2e test to verify selection via clicking mark line |           |      |
| TASK-016 | Write e2e test to verify selection via clicking label     |           |      |
| TASK-017 | Write e2e test to verify highlight on hover for mark line |           |      |
| TASK-018 | Write e2e test to verify highlight on hover for label     |           |      |
| TASK-019 | Run all tests and verify they pass                        |           |      |

**Validation:** All 4 acceptance criteria must pass

## 3. Alternatives

- **ALT-001**: Use SVG transform attribute for rotation - rejected, CSS transform more performant for real-time dragging
- **ALT-002**: Use separate rotation handles - rejected, task specifically requires mark line and label

## 4. Dependencies

- **DEP-001**: `@svgdotjs/svg.js` library for SVG manipulation (already in use)
- **DEP-002**: Playwright for e2e testing (already in use)

## 5. Files

- **FILE-001**: `src/lib/utils/rotation.ts` - New file with common rotation utilities extracted from RotationKnob
- **FILE-002**: `src/lib/utils/doodledial.ts` - Add data attributes and classes to mark line/label
- **FILE-003**: Component that renders combined SVG - Add pointer event handlers (likely in a Svelte page/component)
- **FILE-004**: `tests/rotation.spec.ts` - Add e2e tests for new functionality

## 6. Testing

- **TEST-001**: e2e test: Drag mark line to rotate layer, verify rotation value changes
- **TEST-002**: e2e test: Click mark line, verify layer is selected
- **TEST-003**: e2e test: Hover mark line, verify highlight appears
- **TEST-004**: Run full test suite, all tests pass

## 7. Risks & Assumptions

- **RISK-001**: Pointer events may not fire on SVG elements in some browsers - will use pointer capture
- **RISK-002**: Rotation calculation may need adjustment for angle wrap-around - will use atan2
- **ASSUMPTION-001**: Mark line and label are currently rendered via SVG.js in combineDoodledial
- **ASSUMPTION-002**: The component rendering the SVG has access to layer state

## 8. Related Specifications / Further Reading

- Task: task-002
- Existing rotation test file: `tests/rotation.spec.ts`
- doodledial.ts types: `src/lib/types/doodledial.ts`
