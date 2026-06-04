# Optimizer Progress Panel: Remove Intermediate Results, Add Stop & Result Dialog

## Summary

Redesign the brute-force optimizer progress panel to remove live intermediate result thumbnails, replace the "Cancel" button with a "Stop" button that opens the result dialog, and allow continuing the search from the result dialog with the remaining time pre-filled.

## Motivation

Users found the live intermediate thumbnails distracting during search. The existing flow only allowed seeing results either after completion (auto-opened dialog) or upon cancellation (no dialog — results lost). This change makes stopping a deliberate action that preserves and presents results for selection.

## Design

### 1. Progress Panel (Overlay)

**Remove:**

- "Solutions: X/12" label
- 4×3 thumbnail grid
- Selected thumbnail info bar (min gap / variance / deviation)

**Keep:**

- Phase label, elapsed/max time display, progress bar, progress message

**Change:**

- "Cancel" button → "Stop" button (same visual style, new label and behavior)

### 2. Stop Behavior

When the user clicks "Stop" during a brute-force search:

1. `AbortController.abort()` is called (same mechanism as old Cancel)
2. The catch block detects `BruteforceOptimizerCancelledError` and, for brute-force mode, sets `bruteforceRunStopReason = 'stopped'` (instead of marking as cancelled)
3. The finally block opens the result dialog with the current `topLayouts` and `optimizerSvgTemplate` preserved

### 3. Result Dialog

**New stop reason `'stopped'`:**

- Header: "Search Stopped — Select a Layout"
- The "Continue Searching" section (currently only for `time_limit`) is also shown for `stopped`
- Continue time input is pre-filled with remaining seconds: `(maxRuntimeMs - elapsedMs) / 1000`
- Input is editable

**Existing behavior preserved:**

- `'time_limit'`: continues to show "Continue Searching" with extend time input
- `'exact_complete'`: shows only Accept / Cancel buttons
- `'no_feasible_solution'`: shows instructional text

### 4. Force-Directed Mode

Unchanged. Force-directed auto-applies on completion. No result dialog.

## State Changes

| Variable                    | Change                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleCancelOptimizer`     | Renamed to `handleStopOptimizer`                                                                                                              |
| `bruteforceUserStopped`     | New `$state(false)` — set true before abort                                                                                                   |
| Catch block (line 325+)     | For `BruteforceOptimizerCancelledError` in brute-force mode: set `bruteforceRunStopReason = 'stopped'`, don't set `optimizerCancelled = true` |
| Finally block (line 363)    | Remove `!optimizerCancelled` guard — open dialog when `bruteforceRunStopReason !== null`                                                      |
| Result dialog header/footer | Handle `'stopped'` alongside `'time_limit'`                                                                                                   |

## Files Changed

Only `src/routes/+page.svelte` — no changes to optimizer engines, stores, or other components.

## Acceptance Criteria

1. Progress overlay during brute-force shows no thumbnails or solution count
2. Clicking "Stop" aborts the search and opens the result dialog with found layouts
3. Result dialog shows appropriate header ("Search Stopped")
4. "Continue Searching" is available for both `stopped` and `time_limit`
5. Continue time is pre-filled with remaining time (max - elapsed), editable
6. "Accept Layout" applies the selected layout
7. Force-directed mode is completely unaffected
8. `pnpm check` and `pnpm lint` pass with no errors or warnings
