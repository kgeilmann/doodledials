---
goal: Split doodledial.svelte.ts monolith into focused stores with proper detection scheduling
version: 1.0
date_created: 2026-06-05
status: Planned
tags: refactor, architecture, store
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Split the `doodledial.svelte.ts` monolith (418 lines, 6+ responsibilities) into focused sub-stores. This eliminates race conditions in overlap/gap detection by introducing a proper serialized scheduler, reduces coupling, and improves testability. The public API of `doodledialStore` is preserved so all existing components continue to work without changes.

## 1. Requirements & Constraints

- **REQ-001**: All existing components that consume `doodledialStore` must work without API changes
- **REQ-002**: Overlap and cutout-gap detection must be serialized (no concurrent runs)
- **REQ-003**: Stale detection runs must be cancellable via AbortSignal
- **REQ-004**: Detection must debounce rapid-fire calls (e.g., during rotation dragging)
- **REQ-005**: Error state must be set when detection fails (not just console.error)
- **REQ-006**: Each sub-store must be independently testable
- **CON-001**: Must use Svelte 5 runes (`$state`, `$derived`, `$effect`) consistently
- **CON-002**: Must not introduce new runtime dependencies
- **PAT-001**: Follow existing module-level `$state` + factory function pattern (not classes)

## 2. Implementation Steps

### Implementation Phase 1: Extract LayerStore

- GOAL-001: Create `lib/stores/layers.svelte.ts` handling all layer CRUD, selection, and highlighting

| Task     | Description                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `lib/stores/layers.svelte.ts` with `createLayerStore()` factory: manage layers Map, selectedLayerId, highlightedLayerId, layer ordering, and all layer mutation methods (addLayer, removeLayer, toggleLayer, setLayerRotation, applyLayerRotations, setSelectedLayer, setHighlightedLayer, reorder) |           |      |
| TASK-002 | Extract `getLayerArray()` as a `$derived` from the layers Map                                                                                                                                                                                                                                              |           |      |
| TASK-003 | Extract `DEFAULT_DIAL_CONFIG` usage: move dial config-specific properties (offsetX, offsetY, scale) out of layers and into the ConfigStore section                                                                                                                                                         |           |      |
| TASK-004 | Add `onLayersChanged` callback support so detection can subscribe to layer changes                                                                                                                                                                                                                         |           |      |
| TASK-005 | Unit-test the extracted layer store in isolation                                                                                                                                                                                                                                                           |           |      |

**Validation:** `lib/stores/layers.svelte.ts` exports `createLayerStore()`, all layer mutation tests pass without importing any detection or SVG code

### Implementation Phase 2: Extract DetectionStore

- GOAL-002: Create `lib/stores/detection.svelte.ts` with serialized, debounced overlap/gap detection

| Task     | Description                                                                                                                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Create `lib/stores/detection.svelte.ts` with `createDetectionStore()` factory                                                                                                                                     |           |      |
| TASK-007 | Implement a `DetectionScheduler` class internally: serializes detection runs, supports debounce (default 50ms), uses AbortController to cancel stale runs, queues gap detection after overlap detection completes |           |      |
| TASK-088 | Move `runOverlapDetection()` and `runCutoutGapDetection()` logic into the store, fixing the error-handling path to set error state instead of just console.error                                                  |           |      |
| TASK-009 | Expose overlapMap and cutoutGapMap as reactive state with proper cleanup on layer removal                                                                                                                         |           |      |
| TASK-010 | Expose `scheduleDetection()` and `runDetectionNow()` methods                                                                                                                                                      |           |      |
| TASK-011 | Unit-test the detection scheduler and error handling                                                                                                                                                              |           |      |

**Validation:** Multiple rapid calls to `scheduleDetection()` run exactly once (debounced), overlapping calls are cancelled via AbortSignal, detection errors surface in error state

### Implementation Phase 3: Extract LabelPlacementStore

- GOAL-003: Create `lib/stores/label-placement.svelte.ts` managing all auto-label-placement scheduling

| Task     | Description                                                                                                      | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-012 | Create `lib/stores/label-placement.svelte.ts` with `createLabelPlacementStore()` factory                         |           |      |
| TASK-013 | Move auto-placement timer, running state, stale flag, and `requestLayerLabelAutoPlacement()` from the monolith   |           |      |
| TASK-014 | Fix the guard inconsistency: check `globalConfig.pathLabelOptimizerEnabled` at execution time, not just set time |           |      |
| TASK-015 | Expose layer label placement mode and offset state                                                               |           |      |
| TASK-016 | Unit-test label placement scheduler                                                                              |           |      |

**Validation:** Label placement runs are independently schedulable, respond to config toggles reactively

### Implementation Phase 4: Refactor doodledial.svelte.ts as Orchestrator

- GOAL-004: Rewrite `doodledial.svelte.ts` to compose sub-stores and preserve the public API

| Task     | Description                                                                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-017 | Rewrite `createDoodledialStore()` to instantiate sub-stores, wire callbacks (layers change → schedule detection, detection error → set error state) |           |      |
| TASK-018 | Remove all duplicated `{ ...layer, ...updates }` spread patterns — delegate to `layers.updateLayer()`                                               |           |      |
| TASK-019 | Remove trivial delegation methods (e.g., `setLayerLabelOffset` → inline `setLayerLabelOffsetManual`)                                                |           |      |
| TASK-020 | Remove dev-mode `window.__doodledialStore` unsafe cast, replace with controlled debug API                                                           |           |      |
| TASK-021 | Run `pnpm check`, `pnpm lint`, `pnpm test:unit` to confirm no regressions                                                                           |           |      |

**Validation:** All existing tests pass, `pnpm check` and `pnpm lint` produce zero errors, all component imports of `doodledialStore` continue to work

### Implementation Phase 5: Fix globalConfig coupling

- GOAL-005: Decouple `doodledialStore` from direct `globalConfig` import

| Task     | Description                                                                                                                             | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-022 | Accept `globalConfig` as a constructor parameter to `createDoodledialStore()`, defaulting to the real import for backward compatibility |           |      |
| TASK-023 | Replace one-time diameter copy (line 11) with reactive read via callback or `$derived`                                                  |           |      |
| TASK-024 | Update test files to inject mock config                                                                                                 |           |      |

**Validation:** `doodledialStore` can be instantiated with a mock config in tests, existing production code continues to work unchanged

## 3. Alternatives

- **ALT-001**: Single class with runes — rejected because it mixes responsibilities and is harder to tree-shake
- **ALT-002**: Event bus pattern for inter-store communication — rejected, direct callbacks are simpler and type-safe
- **ALT-003**: Keep monolith but add comments — rejected, doesn't fix SRP violation or race conditions

## 4. Dependencies

- **DEP-001**: Phase 4 depends on Phases 1-3 being complete
- **DEP-002**: Phase 5 depends on Phase 4 (the new orchestrator shape)

## 5. Files

- **FILE-001**: `src/lib/stores/doodledial.svelte.ts` — rewritten as orchestrator
- **FILE-002**: `src/lib/stores/layers.svelte.ts` — new file, layer CRUD
- **FILE-003**: `src/lib/stores/detection.svelte.ts` — new file, detection with scheduler
- **FILE-004**: `src/lib/stores/label-placement.svelte.ts` — new file, auto-placement
- **FILE-005**: `src/lib/stores/doodledial-store.spec.ts` — updated tests
- **FILE-006**: `src/lib/types/doodledial.ts` — may need minor type adjustments

## 6. Testing

- **TEST-001**: Each sub-store has standalone unit tests (no detection deps in layer tests, no layer deps in detection tests)
- **TEST-002**: Integration test: detection fires when layers change
- **TEST-003**: Regression test: all existing component tests pass
- **TEST-004**: Scheduler tests: debounce delays, cancellation, queue ordering
- **TEST-005**: Error propagation: detection failure sets error state

## 7. Risks & Assumptions

- **RISK-001**: Components directly accessing `doodledialStore` internals (e.g., private Map methods) will break — mitigation: audit all consumers before starting
- **RISK-002**: Detection timing changes could introduce subtle UI lag — mitigation: keep debounce configurable, default to 50ms
- **ASSUMPTION-001**: The public API surface of `doodledialStore` is fully covered by TypeScript types and existing tests

## 8. Related Specifications / Further Reading

- Code review analysis: see `src/lib/stores/doodledial.svelte.ts` review notes
