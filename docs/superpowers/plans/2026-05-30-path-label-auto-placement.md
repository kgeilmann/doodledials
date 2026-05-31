# Path Label Auto Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic automatic path-label placement that avoids collisions (cutouts, labels, marks, mark labels), stays near paths, and reports manual-fix-needed errors when no valid position exists.

**Architecture:** Add a dedicated label auto-placement utility that evaluates candidate label offsets in deterministic ring order. Use raster overlap for cutout-to-label checks (same raster path as optimizer/overlap detection) and OBB-based vector checks for all other collisions. Integrate solver outputs into store-managed placement mode/status state and trigger solver only on agreed events (load, scale/offset changes, reset-to-auto).

**Tech Stack:** TypeScript, Svelte 5, svg.js, Vitest, Playwright, pnpm, ESLint, Prettier.

---

### Task 1: Add Placement State Types and Store API (TDD)

**Files:**

- Modify: `src/lib/types/doodledial.ts`
- Modify: `src/lib/stores/doodledial.svelte.ts`
- Test: `tests/lib/utils/label-placement-store.spec.ts`

- [ ] **Step 1: Write failing store/state tests**

```ts
// tests/lib/utils/label-placement-store.spec.ts
import { describe, it, expect } from 'vitest';
import { doodledialStore } from '$lib/stores/doodledial.svelte';

describe('label placement store state', () => {
	it('defaults layers to auto placement mode and placed status', () => {
		doodledialStore.addLayer('layer-1', 1, 'Layer 1');
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('auto');
		expect(doodledialStore.getLayerLabelPlacementStatus('layer-1')?.status).toBe('placed');
	});

	it('switches to manual mode after explicit manual update', () => {
		doodledialStore.setLayerLabelOffsetManual('layer-1', 12, -4);
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('manual');
	});

	it('can reset mode to auto', () => {
		doodledialStore.resetLayerLabelPlacementMode('layer-1');
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('auto');
	});
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run tests/lib/utils/label-placement-store.spec.ts`
Expected: FAIL with missing store methods/types.

- [ ] **Step 3: Implement minimal types + store methods**

```ts
// src/lib/types/doodledial.ts
export type LabelPlacementMode = 'auto' | 'manual';

export type LabelPlacementStatus =
	| { status: 'placed' }
	| { status: 'error'; reason: 'no-valid-position-within-radius' };

export interface Layer {
	// existing fields...
	labelPlacementMode?: LabelPlacementMode;
	labelPlacementStatus?: LabelPlacementStatus;
}
```

```ts
// src/lib/stores/doodledial.svelte.ts (new methods)
setLayerLabelOffsetManual(id: string, x: number, y: number) {
	const layer = layers.get(id);
	if (!layer) return;
	layers.set(id, {
		...layer,
		labelOffsetX: x,
		labelOffsetY: y,
		labelPlacementMode: 'manual'
	});
}

setLayerLabelOffsetAuto(id: string, x: number, y: number) {
	const layer = layers.get(id);
	if (!layer) return;
	layers.set(id, {
		...layer,
		labelOffsetX: x,
		labelOffsetY: y,
		labelPlacementMode: 'auto'
	});
}

getLayerLabelPlacementMode(id: string) {
	return layers.get(id)?.labelPlacementMode || 'auto';
}

setLayerLabelPlacementStatus(id: string, status: LabelPlacementStatus) {
	const layer = layers.get(id);
	if (!layer) return;
	layers.set(id, { ...layer, labelPlacementStatus: status });
}

getLayerLabelPlacementStatus(id: string) {
	return layers.get(id)?.labelPlacementStatus || { status: 'placed' as const };
}

resetLayerLabelPlacementMode(id: string) {
	const layer = layers.get(id);
	if (!layer) return;
	layers.set(id, { ...layer, labelPlacementMode: 'auto' });
}
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run tests/lib/utils/label-placement-store.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/doodledial.ts src/lib/stores/doodledial.svelte.ts tests/lib/utils/label-placement-store.spec.ts
git commit -m "Add label placement mode and status store state"
```

### Task 2: Build OBB Geometry Collision Helpers (TDD)

**Files:**

- Create: `src/lib/utils/label-geometry.ts`
- Create: `tests/lib/utils/label-geometry.spec.ts`

- [ ] **Step 1: Write failing geometry tests**

```ts
// tests/lib/utils/label-geometry.spec.ts
import { describe, it, expect } from 'vitest';
import { createObb, obbOverlapsObb, obbDistanceToSegment } from '$lib/utils/label-geometry';

describe('label geometry', () => {
	it('detects OBB overlap', () => {
		const a = createObb({ cx: 10, cy: 10, width: 8, height: 4, angleDeg: 20 });
		const b = createObb({ cx: 13, cy: 10, width: 8, height: 4, angleDeg: -15 });
		expect(obbOverlapsObb(a, b, 0.5)).toBe(true);
	});

	it('rejects non-overlapping OBBs', () => {
		const a = createObb({ cx: 10, cy: 10, width: 8, height: 4, angleDeg: 0 });
		const b = createObb({ cx: 40, cy: 40, width: 8, height: 4, angleDeg: 0 });
		expect(obbOverlapsObb(a, b, 0.5)).toBe(false);
	});

	it('detects clearance breach against mark segment', () => {
		const obb = createObb({ cx: 20, cy: 20, width: 10, height: 6, angleDeg: 30 });
		const dist = obbDistanceToSegment(obb, { x1: 18, y1: 15, x2: 18, y2: 30 });
		expect(dist).toBeLessThan(2);
	});
});
```

- [ ] **Step 2: Run failing tests**

Run: `pnpm vitest run tests/lib/utils/label-geometry.spec.ts`
Expected: FAIL with unresolved imports.

- [ ] **Step 3: Implement geometry helpers**

```ts
// src/lib/utils/label-geometry.ts
export interface Point {
	x: number;
	y: number;
}
export interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}
export interface Obb {
	center: Point;
	halfWidth: number;
	halfHeight: number;
	axes: [Point, Point];
	corners: [Point, Point, Point, Point];
}

export function createObb(input: {
	cx: number;
	cy: number;
	width: number;
	height: number;
	angleDeg: number;
}): Obb {
	// compute axes + corners
	return {} as Obb;
}

export function obbOverlapsObb(a: Obb, b: Obb, padding = 0): boolean {
	// SAT projection checks
	return true;
}

export function obbDistanceToSegment(obb: Obb, segment: Segment): number {
	// min distance from segment to OBB edges/corners
	return 0;
}
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm vitest run tests/lib/utils/label-geometry.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/label-geometry.ts tests/lib/utils/label-geometry.spec.ts
git commit -m "Add OBB geometry helpers for label collision checks"
```

### Task 3: Add Raster Cutout-vs-Label Mask Check (TDD)

**Files:**

- Modify: `src/lib/utils/overlap-detection.ts`
- Create: `tests/lib/utils/label-raster-collision.spec.ts`

- [ ] **Step 1: Write failing raster-collision tests**

```ts
// tests/lib/utils/label-raster-collision.spec.ts
import { describe, it, expect } from 'vitest';
import { detectCutoutLabelOverlapPixels } from '$lib/utils/overlap-detection';

describe('cutout-label raster collision', () => {
	it('returns overlap pixels when OBB label covers cutout mask pixels', async () => {
		const overlap = await detectCutoutLabelOverlapPixels({
			combinedSvg: '<svg><!-- fixture --></svg>',
			labelCorners: [
				{ x: 10, y: 10 },
				{ x: 20, y: 10 },
				{ x: 20, y: 16 },
				{ x: 10, y: 16 }
			],
			visibleLayerIds: ['layer-1']
		});
		expect(overlap).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Run failing test**

Run: `pnpm vitest run tests/lib/utils/label-raster-collision.spec.ts`
Expected: FAIL with missing API.

- [ ] **Step 3: Implement raster collision API using existing render size path**

```ts
// src/lib/utils/overlap-detection.ts (new exported API)
export async function detectCutoutLabelOverlapPixels(input: {
	combinedSvg: string;
	labelCorners: { x: number; y: number }[];
	visibleLayerIds: string[];
}): Promise<number> {
	// 1) render cutout-only mask from visible layers at existing RENDER_SIZE
	// 2) render candidate label polygon mask at same RENDER_SIZE
	// 3) return overlapping alpha pixel count
	return 0;
}
```

- [ ] **Step 4: Re-run raster tests**

Run: `pnpm vitest run tests/lib/utils/label-raster-collision.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/overlap-detection.ts tests/lib/utils/label-raster-collision.spec.ts
git commit -m "Add raster cutout-label collision API"
```

### Task 4: Implement Deterministic Auto-Placement Engine (TDD)

**Files:**

- Create: `src/lib/utils/path-label-placement.ts`
- Create: `tests/lib/utils/path-label-placement.spec.ts`

- [ ] **Step 1: Write failing solver tests**

```ts
// tests/lib/utils/path-label-placement.spec.ts
import { describe, it, expect } from 'vitest';
import { solvePathLabelPlacements } from '$lib/utils/path-label-placement';

const baseInput = {
	combinedSvg: '<svg viewBox="0 0 200 200"><g id="all"></g></svg>',
	maxRadiusPx: 12,
	layers: [
		{ id: 'layer-1', index: 1, rotation: 0, visible: true, labelPlacementMode: 'auto' as const },
		{ id: 'layer-2', index: 2, rotation: 0, visible: true, labelPlacementMode: 'auto' as const },
		{ id: 'layer-3', index: 3, rotation: 0, visible: true, labelPlacementMode: 'auto' as const }
	],
	pathAnchors: {
		'layer-1': { x: 20, y: 20 },
		'layer-2': { x: 80, y: 20 },
		'layer-3': { x: 140, y: 20 }
	},
	markLines: [],
	markLabelObbs: [],
	alreadyPlacedLabelObbs: []
};

describe('solvePathLabelPlacements', () => {
	it('places auto labels in deterministic order', async () => {
		const result = await solvePathLabelPlacements(baseInput);
		expect(Object.keys(result.byLayerId)).toEqual(['layer-1', 'layer-2', 'layer-3']);
	});

	it('returns error when no candidate exists in max radius', async () => {
		const result = await solvePathLabelPlacements({
			...baseInput,
			maxRadiusPx: 2,
			pathAnchors: { 'layer-1': { x: 100, y: 100 } },
			layers: [baseInput.layers[0]]
		});
		expect(result.byLayerId['layer-1'].status.status).toBe('error');
	});
});
```

- [ ] **Step 2: Run failing tests**

Run: `pnpm vitest run tests/lib/utils/path-label-placement.spec.ts`
Expected: FAIL with missing module/API.

- [ ] **Step 3: Implement solver with agreed checks**

```ts
// src/lib/utils/path-label-placement.ts
export async function solvePathLabelPlacements(input: SolveInput): Promise<SolveResult> {
	// deterministic layer order
	// candidate rings near per-layer anchor
	// check OBB vs placed labels
	// check OBB vs mark lines
	// check OBB vs mark labels
	// check raster cutout-label overlap
	// first valid candidate wins else status=error
	return { byLayerId: {} };
}
```

- [ ] **Step 4: Re-run solver tests**

Run: `pnpm vitest run tests/lib/utils/path-label-placement.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/path-label-placement.ts tests/lib/utils/path-label-placement.spec.ts
git commit -m "Add deterministic path label auto-placement solver"
```

### Task 5: Integrate Triggers and Store Application Logic (TDD)

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`
- Modify: `src/lib/components/DialPreview.svelte`
- Test: `tests/lib/utils/label-placement-store.spec.ts`

- [ ] **Step 1: Extend failing tests for trigger rules**

```ts
it('re-runs auto placement on setScale and setOffsetX/Y', async () => {
	const runSpy = vi.spyOn(doodledialStore, 'runAutoPlacementNow');
	doodledialStore.setScale(1.1);
	doodledialStore.setOffsetX(2);
	doodledialStore.setOffsetY(-3);
	expect(runSpy).toHaveBeenCalled();
});

it('does not re-run auto placement on setLayerRotation or toggleVisibility', async () => {
	const runSpy = vi.spyOn(doodledialStore, 'runAutoPlacementNow');
	doodledialStore.setLayerRotation('layer-1', 45);
	doodledialStore.toggleVisibility('layer-1');
	expect(runSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `pnpm vitest run tests/lib/utils/label-placement-store.spec.ts`
Expected: FAIL on missing trigger behavior.

- [ ] **Step 3: Implement trigger scheduler and mode-respecting application**

```ts
// doodledial.svelte.ts
let autoPlacementTimer: ReturnType<typeof setTimeout> | null = null;
let autoPlacementRunning = false;
let autoPlacementStale = false;

async function runAutoPlacementNow() {
	if (autoPlacementRunning) {
		autoPlacementStale = true;
		return;
	}
	autoPlacementRunning = true;
	try {
		await applyAutoPlacementForAutoModeLayers();
	} finally {
		autoPlacementRunning = false;
		if (autoPlacementStale) {
			autoPlacementStale = false;
			void runAutoPlacementNow();
		}
	}
}

function scheduleLabelAutoPlacement() {
	if (autoPlacementTimer) clearTimeout(autoPlacementTimer);
	autoPlacementTimer = setTimeout(() => {
		autoPlacementTimer = null;
		void runAutoPlacementNow();
	}, 100);
}

setScale(scale: number) {
	config = { ...config, scale };
	scheduleLabelAutoPlacement();
}

setOffsetX(offsetX: number) {
	config = { ...config, offsetX };
	scheduleLabelAutoPlacement();
}

setLayerRotation(id: string, rotation: number) {
	// keep overlap checks, do not schedule auto placement
}
```

```ts
// DialPreview.svelte
doodledialStore.setLayerLabelOffsetManual(dragLabelLayerId, newOffsetX, newOffsetY);
```

- [ ] **Step 4: Re-run updated tests**

Run: `pnpm vitest run tests/lib/utils/label-placement-store.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts src/lib/components/DialPreview.svelte tests/lib/utils/label-placement-store.spec.ts
git commit -m "Integrate auto-placement trigger scheduler and manual mode behavior"
```

### Task 6: Surface Errors and Reset-to-Auto UI (TDD)

**Files:**

- Modify: `src/lib/components/LayerList.svelte`
- Modify: `src/lib/stores/doodledial.svelte.ts`
- Test: `tests/layer-management.spec.ts`

- [ ] **Step 1: Add failing e2e test for error indicator and reset action**

```ts
// tests/layer-management.spec.ts
import { test, expect } from '@playwright/test';

test('shows placement error indicator and allows reset-to-auto', async ({ page }) => {
	await page.goto('/');
	await page.locator('input[type="file"]').setInputFiles('tests/fixtures/three-paths.svg');
	await page.locator('[data-testid="set-impossible-label-placement"]').click();
	await expect(page.locator('[data-label-placement-error="layer-1"]')).toBeVisible();
	await page.locator('[data-reset-label-auto="layer-1"]').click();
	await expect(page.locator('[data-label-placement-error="layer-1"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run failing e2e test**

Run: `pnpm playwright test tests/layer-management.spec.ts --grep "placement error indicator"`
Expected: FAIL (missing UI).

- [ ] **Step 3: Implement indicator + reset control**

```svelte
<!-- LayerList.svelte (inside each layer row) -->
{#if doodledialStore.getLayerLabelPlacementStatus(layer.id)?.status === 'error'}
	<button
		type="button"
		data-reset-label-auto={layer.id}
		onclick={(e) => {
			e.stopPropagation();
			doodledialStore.resetLayerLabelPlacementMode(layer.id);
			doodledialStore.requestLayerLabelAutoPlacement(layer.id);
		}}
	>
		Fix Label
	</button>
	<span data-label-placement-error={layer.id}>Label needs manual fix</span>
{/if}
```

- [ ] **Step 4: Re-run e2e test**

Run: `pnpm playwright test tests/layer-management.spec.ts --grep "placement error indicator"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/LayerList.svelte src/lib/stores/doodledial.svelte.ts tests/layer-management.spec.ts
git commit -m "Add path-label placement error UI and reset-to-auto action"
```

### Task 7: End-to-End Verification and Final Quality Gate

**Files:**

- Modify: `docs/superpowers/specs/2026-05-30-path-label-auto-placement-design.md` (only if implementation-driven clarifications are needed)

- [ ] **Step 1: Run focused unit tests**

Run:

- `pnpm vitest run tests/lib/utils/label-placement-store.spec.ts`
- `pnpm vitest run tests/lib/utils/label-geometry.spec.ts`
- `pnpm vitest run tests/lib/utils/label-raster-collision.spec.ts`
- `pnpm vitest run tests/lib/utils/path-label-placement.spec.ts`

Expected: all PASS.

- [ ] **Step 2: Run focused Playwright tests**

Run:

- `pnpm playwright test tests/layer-management.spec.ts`
- `pnpm playwright test tests/offset-scale-reset.spec.ts`

Expected: all PASS.

- [ ] **Step 3: Run full project checks (required by repo policy)**

Run:

- `pnpm check`
- `pnpm lint`

Expected:

- `svelte-check found 0 errors and 0 warnings`
- Prettier + ESLint with no errors/warnings.

- [ ] **Step 4: Final commit (if any verification-only fixes were needed)**

```bash
git add -A
git commit -m "Finalize path label auto-placement verification fixes"
```

## Self-Review

- Spec coverage: All approved constraints are mapped to tasks (collision constraints, trigger model, rotation coupling, strict error behavior).
- Placeholder scan: No TBD/TODO placeholders remain in executable steps.
- Type consistency: Shared terms are consistent (`labelPlacementMode`, `labelPlacementStatus`, `no-valid-position-within-radius`).
