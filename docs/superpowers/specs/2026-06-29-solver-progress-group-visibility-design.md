# Solver Progress Overlay — Multi-Group Visibility

## Problem

When solving dials with multiple groups, the brute-force solver processes one group at a time. The progress overlay (`SolverProgressOverlay.svelte`) shows only `"Optimizing"` and a progress bar — the user cannot tell which group is being solved, which groups are already done, and which groups are still waiting.

## Solution

Add a group-status row to the progress overlay that shows all selected groups with their completion state.

### Store Changes (`solver.svelte.ts`)

**New reactive state:**

- `solverCurrentGroupId: string | null` — the group ID currently being solved
- `solverMultiGroupCompletedIds: string[]` — group IDs that have been fully solved

**Where state is updated:**

| Location                              | Action                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `handleRunSolver()` (start)           | Set `solverCurrentGroupId = targetGroupId`. Reset `solverMultiGroupCompletedIds = []` on first run (`solverMultiGroupStarted` was false). |
| `handleApplyBruteforceLayout()`       | If `solverMultiGroupQueue.length > 0`, append `solverCurrentGroupId` to `solverMultiGroupCompletedIds` before starting next group.        |
| `handleCloseBruteforceResultDialog()` | Same as above.                                                                                                                            |
| `reset()`                             | Clear both to initial values.                                                                                                             |

**New getters exposed:** `solverCurrentGroupId`, `solverMultiGroupCompletedIds`

### Overlay Changes (`SolverProgressOverlay.svelte`)

Show a group indicator row **only when** `doodledialStore.groups.length > 1` and the overlay is visible. The row sits between the timer line and the progress bar:

```
Optimizing
Elapsed 5.0s                 Max 60s

[✓ Group 1]  [◉ Group 2]  [○ Group 3]

[=============               ] 45%

Combinations 45/100
[Stop]
```

**Group chip states:**

| State     | Indicator | Visual                                                             |
| --------- | --------- | ------------------------------------------------------------------ |
| Completed | ✓         | Green dot + group name (green text, strikethrough optional, muted) |
| Current   | ◉         | Indigo dot + group name (bold, indigo text)                        |
| Waiting   | ○         | Gray dot + group name (muted gray)                                 |

Group ordering follows the order of `solverStore.solverSelectedGroupIds` which is the order groups appear in the layer panel (insertion order). Group colors are looked up from `doodledialStore.groups`.

Chips are compact — just a small colored dot and the group name, matching the visual style of the group selection in `SolverConfigDialog`.

### Files Changed

- `src/lib/stores/solver.svelte.ts` — add state, update orchestration methods
- `src/lib/components/SolverProgressOverlay.svelte` — add group indicator row
- `tests/lib/stores/solver-store.spec.ts` — add tests for new state

### What Stays the Same

- Single-group or no-group solving shows no group row
- All existing DOM selectors used by Playwright tests are untouched
- No changes to `SolverConfigDialog`, `BruteforceResultDialog`, or the solver engine
