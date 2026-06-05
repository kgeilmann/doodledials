# Diversity-Guided Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the brute-force optimizer produce structurally diverse top-12 results instead of near-identical solutions.

**Architecture:** Three small components on the existing DFS: (A) `layoutDistance` metric, (B) diversity-aware `addToTopLayouts` that replaces redundant layouts, (C) seeded-shuffle of angle exploration order to reach different search regions.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add `layoutDistance` function

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Write tests**

Add this block before the existing `describe('runBruteforceOptimizer', ...)`:

```typescript
import { layoutDistance } from './run-bruteforce-optimizer';

describe('layoutDistance', () => {
	it('returns 0 for identical layouts', () => {
		const a = { layerA: 0, layerB: 90, layerC: 180 };
		expect(layoutDistance(a, a)).toBe(0);
	});

	it('returns 1 when all layers are in different bins', () => {
		// 12 bins of 30° each
		const a = { layerA: 0, layerB: 30 }; // bins 0, 1
		const b = { layerA: 180, layerB: 210 }; // bins 6, 7
		expect(layoutDistance(a, b)).toBe(0);
	});

	it('returns 0.5 when half the layers share bins', () => {
		const a = { layerA: 0, layerB: 90, layerC: 180, layerD: 270 };
		const b = { layerA: 5, layerB: 180, layerC: 185, layerD: 270 };
		// layerA: bins 0,0 → same; layerB: 3,6 → diff; layerC: 6,6 → same; layerD: 9,9 → same
		// 3/4 same bins → similarity = 1 - 0.75 = 0.25
		expect(layoutDistance(a, b)).toBeCloseTo(0.25);
	});

	it('handles single-layer layouts', () => {
		const a = { layerA: 0 };
		const b = { layerA: 45 };
		expect(layoutDistance(a, b)).toBe(0); // same bin 0
	});

	it('is symmetric', () => {
		const a = { layerA: 10, layerB: 100 };
		const b = { layerA: 50, layerB: 200 };
		expect(layoutDistance(a, b)).toBe(layoutDistance(b, a));
	});

	it('normalizes angles before binning', () => {
		const a = { layerA: 0 };
		const b = { layerA: 360 };
		expect(layoutDistance(a, b)).toBe(0); // same bin
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(layoutDistance|FAIL|PASS)'
```

Expected: FAIL — `layoutDistance` is not exported

- [ ] **Step 3: Write minimal implementation**

After `serializeLayout` (line 126), add:

```typescript
const SIMILARITY_BINS = 12;

export function layoutDistance(a: Record<string, number>, b: Record<string, number>): number {
	if (Object.keys(a).length === 0 && Object.keys(b).length === 0) return 0;
	const allLayerIds = new Set([...Object.keys(a), ...Object.keys(b)]);

	const bin = (angle: number) => Math.floor(normalizeAngle(angle) / (360 / SIMILARITY_BINS));

	let sameBinCount = 0;
	for (const layerId of allLayerIds) {
		if (bin(a[layerId] ?? 0) === bin(b[layerId] ?? 0)) {
			sameBinCount += 1;
		}
	}

	return 1 - sameBinCount / allLayerIds.size;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(layoutDistance|FAIL|PASS)'
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add layoutDistance metric for comparing layouts"
```

---

### Task 2: Add seeded shuffle utility

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Write tests**

In the spec file, add after the `layoutDistance` block:

```typescript
import { seededShuffle } from './run-bruteforce-optimizer';

describe('seededShuffle', () => {
	it('returns all elements', () => {
		const input = [1, 2, 3, 4, 5];
		const result = seededShuffle(input, 42);
		expect(result.sort()).toEqual(input.sort());
	});

	it('is deterministic for same seed', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(seededShuffle(input, 12345)).toEqual(seededShuffle(input, 12345));
	});

	it('produces different order for different seeds', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(seededShuffle(input, 12345)).not.toEqual(seededShuffle(input, 67890));
	});

	it('does not mutate the input array', () => {
		const input = [1, 2, 3, 4, 5];
		const copy = [...input];
		seededShuffle(input, 42);
		expect(input).toEqual(copy);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(seededShuffle|FAIL|PASS)'
```

Expected: FAIL — not exported

- [ ] **Step 3: Write implementation**

After `layoutDistance`, add:

```typescript
export function seededShuffle<T>(array: T[], seed: number): T[] {
	const result = [...array];
	let state = seed | 0;
	for (let i = result.length - 1; i > 0; i--) {
		state = (Math.imul(state, 1103515245) + 12345) | 0;
		const j = ((state >>> 16) & 0x7fff) % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(seededShuffle|FAIL|PASS)'
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add seededShuffle utility for deterministic random ordering"
```

---

### Task 3: Modify `addToTopLayouts` for diversity-aware selection

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Write tests**

Replace the current `describe('addToTopLayouts', ...)` block (starts at line 217) with:

```typescript
describe('addToTopLayouts', () => {
	it('adds a layout when under the limit', () => {
		const layouts: Record<string, number>[] = [];
		const candidate = { a: 0, b: 90, c: 180 };
		const result = addToTopLayouts(candidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(1);
		expect(layouts[0]).toEqual(candidate);
	});

	it('adds up to MAX_TOP_LAYOUTS layouts', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			const candidate = { a: 0, b: i * 30, c: (i * 30 + 120) % 360 };
			expect(addToTopLayouts(candidate, layouts)).toBe(true);
		}
		expect(layouts).toHaveLength(12);
	});

	it('replaces the worst layout by quality when candidate is better', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		const betterCandidate = { a: 0, b: 15, c: 195 }; // min gap 45
		const result = addToTopLayouts(betterCandidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(betterCandidate);
	});

	it('replaces a redundant layout when candidate is novel and quality is close', () => {
		const layouts: Record<string, number>[] = [];
		// 12 layouts with min gap 30, all similar (b and c advance by 30 each step)
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		// Novel candidate with same min gap (30) but very different structure
		const novelCandidate = { a: 0, b: 179, c: 299 };
		const result = addToTopLayouts(novelCandidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(novelCandidate);
	});

	it('never exceeds MAX_TOP_LAYOUTS', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		addToTopLayouts({ a: 0, b: 45, c: 165 }, layouts);
		addToTopLayouts({ a: 0, b: 90, c: 210 }, layouts);
		expect(layouts.length).toBe(12);
	});

	it('does not mutate the input candidate', () => {
		const layouts: Record<string, number>[] = [];
		const candidate = { a: 0, b: 90, c: 180 };
		addToTopLayouts(candidate, layouts);
		layouts[0].b = 999;
		expect(candidate.b).toBe(90);
	});
});
```

- [ ] **Step 2: Run test to verify diversity tests fail**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(replaces a redundant|FAIL|PASS)'
```

Expected: FAIL — the "replaces a redundant layout when candidate is novel" test should fail

- [ ] **Step 3: Implement diversity-aware `addToTopLayouts`**

Replace the entire `addToTopLayouts` function (lines 15-37) and add a helper:

```typescript
function minSimilarityToOthers(
	layout: Record<string, number>,
	layouts: Record<string, number>[]
): number {
	let minSim = 1;
	for (const other of layouts) {
		if (other === layout) continue;
		const sim = layoutDistance(layout, other);
		if (sim < minSim) minSim = sim;
	}
	return minSim;
}

export function addToTopLayouts(
	candidate: Record<string, number>,
	topLayouts: Record<string, number>[]
): boolean {
	if (topLayouts.length < MAX_TOP_LAYOUTS) {
		topLayouts.push({ ...candidate });
		return true;
	}

	// Phase 1: Quality-based replacement (existing behavior)
	let worstIndex = 0;
	for (let i = 1; i < topLayouts.length; i++) {
		if (!isBetterLayout(topLayouts[i], topLayouts[worstIndex])) {
			worstIndex = i;
		}
	}

	if (isBetterLayout(candidate, topLayouts[worstIndex])) {
		topLayouts[worstIndex] = { ...candidate };
		return true;
	}

	// Phase 2: Diversity-based replacement
	// Find the existing layout most similar to the candidate.
	// If candidate has >= min gap AND beats that layout's overall quality,
	// or is significantly more novel, replace the redundant one.
	const candidateScore = analyzeCircularGaps(candidate);

	for (let i = 0; i < topLayouts.length; i++) {
		const sim = layoutDistance(candidate, topLayouts[i]);
		if (sim > 0.3) {
			const existingScore = analyzeCircularGaps(topLayouts[i]);
			// Candidate has at least as good min gap and is more novel
			if (candidateScore.minGap >= existingScore.minGap) {
				const candidateNovelty = minSimilarityToOthers(candidate, topLayouts);
				const existingNovelty = minSimilarityToOthers(topLayouts[i], topLayouts);
				if (candidateNovelty > existingNovelty) {
					topLayouts[i] = { ...candidate };
					return true;
				}
			}
		}
	}

	return false;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(addToTopLayouts|FAIL|PASS)'
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add diversity-aware selection to addToTopLayouts"
```

---

### Task 4: Modify `search()` to shuffle angle exploration order

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Write test to verify non-default angle order is explored**

Add after the existing `test('keeps custom anchorLayerId fixed at zero')` block (after line 173):

```typescript
test('produces different topLayouts when search order is shuffled vs default', async () => {
	// Run twice with different seeds — expect different top sets
	const input = buildInput(threeLayers());
	const first = await runBruteforceOptimizer(input, undefined, {
		roundOutputAngles: false
	});
	const second = await runBruteforceOptimizer(input, undefined, {
		roundOutputAngles: false,
		searchSeed: 99999
	});
	// The best layouts should differ (different search order → different exploration)
	expect(JSON.stringify(first.layout)).not.toEqual(JSON.stringify(second.layout));
});
```

- [ ] **Step 2: Add `searchSeed` option to the interfaces**

Add `searchSeed` to `BruteforceOptimizerOptions` (around line 86):

```typescript
searchSeed?: number;
```

- [ ] **Step 3: Modify the `search()` function to shuffle feasibleAngles**

Change the search function body (around line 726). Replace:

```typescript
for (const angle of feasibleAngles) {
```

With:

```typescript
const searchSeed = options?.searchSeed ?? 0;
const shuffledAngles = seededShuffle(feasibleAngles, hashString(layerId) + depth + searchSeed);

for (const angle of shuffledAngles) {
```

Add the `hashString` helper above the `search` function:

```typescript
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts --reporter=verbose 2>&1 | grep -E '(FAIL|PASS)'
```

Expected: all PASS (the shuffle test should pass since the default seed is 0, and the second run uses seed 99999)

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add seeded shuffle to search() angle exploration order"
```

---

### Task 5: Run full check and lint

- [ ] **Step 1: Run pnpm check**

```bash
pnpm check
```

Expected: No errors

- [ ] **Step 2: Run pnpm lint**

```bash
pnpm lint
```

Expected: No errors

- [ ] **Step 3: Run full test suite**

```bash
pnpm vitest run --reporter=verbose 2>&1 | tail -50
```

Expected: all tests pass

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "chore: fix lint and typecheck issues"
```
