---
goal: Fix the RotationKnob $derived write bug and DialPreview click/deselect interaction bug
version: 1.0
date_created: 2026-06-05
status: Planned
tags: bugfix, svelte5
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Fix two confirmed bugs identified during the architecture review:

1. **RotationKnob $derived write bug**: `localValue = $derived(value)` creates a read-only signal, but the code assigns to it (`localValue = parsed`), which is a silent no-op in Svelte 5. Manual rotation knob edits do nothing.

2. **DialPreview click/deselect interaction**: `pointerdown` selects a layer, then `click` immediately deselects it because `selectedLayer === layerId` is now true. Single-click selection is broken.

## 1. Requirements & Constraints

- **REQ-001**: Rotation knob inline editing must update the displayed value
- **REQ-002**: Single-click on a layer in the preview must select it (not deselect)
- **REQ-003**: Double-click on an already-selected layer should deselect it
- **REQ-004**: No regressions in existing rotation or layer-selection behavior
- **CON-001**: Must use correct Svelte 5 rune patterns — `$state` for mutable values, `$derived` for read-only computed values
- **CON-002**: Existing tests must pass without modification

## 2. Implementation Steps

### Implementation Phase 1: Fix RotationKnob.svelte

- GOAL-001: Replace the read-only `$derived` with correct `$state` initialization and sync

| Task     | Description                                                                                                                                                                | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | In `RotationKnob.svelte`, change `let localValue = $derived(value)` to `let localValue = $state(value)`                                                                    |           |      |
| TASK-002 | Add a `$effect` that syncs `localValue = value` when the `value` prop changes from outside (e.g., undo, optimizer apply) — only when not actively being edited by the user |           |      |
| TASK-003 | Verify that `handleInputInput` and `finishEditing` correctly read/write `localValue`                                                                                       |           |      |
| TASK-004 | Test: knob displays initial value, editing changes the display, clicking away commits the change, external value updates sync back                                         |           |      |

**Validation:** Rotation knob shows and edits values correctly, `pnpm check` produces zero errors

### Implementation Phase 2: Fix DialPreview interaction

- GOAL-002: Fix the pointerdown/click conflict so single-click selects and double-click deselects

| Task     | Description                                                                                                                                                                                                           | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | In `DialPreview.svelte`, remove the selection logic from `pointerdown` handler — keep only `setHighlightedLayer()`                                                                                                    |           |      |
| TASK-006 | Move selection logic to the `click` handler: if `selectedLayer === layerId`, deselect; otherwise select                                                                                                               |           |      |
| TASK-007 | Remove the `pointerdown` → `click` race by keeping `setSelectedLayer` only in one place                                                                                                                               |           |      |
| TASK-008 | Verify that rotation dragging (which uses `pointerdown`/`pointermove`/`pointerup`) continues to work — the `pointerdown` for drag should call `e.stopPropagation()` or check `e.target` to avoid triggering selection |           |      |

**Validation:** Single-click on a layer selects it, click on same layer again deselects it, rotation dragging works without toggling selection

### Implementation Phase 3: Verify

- GOAL-003: Run all checks and tests

| Task     | Description                                                    | Completed | Date |
| -------- | -------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Run `pnpm check` — zero errors                                 |           |      |
| TASK-010 | Run `pnpm lint` — zero errors/warnings                         |           |      |
| TASK-011 | Run `pnpm test:unit` — all tests pass                          |           |      |
| TASK-012 | Run `pnpm test:e2e` — rotation and layer-management tests pass |           |      |

**Validation:** All verification commands pass with zero errors

## 3. Alternatives

- **ALT-001**: Use `$props` rune with `$bindable` for the knob value — rejected, the component manages internal editing state separate from the prop value
- **ALT-002**: Remove `click` handler and use `pointerup` with drag-detection — rejected, too invasive for a simple fix

## 4. Dependencies

None. These are independent bug fixes.

## 5. Files

- **FILE-001**: `src/lib/components/RotationKnob.svelte` — fix $derived → $state
- **FILE-002**: `src/lib/components/DialPreview.svelte` — fix pointerdown/click interaction

## 6. Testing

- **TEST-001**: Manual test: click layer in preview → it gets selected outline
- **TEST-002**: Manual test: click same layer again → it deselects
- **TEST-003**: Manual test: rotate a layer via drag → rotation works, selection doesn't toggle
- **TEST-004**: Automated: `tests/rotation.spec.ts` and `tests/layer-management.spec.ts` pass
- **TEST-005**: Automated: `pnpm check` and `pnpm lint` pass

## 7. Risks & Assumptions

- **RISK-001**: Removing selection from `pointerdown` could break drag-and-drop if drag handlers depend on `selectedLayer` being set — mitigation: verify drag behavior in `DialPreview` line-by-line
- **ASSUMPTION-001**: The `$effect` sync in TASK-002 won't cause infinite loops (it writes to `localValue` which is `$state`, but the effect only triggers on `value` changes, not `localValue` writes)

## 8. Related Specifications / Further Reading

- Svelte 5 runes: `$derived` is read-only, `$state` is mutable
