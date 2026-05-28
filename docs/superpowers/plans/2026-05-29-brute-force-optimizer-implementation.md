# Brute Force Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an exact brute-force optimizer that can be run from a dedicated UI button, while keeping the current force-directed optimizer as-is.

**Architecture:** Implement a new optimizer runner module with DFS branch-and-bound over integer angles, reusing existing overlap detection and cache infrastructure. Integrate it through a second run action in the existing page dialog flow, preserving the current progress overlay contract and cancellation behavior. Validate with focused unit tests for optimizer semantics and e2e coverage for the new button-driven flow.

**Tech Stack:** TypeScript, SvelteKit, Vitest, Playwright, existing overlap detection utilities (`detectOverlaps`, `createOverlapDetectionCache`).

---

## File Structure Map

- Create: `src/lib/optimizer/run-bruteforce-optimizer.ts`
  - New brute-force optimizer implementation and types.
- Create: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
  - Unit tests for hard constraints, determinism, time-limit behavior, cancellation, and scoring tie-breaks.
- Modify: `src/routes/+page.svelte`
  - Add dedicated brute-force button and route dialog execution to the right runner.
- Modify: `tests/optimizer-hook.spec.ts`
  - Add e2e checks that brute-force button triggers frontend brute-force runner and preserves progress text behavior.
- Modify: `docs/superpowers/specs/2026-05-29-brute-force-optimizer-design.md`
  - Keep design synced with implementation decisions (already updated in this session).

### Task 1: Add Failing Unit Tests For Brute-Force Runner Contract

**Files:**
- Create: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Write failing test scaffold with shared mocks**

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const { combineDoodledialMock, detectOverlapsMock } = vi.hoisted(() => ({
  combineDoodledialMock: vi.fn((_content: SVGContent, _config: DialConfig, layers: Layer[] = []) =>
    JSON.stringify(Object.fromEntries(layers.map((layer) => [layer.id, layer.rotation])))
  ),
  detectOverlapsMock: vi.fn(async () => new Map<string, Map<string, number>>())
}));

vi.mock('$lib/utils/doodledial', () => ({
  combineDoodledial: combineDoodledialMock
}));

vi.mock('$lib/utils/overlap-detection', () => ({
  detectOverlaps: detectOverlapsMock,
  createOverlapDetectionCache: () => ({
    bitmapByLayerAngle: new Map(),
    overlapByAbsolutePairAngles: new Map(),
    overlapByRelativePairAngles: new Map()
  })
}));

import {
  runBruteforceOptimizer,
  BruteforceOptimizerCancelledError
} from './run-bruteforce-optimizer';
```

- [ ] **Step 2: Add failing behavior tests for required contract**

```ts
describe('runBruteforceOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns deterministic layout for same input', async () => {
    const input = buildInput([
      { id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
      { id: 'layerB', index: 1, name: 'Layer B', rotation: 20, visible: true },
      { id: 'layerC', index: 2, name: 'Layer C', rotation: 240, visible: true }
    ]);

    const first = await runBruteforceOptimizer(input, undefined, { roundOutputAngles: false });
    const second = await runBruteforceOptimizer(input, undefined, { roundOutputAngles: false });

    expect(second.layout).toEqual(first.layout);
  });

  test('throws cancellation error when signal is pre-aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runBruteforceOptimizer(buildInput(twoLayers()), undefined, { signal: controller.signal })
    ).rejects.toBeInstanceOf(BruteforceOptimizerCancelledError);
  });

  test('stops due to time limit and returns best feasible incumbent', async () => {
    const snapshots: Array<{ stopReason?: string }> = [];

    const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
      maxRuntimeMs: 1,
      onSearchSnapshot: (snapshot) => snapshots.push({ stopReason: snapshot.stopReason })
    });

    expect(result.layout).toBeDefined();
    expect(snapshots.some((s) => s.stopReason === 'time_limit')).toBe(true);
  });
});
```

- [ ] **Step 3: Add local test helpers in same test file**

```ts
function buildInput(layers: Layer[]) {
  return {
    diameter: 200,
    config: {
      diameter: 200,
      minDiameter: 50,
      maxDiameter: 200,
      borderWidth: 2,
      padding: 0.05,
      offsetX: 0,
      offsetY: 0,
      scale: 1
    },
    layers,
    svgContent: {
      raw: '<svg viewBox="0 0 200 200"></svg>',
      filename: 'fixture.svg'
    }
  };
}

function twoLayers(): Layer[] {
  return [
    { id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
    { id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true }
  ];
}

function threeLayers(): Layer[] {
  return [
    { id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
    { id: 'layerB', index: 1, name: 'Layer B', rotation: 90, visible: true },
    { id: 'layerC', index: 2, name: 'Layer C', rotation: 180, visible: true }
  ];
}
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
Expected: FAIL with module/function not found for `run-bruteforce-optimizer.ts`.

- [ ] **Step 5: Commit failing tests**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "test: add brute-force optimizer contract tests"
```

### Task 2: Implement Minimal Brute-Force Runner To Pass Core Tests

**Files:**
- Create: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Create module types and cancellation primitives**

```ts
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from '$lib/utils/doodledial';
import {
  createOverlapDetectionCache,
  detectOverlaps,
  type PairOverlapCacheMode
} from '$lib/utils/overlap-detection';

export interface OptimizerInput {
  diameter: number;
  config: DialConfig;
  layers: Layer[];
  svgContent: SVGContent;
}

export interface OptimizerProgress {
  percent: number;
  message: string;
  iteration: number;
  totalIterations: number;
}

export interface OptimizerResult {
  layout: Record<string, number>;
}

export interface BruteforceOptimizerSearchSnapshot {
  nodesVisited: number;
  depth: number;
  feasibleSolutionsFound: number;
  stopReason?: 'exact_complete' | 'time_limit' | 'no_feasible_solution' | 'cancelled';
}

export interface BruteforceOptimizerOptions {
  signal?: AbortSignal;
  roundOutputAngles?: boolean;
  overlapPairCacheMode?: PairOverlapCacheMode;
  maxRuntimeMs?: number;
  anchorLayerId?: string;
  onSearchSnapshot?: (snapshot: BruteforceOptimizerSearchSnapshot) => void;
}

export class BruteforceOptimizerCancelledError extends Error {
  constructor(message = 'Bruteforce optimizer cancelled') {
    super(message);
    this.name = 'BruteforceOptimizerCancelledError';
  }
}
```

- [ ] **Step 2: Implement DFS + hard-prune baseline with time-limit handling**

```ts
const MIN_OVERLAP_PIXELS = 2;

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new BruteforceOptimizerCancelledError();
  }
}

export async function runBruteforceOptimizer(
  input: OptimizerInput,
  onProgress?: (progress: OptimizerProgress) => void,
  options?: BruteforceOptimizerOptions
): Promise<OptimizerResult> {
  const startedAtMs = Date.now();
  const maxRuntimeMs = options?.maxRuntimeMs;
  const overlapPairCacheMode = options?.overlapPairCacheMode ?? 'absolute';
  const layerIds = input.layers.map((layer) => layer.id);
  const anchorLayerId = options?.anchorLayerId ?? layerIds[0];

  const assigned = new Map<string, number>([[anchorLayerId, 0]]);
  const usedAngles = new Array<boolean>(360).fill(false);
  usedAngles[0] = true;

  let nodesVisited = 0;
  let feasibleSolutionsFound = 0;
  let bestLayout: Record<string, number> | null = null;

  const overlapCache = createOverlapDetectionCache();
  const remainingLayerIds = layerIds.filter((id) => id !== anchorLayerId).sort();

  const isTimedOut = () =>
    typeof maxRuntimeMs === 'number' && maxRuntimeMs >= 0 && Date.now() - startedAtMs >= maxRuntimeMs;

  async function isPairValid(layerA: string, angleA: number, layerB: string, angleB: number): Promise<boolean> {
    const rotations = Object.fromEntries(
      input.layers.map((layer) => [
        layer.id,
        normalizeAngle(layer.id === layerA ? angleA : layer.id === layerB ? angleB : layer.rotation)
      ])
    );

    const layers = input.layers.map((layer) => ({ ...layer, rotation: rotations[layer.id] }));
    const combinedSvg = combineDoodledial(input.svgContent, { ...input.config, diameter: input.diameter }, layers);
    const overlaps = await detectOverlaps(layers, combinedSvg, {
      cache: overlapCache,
      pairCacheMode: overlapPairCacheMode
    });

    return (overlaps.get(layerA)?.get(layerB) ?? 0) < MIN_OVERLAP_PIXELS;
  }

  async function search(depth: number): Promise<boolean> {
    throwIfCancelled(options?.signal);

    if (isTimedOut()) {
      options?.onSearchSnapshot?.({
        nodesVisited,
        depth,
        feasibleSolutionsFound,
        stopReason: 'time_limit'
      });
      return true;
    }

    if (depth >= remainingLayerIds.length) {
      feasibleSolutionsFound += 1;
      bestLayout = Object.fromEntries(layerIds.map((id) => [id, assigned.get(id) ?? 0]));
      return false;
    }

    const layerId = remainingLayerIds[depth];

    for (let angle = 0; angle < 360; angle++) {
      if (usedAngles[angle]) {
        continue;
      }

      nodesVisited += 1;
      assigned.set(layerId, angle);

      let valid = true;
      for (const [otherLayerId, otherAngle] of assigned.entries()) {
        if (otherLayerId === layerId) continue;
        if (!(await isPairValid(layerId, angle, otherLayerId, otherAngle))) {
          valid = false;
          break;
        }
      }

      onProgress?.({
        percent: typeof maxRuntimeMs === 'number' && maxRuntimeMs > 0
          ? Math.min(99, Math.round(((Date.now() - startedAtMs) / maxRuntimeMs) * 100))
          : Math.min(99, Math.round((nodesVisited % 1000) / 10)),
        message: `Iterations ${nodesVisited}/${Math.max(nodesVisited, 1)}`,
        iteration: nodesVisited,
        totalIterations: Math.max(nodesVisited, 1)
      });

      if (valid) {
        usedAngles[angle] = true;
        const stopNow = await search(depth + 1);
        usedAngles[angle] = false;
        if (stopNow) {
          assigned.delete(layerId);
          return true;
        }
      }

      assigned.delete(layerId);
    }

    return false;
  }

  await search(0);

  if (!bestLayout) {
    bestLayout = Object.fromEntries(layerIds.map((id) => [id, normalizeAngle(input.layers.find((l) => l.id === id)?.rotation ?? 0)]));
    options?.onSearchSnapshot?.({
      nodesVisited,
      depth: remainingLayerIds.length,
      feasibleSolutionsFound,
      stopReason: 'no_feasible_solution'
    });
  }

  const layout = options?.roundOutputAngles === false
    ? bestLayout
    : Object.fromEntries(Object.entries(bestLayout).map(([id, a]) => [id, Math.round(normalizeAngle(a)) % 360]));

  return { layout };
}
```

- [ ] **Step 3: Run unit tests and fix minimal mismatches**

Run: `pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
Expected: PASS for initial contract tests.

- [ ] **Step 4: Commit brute-force baseline implementation**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add brute-force optimizer baseline"
```

### Task 3: Add Soft Scoring And Deterministic Best-Feasible Selection

**Files:**
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
- Test: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Add failing tests for score preference and tie-break determinism**

```ts
test('prefers feasible layout with better min-gap score', async () => {
  const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
    roundOutputAngles: false,
    maxRuntimeMs: 200
  });

  const angles = Object.values(result.layout).sort((a, b) => a - b);
  expect(angles.length).toBe(3);
  expect(angles[1] - angles[0]).toBeGreaterThan(0);
});

test('keeps deterministic tie-break ordering', async () => {
  const first = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
    roundOutputAngles: false,
    maxRuntimeMs: 200
  });
  const second = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
    roundOutputAngles: false,
    maxRuntimeMs: 200
  });

  expect(second.layout).toEqual(first.layout);
});
```

- [ ] **Step 2: Implement lexicographic score comparison in optimizer**

```ts
function analyzeCircularGaps(layout: Record<string, number>): { minGap: number; variance: number; deviationSum: number } {
  const entries = Object.entries(layout)
    .map(([layerId, angle]) => ({ layerId, angle: normalizeAngle(angle) }))
    .sort((a, b) => a.angle - b.angle || a.layerId.localeCompare(b.layerId));

  if (entries.length <= 1) {
    return { minGap: 360, variance: 0, deviationSum: 0 };
  }

  const gaps: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    const next = entries[(i + 1) % entries.length];
    const gap = normalizeAngle(next.angle - current.angle);
    gaps.push(gap);
  }

  const ideal = 360 / entries.length;
  const minGap = Math.min(...gaps);
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  const deviationSum = gaps.reduce((s, g) => s + Math.abs(g - ideal), 0);
  return { minGap, variance, deviationSum };
}

function isBetterLayout(candidate: Record<string, number>, incumbent: Record<string, number> | null): boolean {
  if (!incumbent) return true;

  const c = analyzeCircularGaps(candidate);
  const i = analyzeCircularGaps(incumbent);

  if (c.minGap !== i.minGap) return c.minGap > i.minGap;
  if (c.variance !== i.variance) return c.variance < i.variance;
  if (c.deviationSum !== i.deviationSum) return c.deviationSum < i.deviationSum;

  const cKey = Object.entries(candidate).sort(([a], [b]) => a.localeCompare(b)).map(([id, angle]) => `${id}:${angle}`).join('|');
  const iKey = Object.entries(incumbent).sort(([a], [b]) => a.localeCompare(b)).map(([id, angle]) => `${id}:${angle}`).join('|');
  return cKey < iKey;
}
```

- [ ] **Step 3: Update complete-assignment branch to select best incumbent**

```ts
if (depth >= remainingLayerIds.length) {
  feasibleSolutionsFound += 1;
  const candidate = Object.fromEntries(layerIds.map((id) => [id, assigned.get(id) ?? 0]));
  if (isBetterLayout(candidate, bestLayout)) {
    bestLayout = candidate;
  }
  return false;
}
```

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit scoring improvements**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "feat: add deterministic scoring for brute-force optimizer"
```

### Task 4: Integrate Brute-Force Runner Into UI With Extra Button

**Files:**
- Modify: `src/routes/+page.svelte`
- Test: `tests/optimizer-hook.spec.ts`

- [ ] **Step 1: Add failing e2e expectation for new button visibility and run path**

```ts
test('clicking brute-force optimize calls brute-force frontend runner', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(threePathsSvg);

  const bruteButton = page.getByRole('button', { name: 'Run Brute Force Optimizer' });
  await expect(bruteButton).toBeEnabled();

  const frontendLogPromise = page.waitForEvent('console', {
    predicate: (msg) => msg.type() === 'log' && msg.text().includes('[optimizer] Frontend brute-force optimizer called:')
  });

  await bruteButton.click();
  await expect(page.getByTestId('optimizer-config-dialog')).toBeVisible();
  await page.getByTestId('optimizer-dialog-run-button').click();
  await expect(page.getByTestId('optimizer-iteration-counter')).toContainText('Iterations');
  await frontendLogPromise;
});
```

- [ ] **Step 2: Add brute-force import and button state in page script**

```ts
import { runBruteforceOptimizer, BruteforceOptimizerCancelledError } from '$lib/optimizer/run-bruteforce-optimizer';

let optimizerRunMode = $state<'force' | 'bruteforce'>('force');
let bruteForceMaxRuntimeMsInput = $state('1500');

function handleOpenBruteforceDialog() {
  if (!doodledialStore.svgContent || optimizerPending) return;
  optimizerRunMode = 'bruteforce';
  optimizerRunDialogOpen = true;
}
```

- [ ] **Step 3: Split execution path inside existing run handler by mode**

```ts
if (optimizerRunMode === 'bruteforce') {
  const parsedRuntime = Number(bruteForceMaxRuntimeMsInput);
  const maxRuntimeMs = Number.isFinite(parsedRuntime) && parsedRuntime > 0 ? parsedRuntime : undefined;

  const result = await runBruteforceOptimizer(
    {
      diameter: doodledialStore.config.diameter,
      config: doodledialStore.config,
      layers: doodledialStore.layers,
      svgContent: doodledialStore.svgContent
    },
    (progress) => {
      optimizerProgressPhase = 'Optimizing';
      optimizerProgress = progress.percent;
      optimizerProgressMessage = progress.message;
      optimizerIteration = progress.iteration;
      optimizerTotalIterations = progress.totalIterations;
    },
    {
      signal: optimizerAbortController.signal,
      roundOutputAngles: optimizerRoundOutputAngles,
      overlapPairCacheMode: optimizerOverlapPairCacheMode,
      maxRuntimeMs
    }
  );

  doodledialStore.applyLayerRotations(result.layout);
  console.log('[optimizer] Frontend brute-force optimizer called:', {
    maxRuntimeMs,
    layerCount: doodledialStore.layers.length
  });
} else {
  // existing runOptimizer(...) path unchanged
}
```

- [ ] **Step 4: Add second button in markup and mode-specific dialog controls**

```svelte
<button
  onclick={handleOpenBruteforceDialog}
  disabled={!doodledialStore.svgContent || optimizerPending}
  class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
>
  <span>{optimizerPending ? 'Running Brute Force...' : 'Run Brute Force Optimizer'}</span>
</button>

{#if optimizerRunMode === 'bruteforce'}
  <label class="text-sm text-slate-700 flex flex-col gap-1">
    <span class="font-medium">Max Runtime (ms)</span>
    <input type="number" min="1" step="1" bind:value={bruteForceMaxRuntimeMsInput} class="rounded-lg border border-slate-300 px-3 py-2" />
  </label>
{/if}
```

- [ ] **Step 5: Run e2e and update selectors/text only if needed**

Run: `pnpm playwright test tests/optimizer-hook.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit UI integration**

```bash
git add src/routes/+page.svelte tests/optimizer-hook.spec.ts
git commit -m "feat: add dedicated brute-force optimizer UI action"
```

### Task 5: Finish Brute-Force Test Matrix And Logging/Stop Reason Snapshots

**Files:**
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Add tests for stop reasons and progress message format**

```ts
test('emits progress message containing Iterations token', async () => {
  const messages: string[] = [];

  await runBruteforceOptimizer(buildInput(threeLayers()), (progress) => {
    messages.push(progress.message);
  }, { maxRuntimeMs: 10 });

  expect(messages.some((m) => m.includes('Iterations'))).toBe(true);
});

test('reports no_feasible_solution stop reason when no assignment satisfies overlap threshold', async () => {
  detectOverlapsMock.mockImplementation(async () => {
    const map = new Map<string, Map<string, number>>();
    map.set('layerA', new Map([['layerB', 5], ['layerC', 5]]));
    map.set('layerB', new Map([['layerA', 5], ['layerC', 5]]));
    map.set('layerC', new Map([['layerA', 5], ['layerB', 5]]));
    return map;
  });

  const snapshots: string[] = [];
  await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
    onSearchSnapshot: (snapshot) => {
      if (snapshot.stopReason) snapshots.push(snapshot.stopReason);
    }
  });

  expect(snapshots).toContain('no_feasible_solution');
});
```

- [ ] **Step 2: Implement snapshot emission at all terminal paths**

```ts
options?.onSearchSnapshot?.({
  nodesVisited,
  depth: remainingLayerIds.length,
  feasibleSolutionsFound,
  stopReason: 'exact_complete'
});
```

```ts
catch (error) {
  if (error instanceof BruteforceOptimizerCancelledError) {
    options?.onSearchSnapshot?.({
      nodesVisited,
      depth: 0,
      feasibleSolutionsFound,
      stopReason: 'cancelled'
    });
    throw error;
  }
  throw error;
}
```

- [ ] **Step 3: Run unit tests**

Run: `pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit stop-reason and diagnostics completion**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts
git commit -m "test: finalize brute-force stop reason and progress coverage"
```

### Task 6: Project Verification Gates

**Files:**
- Verify all modified files from prior tasks.

- [ ] **Step 1: Run type and Svelte checks**

Run: `pnpm check`
Expected: PASS with zero errors.

- [ ] **Step 2: Run lint and formatting checks**

Run: `pnpm lint`
Expected: PASS with zero warnings/errors.

- [ ] **Step 3: Run targeted test suites for touched behavior**

Run: `pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts src/lib/optimizer/run-optimizer.spec.ts`
Expected: PASS.

Run: `pnpm playwright test tests/optimizer-hook.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit final verification-safe changes**

```bash
git add src/lib/optimizer/run-bruteforce-optimizer.ts src/lib/optimizer/run-bruteforce-optimizer.spec.ts src/routes/+page.svelte tests/optimizer-hook.spec.ts docs/superpowers/specs/2026-05-29-brute-force-optimizer-design.md
git commit -m "feat: integrate brute-force optimizer with dedicated UI button"
```
