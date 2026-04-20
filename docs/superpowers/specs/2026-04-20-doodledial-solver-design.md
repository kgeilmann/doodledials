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
  config: DialConfig,
  svgContent: SVGContent,
  onProgress: (progress: SolverProgress) => void
): Promise<SolverSolution[]>
```

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

Use the complement of angular variance:

- Calculate the circular variance of all rotation angles
- Score = 1 / (1 + variance)
- Higher score = more even distribution

### User Interface

- Add "Solve" button in the rotation controls area
- Show loading indicator while solving
- Display top 10 solutions as they're found
- Allow user to:
  - Abort search at any time
  - Select any found solution to apply
  - Show "No valid solution found" if constraints impossible

## Implementation Notes

- Use existing `detectOverlaps` and `detectCutoutGaps` from `overlap-detection.ts`
- Leverage existing Layer and DialConfig types
- Consider caching bitmaps per layer per rotation to avoid recomputation
- For N > 8 layers, consider adding early termination if full search is too slow
