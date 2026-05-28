# Brute Force Optimizer Design

## Objective

Add a second optimizer implementation that uses exact global brute force over integer angles.

Optimization goals:

- Hard constraint: pairwise overlap between any two layers must remain below threshold (`MIN_OVERLAP_PIXELS = 2`).
- Soft goal: among all feasible solutions, prefer the most uniform circular angular distribution.

This optimizer is separate from the existing force-directed optimizer and should be selectable without regressions to current behavior.

## Scope

In scope:

- Add a new brute-force optimizer module and public API.
- Keep existing optimizer untouched as default.
- Integrate brute-force execution via an additional dedicated UI button.
- Support cancellation, progress reporting, and deterministic execution.
- Reuse current overlap detection pipeline and overlap caching.

Out of scope:

- Replacing force-directed optimizer.
- Introducing non-integer search space.
- New rendering stack or server-side optimizer.

## Operating Assumptions

- Exact-complete runs are expected to be practical for smaller layer counts (for example single-digit `N`) with caching and pruning.
- For larger `N`, optional `maxRuntimeMs` is expected to be used.
- If runtime guardrail is enabled and hit, returned layout is the best feasible incumbent found so far.

## High-Level Approach

The brute-force optimizer uses depth-first branch-and-bound with exact search over integer angles in `[0, 359]`.

Core ideas:

- Symmetry reduction: fix one anchor layer at angle `0` to eliminate rotationally equivalent layouts.
- Backtracking assignment: assign one layer at a time.
- Early invalid pruning: when assigning a layer angle, only test overlap against already assigned layers.
- Best-so-far incumbent: once a feasible solution is found, keep the best by soft score.
- Upper/lower bounds: prune branches that cannot beat incumbent soft score.
- Candidate ordering heuristics: improve time to first high-quality feasible incumbent without changing exactness.

## API Design

### New Module

`src/lib/optimizer/run-bruteforce-optimizer.ts`

Exports:

- `runBruteforceOptimizer(input, onProgress?, options?) => Promise<OptimizerResult>`
- `BruteforceOptimizerOptions`
- `BruteforceOptimizerProgress` (or reuse current shape exactly)
- `BruteforceOptimizerCancelledError` (or reuse `OptimizerCancelledError`)

### Input and Output Compatibility

Preserve compatibility with existing optimizer shapes where practical:

- Input: same `OptimizerInput` type.
- Output: same `OptimizerResult` layout map.
- Progress callback: preserve fields `percent`, `message`, `iteration`, `totalIterations` so UI overlay can remain unchanged.

### Options

`BruteforceOptimizerOptions`:

- `signal?: AbortSignal`
- `roundOutputAngles?: boolean` (default `true`)
- `overlapPairCacheMode?: PairOverlapCacheMode` (default `absolute`)
- `maxRuntimeMs?: number` (optional guardrail, no effect when omitted)
- `anchorLayerId?: string` (optional; default first layer by stable ordering)
- `onSearchSnapshot?: (snapshot) => void` (diagnostics)

### Stop Reasons

Explicit stop metadata for diagnostics and logging:

- `exact_complete`
- `cancelled`
- `time_limit`
- `no_feasible_solution`

## Scoring and Exactness

### Hard Feasibility

A complete assignment is feasible only if all pair overlaps satisfy:

- `overlap(i, j) < MIN_OVERLAP_PIXELS`

Partial assignment validity:

- When assigning layer `Lk` with candidate angle `a`, test only pairs `(Lk, Li)` for already assigned `Li`.
- If any pair violates hard constraint, prune immediately.

### Soft Objective (Lexicographic)

Use deterministic lexicographic optimization among feasible solutions:

1. Maximize minimum circular gap.
2. Minimize variance of circular gaps.
3. Minimize absolute deviation sum from ideal gap.
4. Tie-break by stable layer-id order and angle tuple (for deterministic output).

This gives deterministic and interpretable ranking while preserving hard-constraint exactness.

## Branch-and-Bound Details

### Search State

State contains:

- `assignedAngles: Map<layerId, angle>`
- `usedAngles: boolean[360]`
- `depth`
- `nodesVisited`
- `bestSolution` and `bestScore`
- `startedAtMs`

### Layer Ordering

Use fixed layer order to preserve deterministic behavior, but choose a strong default:

- First layer: anchor.
- Remaining layers sorted by descending estimated conflict potential.

Conflict potential estimate (cheap heuristic):

- Precompute coarse overlap risk count per layer by sampling a sparse angle set against others.
- If omitted for simplicity in v1, fallback to stable `layer.id` order.

### Candidate Angle Ordering

Generate candidate angle list as a deterministic sequence:

- Priority near ideal spacing relative to already assigned anchor and current depth.
- Then remaining angles in ascending order.

This does not prune possibilities; it only improves incumbent discovery speed.

### Bounding

Use safe bounds for pruning while preserving exactness:

- If no incumbent yet: only hard-prune invalid branches.
- If incumbent exists:
  - Compute optimistic upper bound for minimum gap achievable from current partial assignment.
  - If bound is strictly worse than incumbent on criterion 1, prune.
  - For equal criterion 1 bound, use conservative lower bounds for variance/deviation; prune only when mathematically impossible to beat incumbent.

Implementation note for v1:

- Keep bounds conservative. If bound logic is complex, prefer fewer bound prunes over risking incorrect pruning.

### Overlap Evaluation Strategy

Reuse existing pipeline:

- Build rotated layers from partial assignment + base angles for unassigned layers only when needed.
- For pair checks at assignment time, evaluate overlap for single pair configuration.

Caching:

- Reuse `createOverlapDetectionCache`.
- Add pair-angle memo map in brute-force module:
  - key: `(layerA, angleA, layerB, angleB, cacheMode)` normalized by layer-id ordering.
  - value: overlap pixels.

This avoids repeated expensive raster overlap checks.

## Progress and Diagnostics

Progress for brute-force is node-based (not iteration-based), but map to existing UI fields:

- `iteration`: `nodesVisited`
- `totalIterations`: `estimatedWorkBudget` derived from runtime guardrail; fallback to visited so far.
- `percent`: bounded estimate if `maxRuntimeMs` is set, else monotonic capped pseudo-progress.
- `message`: include `Nodes x/y`, `Depth d/n`, `Best min-gap`, `Feasible found yes/no`.

Optional snapshot payload fields:

- `nodesVisited`
- `depth`
- `bestScore`
- `feasibleSolutionsFound`
- `cacheHitRate`
- `stopReason` on completion

## UI Integration Plan

`src/routes/+page.svelte` changes:

- Keep existing `Run Optimizer` button and flow for force-directed mode.
- Add a second button: `Run Brute Force Optimizer`.
- Reuse existing dialog shell with brute-force-specific options:
  - optional `maxRuntimeMs`
- Route execution based on which button opened the dialog:
  - force-directed button -> `runOptimizer(...)`
  - brute-force button -> `runBruteforceOptimizer(...)`
- Preserve existing progress overlay test text containing `Iterations` to avoid e2e regression.

## Testing Plan

### Unit Tests (`src/lib/optimizer/run-bruteforce-optimizer.spec.ts`)

1. Returns deterministic layout for same input.
2. Anchor symmetry reduction preserves feasibility and deterministic orientation.
3. Rejects/returns no-feasible result when constraints impossible.
4. Honors cancellation via `AbortSignal`.
5. Honors `maxRuntimeMs` stop reason.
6. Uses overlap cache mode default and accepts `relative`.
7. Finds feasible solution when one exists in controlled mock overlap scenario.
8. Prefers better soft score among multiple feasible solutions.
9. Returns integer angles by default.
10. Supports optional non-rounded output if exposed.

### Integration / UI Tests

- Extend optimizer hook e2e to run brute-force mode and verify:
  - frontend runner is called,
  - progress overlay updates and includes `Iterations`,
  - resulting layout applied without API call.

### Performance Characterization (non-blocking)

Add benchmark-like dev test utility (optional) for representative `N` values to observe node growth and cache efficiency.

## Risks and Mitigations

Risk: combinatorial explosion as layer count increases.

- Mitigation: symmetry reduction, candidate ordering, conservative bounds, optional runtime guardrail.

Risk: incorrect pruning from overly aggressive bounds.

- Mitigation: start with hard-prune + very conservative soft bounds; add property tests and cross-check with exhaustive tiny cases.

Risk: progress percent ambiguity for unbounded exact search.

- Mitigation: explicit message semantics and reliable node/depth telemetry.

Risk: UI regression from progress text changes.

- Mitigation: preserve `Iterations` token in progress message/counter.

## Rollout Plan

1. Add brute-force core module with tests using mocked overlap detection.
2. Wire a dedicated brute-force run button while keeping force-directed default.
3. Add e2e coverage for brute-force mode.
4. Verify project gates:
   - `pnpm check`
   - `pnpm lint`
5. Optional: add docs note in optimizer section of README.

## Acceptance Criteria

- New brute-force optimizer exists and is selectable.
- Existing force-directed workflow remains default and unchanged.
- Brute-force mode supports cancellation and progress updates.
- Hard overlap constraint is enforced exactly.
- Among feasible solutions, soft scoring is deterministic and consistent.
- Required checks pass with no warnings/errors.
