# Optimal Layout Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a force-directed optimal layout solver for doodledials that arranges SVG layers to eliminate overlap, maintain minimum 2mm gaps, ensure unique rotations, and maintain minimum 2-degree angular separation by adjusting only rotation values.

**Architecture:** Force-directed algorithm treating layers as objects with repulsive/attractive forces based on overlap and gap violations of .cutout paths only. Iteratively adjusts layer rotations toward equilibrium while enforcing constraints through penalty functions. Uses existing overlap detection utilities for accurate geometric calculations.

**Tech Stack:** TypeScript, SVG.js for rendering, existing overlap-detection utilities, Vitest for testing

---

### Task 1: Create solver data structures and types

**Files:**

- Create: `src/lib/utils/layout-solver-types.ts`

- [ ] **Step 1: Define SolverLayer and SolverState interfaces**

```typescript
export interface SolverLayer {
	id: string;
	name: string;
	index: number;
	visible: boolean;
	rotation: number; // in degrees
	// Calculated properties for .cutout paths only
	boundingBox: { x1: number; y1: number; x2: number; y2: number };
	center: { x: number; y: number };
	velocity: number; // rotation velocity
}

export interface SolverState {
	layers: SolverLayer[];
	dialConfig: DialConfig;
	svgContent: SVGContent;
	iteration: number;
	totalForce: number;
	converged: boolean;
}
```

- [ ] **Step 2: Commit the type definitions**

```bash
git add src/lib/utils/layout-solver-types.ts
git commit -m "feat(layout-solver): add solver data structures (.cutout paths only)"
```

### Task 2: Implement force calculation functions

**Files:**

- Create: `src/lib/utils/layout-solver-forces.ts`

- [ ] **Step 1: Implement overlap/gap based force calculation for .cutout paths**

```typescript
import { SolverLayer } from './layout-solver-types';
import { detectOverlaps } from './overlap-detection';
import type { Layer } from '$lib/types/doodledial';
import type { SVGContent } from '$lib/types/doodledial';

const MM_TO_PX = 3.77952755906; // pixels per mm at 96 DPI
const MIN_GAP_MM = 2;
const MIN_ANGLE_SEPARATION_DEG = 2;

export function calculateForces(
	layers: SolverLayer[],
	svgContent: SVGContent
): { forces: number[]; totalForce: number } {
	const forces = new Array(layers.length).fill(0);
	let totalForce = 0;

	// TODO: Implement actual force calculation using overlap detection on .cutout paths only

	return { forces, totalForce };
}
```

- [ ] **Step 2: Commit the force calculation skeleton**

```bash
git add src/lib/utils/layout-solver-forces.ts
git commit -m "feat(layout-solver): add force calculation skeleton (.cutout paths only)"
```

### Task 3: Implement constraint enforcement functions

**Files:**

- Create: `src/lib/utils/layout-solver-constraints.ts`

- [ ] **Step 1: Implement rotation constraint enforcement**

```typescript
import { SolverLayer } from './layout-solver-types';

export function applyConstraints(layers: SolverLayer[]): void {
	// Normalize rotations to [0, 360)
	for (const layer of layers) {
		layer.rotation = ((layer.rotation % 360) + 360) % 360;
	}

	// TODO: Implement uniqueness and minimum separation constraints
	// Only considering .cutout paths for overlap/gap calculations
}
```

- [ ] **Step 2: Commit the constraint enforcement skeleton**

```bash
git add src/lib/utils/layout-solver-constraints.ts
git commit -m "feat(layout-solver): add constraint enforcement skeleton"
```

### Task 4: Implement main solver algorithm

**Files:**

- Create: `src/lib/utils/layout-solver.ts`

- [ ] **Step 1: Implement the main solveOptimalLayout function**

```typescript
import { SolverLayer } from './layout-solver-types';
import { calculateForces } from './layout-solver-forces';
import { applyConstraints } from './layout-solver-constraints';
import type { Layer } from '$lib/types/doodledial';
import type { DialConfig } from '$lib/types/doodledial';
import type { SVGContent } from '$lib/types/doodledial';

const MAX_ITERATIONS = 1000;
const CONVERGENCE_THRESHOLD = 0.01;
const DAMPING_FACTOR = 0.9;
const TIMESTEP = 0.1;

export async function solveOptimalLayout(
	layers: Layer[],
	config: DialConfig,
	svgContent: SVGContent
): Promise<Layer[]> {
	// Convert to solver layers (focusing on .cutout paths only)
	const solverLayers: SolverLayer[] = layers.map((layer) => ({
		...layer,
		velocity: 0,
		boundingBox: { x1: 0, y1: 0, x2: 0, y2: 0 }, // Will be calculated from .cutout paths
		center: { x: 0, y: 0 }
	}));

	// TODO: Implement main solver loop

	// Return original layers for now
	return layers;
}
```

- [ ] **Step 2: Commit the main solver skeleton**

```bash
git add src/lib/utils/layout-solver.ts
git commit -m "feat(layout-solver): add main solver skeleton (.cutout paths only)"
```

### Task 5: Implement bitmap rendering for force calculation

**Files:**

- Modify: `src/lib/utils/overlap-detection.ts`
- Create: `src/lib/utils/layout-solver-rendering.ts`

- [ ] **Step 1: Extract bitmap rendering functions for reuse (focusing on .cutout paths)**

```typescript
// Extract from overlap-detection.ts to make reusable
// Ensure rendering only considers .cutout paths for overlap detection
```

- [ ] **Step 2: Commit rendering extraction**

```bash
git add src/lib/utils/overlap-detection.ts src/lib/utils/layout-solver-rendering.ts
git commit -m "feat(layout-solver): extract bitmap rendering utilities (.cutout paths only)"
```

### Task 6: Complete force calculation implementation

**Files:**

- Modify: `src/lib/utils/layout-solver-forces.ts`
- Modify: `src/lib/utils/layout-solver-rendering.ts`

- [ ] **Step 1: Implement actual force calculation using bitmap overlap (.cutout paths only)**

```typescript
// Implement the real force calculation
// Only consider .cutout paths when calculating overlap/gap
```

- [ ] **Step 2: Commit force calculation implementation**

```bash
git add src/lib/utils/layout-solver-forces.ts src/lib/utils/layout-solver-rendering.ts
git commit -m "feat(layout-solver): implement force calculation (.cutout paths only)"
```

### Task 7: Complete constraint enforcement

**Files:**

- Modify: `src/lib/utils/layout-solver-constraints.ts`

- [ ] **Step 1: Implement rotation uniqueness and minimum separation**

```typescript
// Implement constraint enforcement for unique rotations and min separation
// Based on .cutout path overlap/gap calculations
```

- [ ] **Step 2: Commit constraint enforcement implementation**

```bash
git add src/lib/utils/layout-solver-constraints.ts
git commit -m "feat(layout-solver): implement constraint enforcement"
```

### Task 8: Complete main solver loop

**Files:**

- Modify: `src/lib/utils/layout-solver.ts`

- [ ] **Step 1: Implement the iterative solver loop**

```typescript
// Implement the main solver loop with convergence detection
// Processing .cutout paths only for force calculations
```

- [ ] **Step 2: Commit main solver implementation**

```bash
git add src/lib/utils/layout-solver.ts
git commit -m "feat(layout-solver): implement main solver loop (.cutout paths only)"
```

### Task 9: Add solver to public API

**Files:**

- Modify: `src/lib/utils/index.ts`

- [ ] **Step 1: Export the solveOptimalLayout function**

```typescript
export { solveOptimalLayout } from './layout-solver';
```

- [ ] **Step 2: Commit API export**

```bash
git add src/lib/utils/index.ts
git commit -m "feat(layout-solver): export solver function"
```

### Task 10: Create solver integration in UI

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`
- Create: `src/lib/components/SolverControls.svelte` (optional)

- [ ] **Step 1: Add solver invocation to doodledial store**

```typescript
// Add method to trigger layout solving
// Working with .cutout paths only
```

- [ ] **Step 2: Commit UI integration**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat(layout-solver): add solver integration to store"
```

### Task 11: Write unit tests for solver

**Files:**

- Create: `tests/lib/utils/layout-solver.spec.ts`

- [ ] **Step 1: Write tests for force calculations**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateForces } from '$lib/utils/layout-solver-forces';

describe('layout solver forces', () => {
	it('calculates repulsive forces for overlapping .cutout paths', () => {
		// TODO: Implement test
	});
});
```

- [ ] **Step 2: Commit initial tests**

```bash
git add tests/lib/utils/layout-solver.spec.ts
git commit -m "feat(layout-solver): add unit tests (.cutout paths focus)"
```

### Task 12: Write integration tests for solver

**Files:**

- Create: `tests/lib/utils/layout-solver-integration.spec.ts`

- [ ] **Step 1: Write tests for full solver algorithm**

```typescript
import { describe, it, expect } from 'vitest';
import { solveOptimalLayout } from '$lib/utils/layout-solver';

describe('layout solver integration', () => {
	it('resolves simple overlap case with .cutout paths', async () => {
		// TODO: Implement test
	});
});
```

- [ ] **Step 2: Commit integration tests**

```bash
git add tests/lib/utils/layout-solver-integration.spec.ts
git commit -m "feat(layout-solver): add integration tests"
```

### Task 13: Run tests and verify solver works

**Files:**

- Modify: Various test files

- [ ] **Step 1: Run all solver tests**

```bash
pnpm test -- tests/lib/utils/layout-solver*.spec.ts
```

- [ ] **Step 2: Fix any failing tests**

```bash
# Implement fixes as needed
```

- [ ] **Step 3: Commit test fixes**

```bash
git add .
git commit -m "fix(layout-solver): adjust implementation to pass tests"
```

### Task 14: Final verification and documentation

**Files:**

- Modify: `docs/superpowers/specs/2026-04-26-optimal-layout-solver-design.md` (if needed)
- Create: `docs/superpowers/plans/2026-04-26-optimal-layout-solver.md` (this file)

- [ ] **Step 1: Verify implementation matches design**

```bash
# Review implementation against design doc
# Focus on .cutout path processing only
```

- [ ] **Step 2: Commit final implementation**

```bash
git add .
git commit -m "feat(layout-solver): complete optimal layout solver implementation (.cutout paths only)"
```
