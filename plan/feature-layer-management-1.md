---
goal: Add layer management for uploaded SVG paths
version: '1.0'
date_created: '2026-04-08'
last_updated: '2026-04-08'
owner: Doodledials Team
status: 'Planned'
tags: ['feature', 'svg', 'layer-management', 'ui']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan adds layer management functionality to the Doodledial Generator. When users upload an SVG, each path element should be treated as an individual layer with visibility toggle. A layer list UI component will be added to the control section.

## 1. Requirements & Constraints

- **REQ-001**: Each `<path>` element in uploaded SVG must become a separate layer
- **REQ-002**: Layer list UI must display in the control section alongside existing controls
- **REQ-003**: Users must be able to toggle layer visibility on/off
- **REQ-004**: Layers must maintain original order from SVG
- **REQ-005**: Layer visibility must affect the final exported SVG
- **CON-001**: Must use Svelte 5 runes for state management
- **CON-002**: Must integrate with existing store architecture
- **CON-003**: Must maintain backward compatibility when no SVG is uploaded

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Extend types and store to support layer management

| Task     | Description                                                                       | Completed | Date       |
| -------- | --------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Add `Layer` interface to types/doodledial.ts with id, name, visible, svgElementId | ✓         | 2026-04-08 |
| TASK-002 | Add `layers` state to doodledial.svelte.ts store                                  | ✓         | 2026-04-08 |
| TASK-003 | Add layer management methods to store (addLayer, removeLayer, toggleVisibility)   | ✓         | 2026-04-08 |

**Validation:** Store has layers array with add/toggle/reorder methods available

### Implementation Phase 2

- GOAL-002: Parse SVG paths into layer data on upload

| Task     | Description                                                                  | Completed | Date       |
| -------- | ---------------------------------------------------------------------------- | --------- | ---------- |
| TASK-004 | Add SVG parsing function in utils/doodledial.ts to extract all path elements | ✓         | 2026-04-08 |
| TASK-005 | Modify FileUpload.svelte to parse layers after SVG upload                    | ✓         | 2026-04-08 |
| TASK-006 | Update store to call layer parsing when SVG content changes                  | ✓         | 2026-04-08 |

**Validation:** Uploaded SVG with 3 paths creates 3 layer entries in store

### Implementation Phase 3

- GOAL-003: Create LayerList UI component

| Task     | Description                                                  | Completed | Date |
| -------- | ------------------------------------------------------------ | --------- | ---- |
| TASK-007 | Create LayerList.svelte component in lib/components/         |           |      |
| TASK-008 | Display layer list with visibility toggle checkbox per layer |           |      |
| TASK-009 | Add "Show All" / "Hide All" bulk actions                     |           |      |

**Validation:** LayerList renders in control panel and shows correct layer count

### Implementation Phase 4

- GOAL-004: Integrate layer visibility into SVG rendering

| Task     | Description                                                   | Completed | Date |
| -------- | ------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Modify combineDoodledial in utils to respect layer visibility |           |      |
| TASK-011 | Update DialPreview to re-render when layer visibility changes |           |      |

**Validation:** Toggling layer visibility updates preview correctly

### Implementation Phase 5

- GOAL-005: Add LayerList to main page layout

| Task     | Description                                             | Completed | Date |
| -------- | ------------------------------------------------------- | --------- | ---- |
| TASK-012 | Add LayerList component to +page.svelte control section |           |      |

**Validation:** LayerList visible when SVG is uploaded

### Implementation Phase 6

- GOAL-006: Create Playwright E2E tests for layer management

| Task     | Description                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Add test SVG file with 3 paths to tests/fixtures/                                |           |      |
| TASK-014 | Add Playwright test: upload SVG, verify layer list shows 3 layers                |           |      |
| TASK-015 | Add Playwright test: toggle layer visibility off, verify layer hidden in preview |           |      |
| TASK-016 | Add Playwright test: toggle layer visibility on, verify layer visible in preview |           |      |
| TASK-017 | Add Playwright test: export SVG with hidden layers, verify hidden paths excluded |           |      |
| TASK-018 | Add Playwright test: upload new SVG, verify layers replaced with new ones        |           |      |
| TASK-019 | Add Playwright test: click "Show All" bulk action, verify all layers visible     |           |      |
| TASK-020 | Add Playwright test: click "Hide All" bulk action, verify all layers hidden      |           |      |

## 3. Alternatives

- **ALT-001**: Use HTML5 drag-and-drop for layer reordering - Not chosen: Keep simple checkbox toggle first, add drag-drop later if needed
- **ALT-002**: Parse all SVG elements (not just paths) as layers - Not chosen: Scope to paths only per requirements
- **ALT-003**: Store layer visibility in localStorage - Not chosen: Per-session state only for MVP

## 4. Dependencies

- **DEP-001**: @svgdotjs/svg.js - Already in use, will use for path extraction
- **DEP-002**: Svelte 5 runes - Already in use
- **DEP-003**: Existing doodledial store architecture - Already in place

## 5. Files

- **FILE-001**: `src/lib/types/doodledial.ts` - Add Layer interface
- **FILE-002**: `src/lib/stores/doodledial.svelte.ts` - Add layers state and methods
- **FILE-003**: `src/lib/utils/doodledial.ts` - Add SVG path parsing function
- **FILE-004**: `src/lib/components/FileUpload.svelte` - Trigger layer parsing on upload
- **FILE-005**: `src/lib/components/LayerList.svelte` - New component for layer UI
- **FILE-006**: `src/routes/+page.svelte` - Add LayerList to layout
- **FILE-007**: `src/lib/components/DialPreview.svelte` - React to layer visibility changes
- **FILE-008**: `tests/fixtures/three-paths.svg` - SVG with 3 paths for testing
- **FILE-009**: `tests/layer-management.spec.ts` - Playwright E2E tests for layer features

## 6. Testing

All testing is implemented via Playwright E2E tests. See `tests/layer-management.spec.ts` for complete test suite.

- **TEST-001**: Manual verification: Upload SVG with 3 paths, verify 3 layers appear in list
- **TEST-002**: Manual verification: Toggle layer visibility off, verify it's hidden in preview
- **TEST-003**: Manual verification: Toggle layer visibility on, verify it's visible in preview
- **TEST-004**: Manual verification: Export SVG with hidden layers, verify hidden paths are excluded
- **TEST-005**: Manual verification: Upload new SVG, verify layers are replaced with new ones

## 7. Playwright E2E Tests

The following automated tests are implemented in `tests/layer-management.spec.ts`:

| Test ID | Description                                                 |
| ------- | ----------------------------------------------------------- |
| E2E-001 | Upload SVG with 3 paths, verify layer list shows 3 layers   |
| E2E-002 | Toggle layer visibility off, verify layer hidden in preview |
| E2E-003 | Toggle layer visibility on, verify layer visible in preview |
| E2E-004 | Export SVG with hidden layers, verify hidden paths excluded |
| E2E-005 | Upload new SVG, verify layers replaced with new ones        |
| E2E-006 | Click "Show All" bulk action, verify all layers visible     |
| E2E-007 | Click "Hide All" bulk action, verify all layers hidden      |

Run tests with: `pnpm playwright test tests/layer-management.spec.ts`

## 9. Risks & Assumptions

- **RISK-001**: SVG paths may have complex transforms - Will need to handle d attribute parsing carefully
- **RISK-002**: Large SVGs with many paths may impact performance - Accept risk for MVP, optimize later
- **ASSUMPTION-001**: Users will upload SVGs with relatively simple path structures
- **ASSUMPTION-002**: Layer renaming is not required for MVP (auto-generated names sufficient)

## 9. Related Specifications / Further Reading

- [SVG Path Reference](https://www.w3.org/TR/SVG/paths.html)
- [Svelte 5 State Management](https://svelte.dev/docs/svelte/svelte#state)
