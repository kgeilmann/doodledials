# Diversity-Guided Brute Force Search

**Date:** 2026-06-03
**Status:** Draft

## Problem

The brute-force optimizer uses DFS branch-and-bound with MRV heuristic and forward checking. While this finds good solutions, the top-12 results presented to the user are often structurally very similar — they differ by only 1-2 degrees per layer. The user wants to see structurally different arrangement options (different layer groupings, different angular patterns) to choose from.

## Approach: Diversity-Guided Search

Three complementary components, ranging from simplest to most impactful.

### Component A: Structural Similarity Metric

A deterministic function that quantifies "how different" two layouts are.

**Design:**

```
function layoutSimilarity(a: Record<string, number>, b: Record<string, number>): number
  Returns 0 (identical) to 1 (maximally different)
```

Implementation: **Bin-based fingerprinting**.

- Divide 360° into `N` equal bins (N = 12, so 30° per bin).
- For each layout, map each layer to its bin index `(angle / 30)`.
- Two layouts are similar if most layers fall in the same bins.
- Similarity = `(number of layers in same bin) / (total layers)`.
- Returns a value in `[0, 1]`.

This is cheap (no pair loops), deterministic, and captures meaningful structural patterns (which layers cluster in which angular region).

**Edge cases:** All layers at identical angles → trivially similar (score 1). Anchor layer always at 0° → always in bin 0, which is handled naturally by the metric.

### Component B: Diversity-Aware Top-N Maintenance

Replace the current `addToTopLayouts` (which only compares by quality score) with a version that considers both quality and structural diversity.

**Current behavior** (line 15 of `run-bruteforce-optimizer.ts`):

- Collects up to 12 layouts sorted purely by quality (min gap > variance > deviation > tiebreak).
- A new layout replaces the worst only if it beats it on quality.

**New behavior:**

- Maintain the same top-12 data structure.
- Selection uses a **three-tier lexicographic comparison** where novelty is the final tiebreaker:
  1. **Primary:** Higher min gap is better.
  2. **Secondary:** Lower variance is better (if min gaps equal).
  3. **Tertiary:** Lower deviation sum is better (if min gap and variance equal).
  4. **Quaternary:** Lower structural similarity to the existing top set is better (if all quality metrics equal).

When deciding whether to replace the worst layout in the top set:

- Compare the candidate against the worst layout using the 4-tier comparator above.
- "Worst" is determined by the same 4-tier comparator applied pair-wise across all top layouts.
- This means novelty only matters when quality metrics are identical — it's a pure tiebreaker.

This avoids any need for score normalization and preserves the existing quality-first semantics exactly. Diversity only comes into play when two layouts are otherwise equally good.

### Component C: Randomized Angle Exploration Order

The DFS loop at line 726 iterates `feasibleAngles` in ascending order. This means the search always explores low-angle branches first, clustering solutions in the same angular region.

**Change:** Shuffle `feasibleAngles` before iterating. Use a **seeded pseudo-random shuffle** (seeded with a combination of layer ID and depth) so results are deterministic for the same input.

**Effect:** Different branches are explored first, so when the time limit fires, the search has sampled from different regions of the search space. Combined with diversity-aware top-N, this naturally produces a diverse result set.

**Seeding strategy:** `hash(layerId) ^ (depth * 7919) % 2^32`. This ensures each layer gets a different shuffle at each depth, while being fully deterministic.

**Resume consideration:** On resume, the search continues from where it left off (the `resumeContext` includes the search state). The shuffle doesn't affect correctness — it only changes the order in which angles are tried. If the previous run already found some solutions, the resumed run will explore angles the first run didn't get to, which is the desired behavior.

### Interaction Between Components

- **A** is the foundation — without a good similarity metric, diversity cannot be measured.
- **B** ensures the top-12 displayed results are structurally diverse.
- **C** ensures the search _finds_ structurally diverse solutions in the first place (within time limits).

C without B: The search explores diverse regions, but the top-12 might still pick 12 nearly-identical solutions from the best region.
B without C: The search only finds solutions from one region, so there's nothing to diversify against.
Both together: The search explores broadly, and the result set reflects that breadth.

## Files Changed

| File                                                 | Change                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/optimizer/run-bruteforce-optimizer.ts`      | Add `layoutSimilarity()` (A), modify `addToTopLayouts()` (B), add shuffle + seed logic (C) |
| `src/lib/optimizer/run-bruteforce-optimizer.spec.ts` | Tests for new functions and modified behavior                                              |

## Testing

New unit tests:

1. **`layoutSimilarity`**:
   - Identical layouts → similarity = 1
   - Completely different (layers in opposite bins) → similarity = 0
   - Half in same bins, half in different → similarity = 0.5
   - One layer vs many layers
   - Anchor layer handled correctly

2. **Diversity-aware top-N**:
   - When a high-quality but non-novel layout arrives, it doesn't displace a slightly-lower-quality but highly-novel layout
   - With fewer than 12 layouts, diversity doesn't block addition
   - The top-N set is bounded at 12

3. **Randomized angle order**:
   - Same input produces same result (deterministic with seed)
   - Different seed produces different results

## Risks and Mitigations

| Risk                                        | Mitigation                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Diversity degrades overall solution quality | α=0.3 ensures quality is still primary; only ties are broken by novelty                                         |
| Shuffle makes debugging harder              | Seeded shuffle is deterministic; seed value is logged                                                           |
| Beam search is complex                      | We're not implementing a beam search — only modifying angle order + top-N selection. Minimal algorithmic change |
| Performance impact                          | Similarity metric is O(N) per comparison, O(N\*12) per new layout. Negligible vs overlap detection              |
