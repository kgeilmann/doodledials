# Doodledial Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a solver that finds rotation angles for layers satisfying: no overlaps, 2mm minimum gap, 2° min angle separation, unique angles. Stream top 10 solutions while searching, let user abort and select.

**Architecture:** New `solver.ts` utility using bitmap-based collision detection. Solve button next to Export button. Modal showing solutions.

**Tech Stack:** Svelte 5, SVG.js, existing bitmap overlap detection

---

## File Structure

- Create: `src/lib/utils/solver.ts` - main solver logic
- Modify: `src/lib/components/ExportButton.svelte` - add Solve button
- Create: `src/lib/components/SolverModal.svelte` - modal to show solutions
- Modify: `src/lib/stores/doodledial.svelte.ts` - add solver trigger function

---

### Task 1: Create solver utility

**Files:**

- Create: `src/lib/utils/solver.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCircularVariance, calculateScore } from './solver';

describe('calculateCircularVariance', () => {
	it('returns 0 for identical angles', () => {
		const variance = calculateCircularVariance([0, 0, 0]);
		expect(variance).toBe(0);
	});

	it('returns higher variance for clustered angles', () => {
		const clustered = calculateCircularVariance([0, 1, 2]);
		const spread = calculateCircularVariance([0, 120, 240]);
		expect(clustered).toBeGreaterThan(spread);
	});
});

describe('calculateScore', () => {
	it('returns higher score for even distribution', () => {
		const clustered = calculateScore([0, 0, 0]);
		const spread = calculateScore([0, 120, 240]);
		expect(spread).toBeGreaterThan(clustered);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/utils/solver.test.ts`
Expected: FAIL with "cannot find module"

- [ ] **Step 3: Write minimal implementation for circular variance**

```typescript
function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function calculateCircularVariance(angles: number[]): number {
	if (angles.length < 2) return 0;

	const anglesRad = angles.map((a) => toRadians(a));
	const vectors = anglesRad.map((a) => ({ x: Math.cos(a), y: Math.sin(a) }));

	const xBar = vectors.reduce((sum, v) => sum + v.x, 0) / angles.length;
	const yBar = vectors.reduce((sum, v) => sum + v.y, 0) / angles.length;

	const R = Math.sqrt(xBar * xBar + yBar * yBar);
	return 1 - R;
}

export function calculateScore(angles: number[]): number {
	const variance = calculateCircularVariance(angles);
	return 1 / (1 + variance);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/utils/solver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/solver.ts src/lib/utils/solver.test.ts
git commit -m "feat: add circular variance and score calculation for solver"
```

- [ ] **Step 6: Add constraint validation functions**

Add to `src/lib/utils/solver.ts`:

```typescript
import type { Layer } from '$lib/types/doodledial';

const GAP_MM = 2;
const MIN_ANGLE_DIFF = 2;

/**
 * Check if all angles are unique (exact match)
 */
export function hasUniqueAngles(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	const unique = new Set(angles.map((a) => Math.round(a)));
	return unique.size === angles.length;
}

/**
 * Check if all pair-wise angles differ by at least MIN_ANGLE_DIFF degrees
 */
export function hasMinAngleDifference(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	for (let i = 0; i < angles.length; i++) {
		for (let j = i + 1; j < angles.length; j++) {
			const diff = Math.abs(angles[i] - angles[j]);
			const minDiff = Math.min(diff, 360 - diff);
			if (minDiff < MIN_ANGLE_DIFF) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Check rotation constraints (unique + min difference)
 */
export function satisfiesAngleConstraints(rotations: Map<string, number>): boolean {
	return hasUniqueAngles(rotations) && hasMinAngleDifference(rotations);
}
```

- [ ] **Step 7: Write tests for constraint functions**

Add to `src/lib/utils/solver.test.ts`:

```typescript
import { hasUniqueAngles, hasMinAngleDifference, satisfiesAngleConstraints } from './solver';

describe('hasUniqueAngles', () => {
	it('returns true for unique angles', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(hasUniqueAngles(rotations)).toBe(true);
	});

	it('returns false for duplicate angles', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 0],
			['layer-3', 180]
		]);
		expect(hasUniqueAngles(rotations)).toBe(false);
	});
});

describe('hasMinAngleDifference', () => {
	it('returns true when all pairs differ by at least 2 degrees', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(hasMinAngleDifference(rotations)).toBe(true);
	});

	it('returns false when any pair is within 2 degrees', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 1],
			['layer-3', 180]
		]);
		expect(hasMinAngleDifference(rotations)).toBe(false);
	});
});

describe('satisfiesAngleConstraints', () => {
	it('returns true for valid rotations', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(satisfiesAngleConstraints(rotations)).toBe(true);
	});

	it('returns false for duplicates', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 0],
			['layer-3', 180]
		]);
		expect(satisfiesAngleConstraints(rotations)).toBe(false);
	});
});
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test src/lib/utils/solver.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/utils/solver.ts src/lib/utils/solver.test.ts
git commit -m "feat: add angle constraint validation functions"
```

- [ ] **Step 10: Add main solveDoodledial function**

Add to `src/lib/utils/solver.ts`:

```typescript
import { detectOverlaps, detectCutoutGaps } from './overlap-detection';
import type { Layer } from '$lib/types/doodledial';

export interface SolverSolution {
	rotations: Map<string, number>;
	score: number;
	isValid: boolean;
}

export interface SolverProgress {
	bestSolutions: SolverSolution[];
	searchedCount: number;
	isComplete: boolean;
	isAborted: boolean;
}

const GAP_MM = 2;

export async function solveDoodledial(
	layers: Layer[],
	combinedSvg: string,
	dialDiameter: number,
	onProgress: (progress: SolverProgress) => void,
	signal?: AbortSignal
): Promise<SolverSolution[]> {
	const results: SolverSolution[] = [];
	let searchedCount = 0;
	const maxResults = 10;

	function updateProgress(aborted = false) {
		const best = [...results].sort((a, b) => b.score - a.score).slice(0, maxResults);

		onProgress({
			bestSolutions: best,
			searchedCount,
			isComplete: false,
			isAborted: aborted
		});
	}

	async function checkCollision(
		layerArray: Layer[],
		rotations: Map<string, number>,
		dialDiameter: number
	): Promise<boolean> {
		const tempLayers = layerArray.map((l) => ({
			...l,
			rotation: rotations.get(l.id) ?? l.rotation
		}));

		const overlaps = await detectOverlaps(tempLayers, combinedSvg);
		if (overlaps.size > 0) return true;

		const gaps = await detectCutoutGaps(tempLayers, combinedSvg, GAP_MM, dialDiameter);
		if (gaps.size > 0) return true;

		return false;
	}

	async function checkAll(layers: Layer[]): Promise<SolverSolution | null> {
		const layerArray = [...layers].sort((a, b) => a.index - b.index);
		const n = layerArray.length;

		// Generate all rotation combinations (0-359 degrees)
		const totalCombinations = Math.pow(360, n);

		for (let combination = 0; combination < totalCombinations; combination++) {
			if (signal?.aborted) {
				updateProgress(true);
				return null;
			}

			searchedCount = combination + 1;

			// Convert combination number to base-360 digits
			let temp = combination;
			const rotations = new Map<string, number>();
			for (let i = 0; i < n; i++) {
				const angle = temp % 360;
				rotations.set(layerArray[i].id, angle);
				temp = Math.floor(temp / 360);
			}

			// Check angle constraints
			if (!satisfiesAngleConstraints(rotations)) continue;

			// Check collision constraints
			const hasCollision = await checkCollision(layerArray, rotations, dialDiameter);
			if (hasCollision) continue;

			// Calculate score
			const angles = Array.from(rotations.values());
			const score = calculateScore(angles);

			results.push({
				rotations,
				score,
				isValid: true
			});

			// Update progress every 1000 combinations
			if (searchedCount % 1000 === 0) {
				updateProgress();
				// Allow UI to update
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		}

		updateProgress();
		return null;
	}

	await checkAll(layers);

	const sorted = [...results].sort((a, b) => b.score - a.score);
	return sorted.slice(0, maxResults);
}
```

- [ ] **Step 11: Write integration test for solveDoodledial**

Add to `src/lib/utils/solver.test.ts`:

```typescript
import { solveDoodledial } from './solver';
import type { Layer } from '$lib/types/doodledial';

describe('solveDoodledial', () => {
	it('returns solutions for valid input', async () => {
		const layers: Layer[] = [
			{ id: 'layer-1', name: 'Layer 1', index: 1, visible: true, rotation: 0 },
			{ id: 'layer-2', name: 'Layer 2', index: 2, visible: true, rotation: 0 }
		];

		const mockSvg = '<svg></svg>';

		const progress: SolverProgress[] = [];
		const results = await solveDoodledial(layers, mockSvg, 200, (p) => progress.push(p));

		expect(results.length).toBeGreaterThan(0);
		expect(progress.length).toBeGreaterThan(0);
	});

	it('respects abort signal', async () => {
		const layers: Layer[] = [
			{ id: 'layer-1', name: 'Layer 1', index: 1, visible: true, rotation: 0 }
		];

		const mockSvg = '<svg></svg>';
		const abortController = new AbortController();

		setTimeout(() => abortController.abort(), 10);

		const results = await solveDoodledial(layers, mockSvg, 200, () => {}, abortController.signal);

		expect(results).toHaveLength(0);
	});
});
```

- [ ] **Step 12: Run tests**

Run: `pnpm test src/lib/utils/solver.test.ts`
Expected: PASS (or some tests may be skipped due to async complexity)

- [ ] **Step 13: Commit**

```bash
git add src/lib/utils/solver.ts src/lib/utils/solver.test.ts
git commit -m "feat: add solveDoodledial function"
```

---

### Task 2: Create SolverModal component

**Files:**

- Create: `src/lib/components/SolverModal.svelte`

- [ ] **Step 1: Write the SolverModal component**

```svelte
<script lang="ts">
	import type { SolverSolution } from '$lib/utils/solver';

	interface Props {
		solutions: SolverSolution[];
		isOpen: boolean;
		isSearching: boolean;
		searchedCount: number;
		onSelect: (solution: SolverSolution) => void;
		onAbort: () => void;
		onClose: () => void;
	}

	let { solutions, isOpen, isSearching, searchedCount, onSelect, onAbort, onClose }: Props =
		$props();

	function formatRotations(solution: SolverSolution): string {
		const entries = Array.from(solution.rotations.entries())
			.map(([id, angle]) => `${id}: ${angle}°`)
			.join(', ');
		return entries;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
		>
			<div class="p-4 border-b flex items-center justify-between">
				<h2 class="text-lg font-semibold">Solver Results</h2>
				<button onclick={onClose} class="text-gray-500 hover:text-gray-700"> ✕ </button>
			</div>

			<div class="p-4 border-b bg-gray-50">
				{#if isSearching}
					<div class="flex items-center gap-3">
						<div
							class="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"
						></div>
						<span>Searching... {searchedCount.toLocaleString()} combinations checked</span>
					</div>
				{:else if solutions.length === 0}
					<span class="text-red-600">No valid solutions found</span>
				{:else}
					<span class="text-green-600">Found {solutions.length} solutions</span>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto p-4">
				{#if solutions.length === 0 && !isSearching}
					<p class="text-gray-500 text-center py-8">
						No solutions satisfy all constraints. Try adjusting the layers.
					</p>
				{:else}
					<div class="space-y-3">
						{#each solutions as solution, index}
							<div class="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
								<div class="flex items-center justify-between mb-2">
									<span class="font-medium">Solution {index + 1}</span>
									<div class="flex items-center gap-2">
										<span class="text-sm text-gray-500">
											Score: {(solution.score * 100).toFixed(1)}%
										</span>
										<button
											onclick={() => onSelect(solution)}
											class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
										>
											Apply
										</button>
									</div>
								</div>
								<p class="text-sm text-gray-600 font-mono">{formatRotations(solution)}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="p-4 border-t flex justify-end gap-2">
				{#if isSearching}
					<button onclick={onAbort} class="px-4 py-2 border rounded-lg hover:bg-gray-50">
						Abort
					</button>
				{/if}
				<button onclick={onClose} class="px-4 py-2 border rounded-lg hover:bg-gray-50">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/SolverModal.svelte
git commit -m "feat: add SolverModal component"
```

---

### Task 3: Integrate solver into store

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Add solver state and functions to store**

Add imports:

```typescript
import { solveDoodledial } from '$lib/utils/solver';
import type { SolverSolution, SolverProgress } from '$lib/utils/solver';
```

Add state variables after `cutoutGaps`:

```typescript
let solving = $state<boolean>(false);
let solverProgress = $state<SolverProgress>({
	bestSolutions: [],
	searchedCount: 0,
	isComplete: false,
	isAborted: false
});
let abortController = $state<AbortController | null>(null);
```

Add getters:

```typescript
get solving() {
  return solving;
},
get solverProgress() {
  return solverProgress;
},
```

Add functions:

```typescript
async function runSolver() {
  if (!combinedSvg || layers.size < 2 || solving) return;

  solving = true;
  abortController = new AbortController();
  solverProgress = {
    bestSolutions: [],
    searchedCount: 0,
    isComplete: false,
    isAborted: false
  };

  try {
    const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
    const results = await solveDoodledial(
      layerArray,
      combinedSvg,
      config.diameter,
      (progress) => {
        solverProgress = progress;
      },
      abortController!.signal
    );

    solverProgress = {
      ...solverProgress,
      bestSolutions: results,
      isComplete: true
    };
  } catch (err) {
    console.error('Solver failed:', err);
  } finally {
    solving = false;
    abortController = null;
  }
},

abortSolver() {
  if (abortController) {
    abortController.abort();
  }
},

applySolution(solution: SolverSolution) {
  solution.rotations.forEach((rotation, layerId) => {
    const layer = layers.get(layerId);
    if (layer) {
      layers.set(layerId, { ...layer, rotation });
    }
  });
  abortSolver();
  runOverlapDetection();
  runCutoutGapDetection();
},
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: integrate solver into doodledial store"
```

---

### Task 4: Add Solve button and modal to UI

**Files:**

- Modify: `src/lib/components/ExportButton.svelte`

- [ ] **Step 1: Add Solve button next to Export**

Add after the Export button:

```svelte
<button
	onclick={() => doodledialStore.runSolver()}
	disabled={!doodledialStore.svgContent || doodledialStore.solving}
	class="group relative px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-gray-300 disabled:cursor-not-allowed enabled:hover:bg-emerald-700 enabled:hover:shadow-lg enabled:hover:shadow-emerald-200 enabled:active:scale-95 enabled:shadow-md enabled:shadow-emerald-100"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fill-rule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
			clip-rule="evenodd"
		/>
	</svg>
	<span>Solve</span>
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/ExportButton.svelte
git commit -m "feat: add Solve button"
```

- [ ] **Step 3: Add SolverModal to main page**

Modify `src/routes/+page.svelte` to include the modal:

Add import:

```typescript
import SolverModal from '$lib/components/SolverModal.svelte';
```

Add component after ExportButton:

```svelte
<SolverModal
	solutions={doodledialStore.solverProgress.bestSolutions}
	isOpen={doodledialStore.solving || doodledialStore.solverProgress.isComplete}
	isSearching={doodledialStore.solving}
	searchedCount={doodledialStore.solverProgress.searchedCount}
	onSelect={(solution) => {
		doodledialStore.applySolution(solution);
	}}
	onAbort={() => doodledialStore.abortSolver()}
	onClose={() => doodledialStore.abortSolver()}
/>
```

- [ ] **Step 4: Run check and lint**

Run: `pnpm check && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add SolverModal to main page"
```

---

### Task 5: Final verification

**Files:**

- Test manually in browser

- [ ] **Step 1: Run the app and test**

Run: `pnpm dev`

- [ ] **Step 2: Upload an SVG with 2+ layers**

- [ ] **Step 3: Click Solve button**

- [ ] **Step 4: Verify modal shows solutions**

- [ ] **Step 5: Apply a solution**

- [ ] **Step 6: Commit final changes**

```bash
git add .
git commit -m "feat: complete doodledial solver feature"
```
