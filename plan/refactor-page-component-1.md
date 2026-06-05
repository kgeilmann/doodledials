---
goal: Decompose +page.svelte by extracting optimizer dialogs, overlay, and store into dedicated modules
version: 1.0
date_created: 2026-06-05
status: Planned
tags: refactor, architecture, component
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Decompose the 1033-line `+page.svelte` by extracting optimizer-related state (37 variables) into a dedicated `optimizer.svelte.ts` store, and extracting three dialog/overlay components. The page component is reduced to ~500 lines focused on layout orchestration.

## 1. Requirements & Constraints

- **REQ-001**: All optimizer functionality must be preserved with identical behavior
- **REQ-002**: Optimizer state is extracted into a single `optimizer.svelte.ts` store
- **REQ-003**: Three components are extracted: `OptimizerConfigDialog`, `BruteforceResultDialog`, `OptimizerProgressOverlay`
- **REQ-004**: The optimizer store exposes all state reactively using Svelte 5 runes
- **REQ-005**: Remove debug `console.log` statements from optimizer orchestration code
- **REQ-006**: Hardcoded magic values (1200ms overlay hide, 100ms timer, 42 seed) are moved to constants
- **CON-001**: Must not change the optimizer algorithm code (`run-optimizer.ts`, `run-bruteforce-optimizer.ts`)
- **CON-002**: All components must use `$state`/`$derived`/`$effect` consistently
- **PAT-001**: Follow same store pattern as existing stores (module-level `$state` + factory function)

## 2. Implementation Steps

### Implementation Phase 1: Create OptimizerStore

- GOAL-001: Create `lib/stores/optimizer.svelte.ts` moving all 37 optimizer state variables and the `handleRunOptimizer` orchestration logic out of `+page.svelte`

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `lib/stores/optimizer.svelte.ts` with `createOptimizerStore()` factory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |           |      |
| TASK-002 | Move all 37 state variables: optimizerPending, optimizerProgress, optimizerProgressPhase, optimizerProgressMessage, optimizerIteration, optimizerTotalIterations, optimizerAbortController, optimizerOverlayVisible, overlayHideTimer, optimizerLiveTimer, optimizerRunDialogOpen, optimizerInitializeRandomly, optimizerRoundOutputAngles, optimizerGapMmInput, optimizerRandomSeedInput, optimizerMaxRuntimeSInput, optimizerMode, optimizerActiveMode, optimizerElapsedMs, optimizerMaxRuntimeMs, bruteforceResultDialogOpen, bruteforceRunSummary, bruteforceExtendRuntimeSInput, bruteforceResumeContext, optimizerTopLayouts, optimizerSvgTemplate, optimizerResultSelectedIndex, bruteforceUserStopped, BruteForceRunSummary interface |           |      |
| TASK-003 | Move `handleRunOptimizer()` ~197-line function into the store                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |           |      |
| TASK-004 | Move helper functions: `handleOpenOptimizerDialog`, `handleCloseOptimizerDialog`, `handleStopOptimizer`, `handleAcceptBruteforceLayout`, `handleRejectBruteforceLayout`, `handleExtendBruteforceRuntime`, `handleCloseBruteforceResultDialog`, `clearOverlayHideTimer`, `scheduleOverlayHide`, `clearOptimizerLiveTimer`, `startOptimizerLiveTimer`, `handleOptimizerModeTabChange`                                                                                                                                                                                                                                                                                                                                                           |           |      |
| TASK-005 | Move utility functions: `fitSvg`, `formatDurationMs`, `formatProgressCountLabel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |           |      |
| TASK-006 | Move `optimizerTuningDefaults` constant table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |           |      |
| TASK-007 | Remove debug `console.log` calls and hardcoded magic values (extract to named constants)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |           |      |
| TASK-008 | Expose store instance as `optimizerStore` for components to import                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |           |      |

**Validation:** `optimizer.svelte.ts` compiles with zero errors, exports `createOptimizerStore()`, all state is reactive via `$state`

### Implementation Phase 2: Create OptimizerProgressOverlay

- GOAL-002: Create `lib/components/OptimizerProgressOverlay.svelte` for the optimizer progress overlay

| Task     | Description                                                                           | Completed | Date |
| -------- | ------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Create `OptimizerProgressOverlay.svelte` — extracts lines 591-640 from `+page.svelte` |           |      |
| TASK-010 | Component accepts `optimizerStore` as prop or directly imports it                     |           |      |
| TASK-011 | Renders: progress bar, iteration count, elapsed time, stop button                     |           |      |
| TASK-012 | Bind overlay visibility and timer logic from the store                                |           |      |

**Validation:** Overlay renders identically to the current inline version, stop button calls `handleStopOptimizer`

### Implementation Phase 3: Create OptimizerConfigDialog

- GOAL-003: Create `lib/components/OptimizerConfigDialog.svelte` for the optimizer settings dialog

| Task     | Description                                                                                                                         | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Create `OptimizerConfigDialog.svelte` — extracts lines 644-831 from `+page.svelte`                                                  |           |      |
| TASK-014 | Component imports `optimizerStore` for state                                                                                        |           |      |
| TASK-015 | Contains: mode tabs (force-directed / brute-force), gap input, runtime input, seed input, 9 tuning parameters, start/cancel buttons |           |      |
| TASK-016 | Dialog backdrop uses semantic HTML (not `<button>`) with `role="dialog"`                                                            |           |      |

**Validation:** Dialog renders identically, all inputs bind correctly, start/cancel fire store methods

### Implementation Phase 4: Create BruteforceResultDialog

- GOAL-004: Create `lib/components/BruteforceResultDialog.svelte` for the brute-force results dialog

| Task     | Description                                                                                              | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-017 | Create `BruteforceResultDialog.svelte` — extracts lines 833-1031 from `+page.svelte`                     |           |      |
| TASK-018 | Contains: thumbnail grid, large preview, score display, summary stats, extend/accept/cancel buttons      |           |      |
| TASK-019 | Move business logic out of template event handlers into named methods on the store or component          |           |      |
| TASK-020 | Add `role="dialog"` and proper keyboard handling instead of `a11y_no_static_element_interactions` ignore |           |      |

**Validation:** Dialog renders identically, thumbnail selection works, accept/cancel/extend fire store methods, no a11y warnings

### Implementation Phase 5: Simplify +page.svelte

- GOAL-005: Rewrite `+page.svelte` to use extracted components and remove duplicated/inline code

| Task     | Description                                                                                                                                      | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-021 | Remove all 37 optimizer state variables and imports                                                                                              |           |      |
| TASK-022 | Replace inline optimizer dialog, overlay, result dialog with `<OptimizerConfigDialog>`, `<OptimizerProgressOverlay>`, `<BruteforceResultDialog>` |           |      |
| TASK-023 | Remove `handleRunOptimizer` and all helper functions                                                                                             |           |      |
| TASK-024 | Remove inline SVG icons — extract shared icon snippets or leave as inline (out of scope)                                                         |           |      |
| TASK-025 | Remove `BruteforceRunSummary` interface (moved to store or types file)                                                                           |           |      |
| TASK-026 | Run `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` to confirm no regressions                                                       |           |      |

**Validation:** Page compiles at ~500 lines, all functionality preserved, all existing tests pass, zero lint/check errors

## 3. Alternatives

- **ALT-001**: Keep optimizer state in the page but extract only dialogs — rejected, 37 state vars still pollute the page component
- **ALT-002**: Use context API instead of a store — rejected, the optimizer state is app-global, not per-component-tree
- **ALT-003**: Extract each dialog as a standalone page route — rejected, the optimizer is tightly coupled to the main editor

## 4. Dependencies

- **DEP-001**: Phase 2-4 depend on Phase 1 (components need the store)
- **DEP-002**: Phase 5 depends on Phases 1-4

## 5. Files

- **FILE-001**: `src/lib/stores/optimizer.svelte.ts` — new file
- **FILE-002**: `src/lib/components/OptimizerProgressOverlay.svelte` — new file
- **FILE-003**: `src/lib/components/OptimizerConfigDialog.svelte` — new file
- **FILE-004**: `src/lib/components/BruteforceResultDialog.svelte` — new file
- **FILE-005**: `src/routes/+page.svelte` — major simplification
- **FILE-006**: `src/lib/types/doodledial.ts` — may host `BruteforceRunSummary`

## 6. Testing

- **TEST-001**: Each new component renders in isolation (manual or Playwright)
- **TEST-002**: Optimizer e2e tests pass (`tests/optimizer-hook.spec.ts`)
- **TEST-003**: All existing e2e tests pass (`pnpm test:e2e`)
- **TEST-004**: Zero a11y violations from dialogs (keyboard navigation, `role` attributes)

## 7. Risks & Assumptions

- **RISK-001**: Complex `handleRunOptimizer` logic may have untested branches — mitigation: run e2e tests before/after to catch behavioral changes
- **RISK-002**: Timer/interval lifecycle may behave differently after extraction — mitigation: clearly scope timer cleanup in the store's lifecycle
- **ASSUMPTION-001**: The extracted components import `optimizerStore` directly rather than receiving props (for simplicity, since it's a singleton)

## 8. Related Specifications / Further Reading

- Code review analysis: `src/routes/+page.svelte` lines 1-1033
