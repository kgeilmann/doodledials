# Doodledial Solver Design

## Problem

Given N layers with fixed positions and shapes, find rotation angles that satisfy constraints while maximizing disc utilization.

### Constraints

1. **Zero cutout-cutout overlaps** — no two layer shapes intersect
2. **2mm minimum gap** — all cutout pairs maintain ≥2mm clearance
3. **Minimum 2° separation** — no two layers within 2° of each other
4. **Unique rotations** — no two layers share the exact same angle

### Ranking Metric

**Even distribution score** — the more evenly spread rotation angles are across 360°, the better. Measures how well the disc is utilized.

## Architecture

### New File

`src/lib/utils/solver.ts`

### Interface

```typescript
interface SolverSolution {
	rotations: Map<string, number>; // layerId -> rotation in degrees
	score: number; // even distribution score (higher = better)
	isValid: boolean; // satisfies all constraints
}

interface SolverProgress {
	bestSolutions: SolverSolution[];
	searchSpace: number; // total combinations searched
	isComplete: boolean;
}

interface SolverConfig {
	stepDegrees: number; // 1 degree increments
	maxResults: number; // 10 results to stream
	gapMm: number; // minimum gap between cutouts
	minAngleDiff: number; // minimum 2° separation
}
```

### Main Function

```typescript
solveDoodledial(
  layers: Layer[],
  combinedSvg: string,
  onProgress: (progress: SolverProgress) => void
): Promise<SolverSolution[]>
```

- `layers` — array of Layer objects with current rotations
- `combinedSvg` — the already-combined SVG (from `combineDoodledial()`)
- `onProgress` — callback to stream top 10 solutions as they're found

### Algorithm

1. **Search strategy:** Brute-force with 1° increments (360^N combinations)
2. **Precompute:** Render each layer at each rotation angle to bitmap once and cache
3. **Validate:** For each combination, check:
   - No overlaps (using existing `detectOverlaps`)
   - Minimum gap satisfied (using `detectCutoutGaps`)
   - Angle constraints (2° min separation, unique)
4. **Rank:** Calculate even distribution score using angular spacing variance
5. **Stream:** Yield top 10 solutions via `onProgress` callback

### Even Distribution Score

Use circular variance to measure how evenly rotation angles are distributed around 360°:

**Step 1:** Convert angles to radians and compute unit vectors on circle:

```
angleRad = angleDeg * π / 180
x = cos(angleRad)
y = sin(angleRad)
```

**Step 2:** Calculate mean direction (vector sum normalized):

```
x̄ = (Σx) / N
ȳ = (Σy) / N
R = √(x̄² + ȳ²)  // mean resultant length, ranges 0 to 1
```

**Step 3:** Compute circular variance:

```
variance = 1 - R
```

- R = 1 → all angles identical → variance = 0
- R = 0 → perfectly even (angles at 360°/N intervals) → variance = 1

**Step 4:** Score (higher = better):

```
score = 1 / (1 + variance)
```

- Perfect even distribution scores ~1
- Clustered angles score lower

This captures both how spread out angles are AND how well they use the full 360° disc.

### User Interface

- Add "Solve" button in the toolbar, next to the Export button
- Show loading indicator (spinner + "Solving..." text) while running
- Display a modal with top 10 solutions:
  - Each solution shows rotation values for all layers
  - Distribution score indicator (visual bar or percentage)
  - "Apply" button to select a solution
  - "Abort" button to stop search and keep current rotations
- Show "No valid solution found" state if constraints impossible

## Implementation Notes

- Use existing `detectOverlaps` and `detectCutoutGaps` from `overlap-detection.ts` (adapted if needed)
- Leverages existing Layer type
- Cache bitmaps per layer per rotation to avoid recomputation
- No early termination — search continues until full space is explored or user aborts
- Call `combineDoodledial()` in the UI before passing to solver to get the combined SVG
