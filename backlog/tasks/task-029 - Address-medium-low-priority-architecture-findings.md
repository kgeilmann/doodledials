---
id: TASK-029
title: Address medium/low priority architecture findings
status: To Do
assignee: []
created_date: '2026-06-05 16:18'
updated_date: '2026-06-05 16:18'
labels: []
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Follow-up work items from the architecture review that were not critical enough for dedicated implementation plans.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Each item below is addressed (fixed, documented, or explicitly deferred)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

## Remaining Architecture Findings (Medium/Low Priority)

### Duplication & Consolidation

- [ ] **Duplicate DEFAULTS in 3 locations**: `types/doodledial.ts`, `global-config.svelte.ts`, `GlobalConfigDialog.svelte` — derive all from single source of truth, freeze base defaults
- [ ] **Duplicate ExportFormat type**: defined in `export-formats.ts` and redeclared in `global-config.svelte.ts` — share via import
- [ ] **Duplicate analyzeCircularGaps**: two different-shaped copies in `run-optimizer.ts` and `run-bruteforce-optimizer.ts` — extract to `shared.ts`
- [ ] **Duplicate optimizer types**: `OptimizerProgress` defined separately in both optimizer files — lift to `shared.ts`
- [ ] **Warning triangle SVG triplicated**: in `LayerList.svelte` lines 130, 151, 170 — extract to component or variable

### Naming & Organization

- [ ] **Misleading component name**: `DiameterControl` controls X/Y offset and scale, not diameter — rename to `OffsetScaleControl`
- [ ] **Magic number 360 in brute-force optimizer**: appears ~40+ times — replace with `const FULL_CIRCLE = 360`
- [ ] **Interface declared mid-file**: `BruteforceRunSummary` wedged between state declarations in `+page.svelte` — move to top or types file
- [ ] **`DialConfig` mixes user settings with engine constants** in `types/doodledial.ts` — split into `DialConfig` and `DialGeometry`

### Error Handling & Validation

- [ ] **`acquireRenderContext` has no fallback**: canvas context failure is unhandled promise rejection — add try/catch
- [ ] **`parseSvgPaths` has no guard for empty SVG** — returns zero layers instead of error
- [ ] **`GlobalConfigStore` has no input validation** — negative diameter accepted, silent NaN from parseInt
- [ ] **`localStorage` errors silently swallowed** in `global-config.svelte.ts` (empty `catch {}`)

### Reactivity & Performance

- [ ] **Two redundant $effect blocks in `DialPreview.svelte`** — both call `updatePreview()`, remove the duplicate
- [ ] **`void` read trick fragile** in `DialPreview.svelte` — 12 properties explicitly tracked; new properties won't trigger updates
- [ ] **`getLayerArray()` called on every layers getter** with no memoization — use `$derived`
- [ ] **`console.log` in production optimizer code** — remove or guard behind debug flag

### Anti-patterns

- [ ] **`document.getElementById` in `ExportButton.svelte`** — use `bind:this` instead
- [ ] **`dialogOpen` stored in persisted config** in `global-config.svelte.ts` — move to component-local state
- [ ] **No auto-save in `GlobalConfigStore`** — use `$effect` instead of explicit `save()` calls
- [ ] **`DEFAULT_DIAL_CONFIG` is mutable** — use `Object.freeze()` or `as const`
- [ ] **`exportDoodledial` trivial wrapper** — rename or inline `combineDoodledial`
- [ ] **`@ts-expect-error` without comments** in `doodledial.ts` — document why each is expected
<!-- SECTION:NOTES:END -->
