# Top-N Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Track and display the top 12 brute-force solver layouts live during search, with a post-run picker dialog.

**Architecture:** Optimizer maintains a top-N list alongside the incumbent `bestLayout` for pruning. Progress handler carries updated top-N to the UI. Thumbnail SVGs are string substitutions via `combineOptimizerSvgTemplate` — no canvas rendering.

**Tech Stack:** TypeScript, Svelte 5 (runes), Tailwind CSS

---

### Task 1: Optimizer — add topLayouts tracking

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts`

- [ ] **Step 1: Add `MAX_TOP_LAYOUTS` constant and `addToTopLayouts` function**

Add at the top (after existing imports/constants):

```typescript
const MAX_TOP_LAYOUTS = 12;

function addToTopLayouts(
	candidate: Record<string, number>,
	topLayouts: Record<string, number>[]
): boolean {
	if (topLayouts.length < MAX_TOP_LAYOUTS) {
		topLayouts.push({ ...candidate });
		return true;
	}

	let worstIndex = -1;
	for (let i = 0; i < topLayouts.length; i++) {
		if (worstIndex === -1) {
			worstIndex = i;
		} else if (isBetterLayout(topLayouts[worstIndex], topLayouts[i])) {
			worstIndex = i;
		}
	}

	if (worstIndex >= 0 && isBetterLayout(candidate, topLayouts[worstIndex])) {
		topLayouts[worstIndex] = { ...candidate };
		return true;
	}

	return false;
}
```

- [ ] **Step 2: Extend `BruteforceResumeContext` to include `topLayouts`**

Change the interface:

```typescript
export interface BruteforceResumeContext {
	overlapCache: OverlapDetectionCache;
	pairFeasibilityMemo: Map<string, boolean>;
	optimizerSvgTemplate: OptimizerSvgTemplate;
	bestLayout: Record<string, number> | null;
	topLayouts: Record<string, number>[];
	feasibleSolutionsFound: number;
}
```

- [ ] **Step 3: Extend `OptimizerResult` to include `topLayouts`**

```typescript
export interface OptimizerResult {
	layout: Record<string, number>;
	topLayouts: Record<string, number>[];
	stopReason: BruteforceOptimizerStopReason;
	feasibleSolutionsFound: number;
	resumeContext: BruteforceResumeContext;
}
```

- [ ] **Step 4: Extend `OptimizerProgress` to include optional `topLayouts` and `optimizerSvgTemplate`**

```typescript
export interface OptimizerProgress {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
	feasibleSolutionsFound?: number;
	topLayouts?: Record<string, number>[];
	optimizerSvgTemplate?: OptimizerSvgTemplate;
}
```

- [ ] **Step 5: Add `topLayoutsDirty` flag and `topLayouts` array to the optimizer function**

In `runBruteforceOptimizer`, find where `bestLayout` and `feasibleSolutionsFound` are declared (around line 391-392):

```typescript
let feasibleSolutionsFound = options?.resumeContext?.feasibleSolutionsFound ?? 0;
let bestLayout: Record<string, number> | null = options?.resumeContext?.bestLayout ?? null;
let topLayouts: Record<string, number>[] = options?.resumeContext?.topLayouts ?? [];
let topLayoutsDirty = false;
```

- [ ] **Step 6: In the search leaf node, call `addToTopLayouts`**

In the `search()` function where feasible solutions are found (around line 656-664), change:

```typescript
if (depth >= remainingLayerIds.length) {
	feasibleSolutionsFound += 1;
	const candidate = Object.fromEntries(
		layerIds.map((layerId) => [layerId, assigned.get(layerId) ?? 0])
	);
	if (isBetterLayout(candidate, bestLayout)) {
		bestLayout = candidate;
	}
	if (addToTopLayouts(candidate, topLayouts)) {
		topLayoutsDirty = true;
	}
	return;
}
```

- [ ] **Step 7: Include `topLayouts` in progress reports when dirty**

In `reportProgress()`, add the dirty check:

```typescript
const reportProgress = (force = false): void => {
	const now = Date.now();
	if (!force && now - lastProgressReportedAtMs < PROGRESS_REPORT_INTERVAL_MS) {
		return;
	}
	lastProgressReportedAtMs = now;
	const percent =
		typeof maxRuntimeMs === 'number' && maxRuntimeMs > 0
			? Math.min(99, Math.round(((now - startedAtMs) / maxRuntimeMs) * 100))
			: Math.min(99, Math.round((nodesVisited / totalIterations) * 100));

	const progressPayload: OptimizerProgress = {
		percent,
		message: `Solutions found: ${feasibleSolutionsFound}`,
		iteration: nodesVisited,
		totalIterations,
		feasibleSolutionsFound
	};

	if (topLayoutsDirty) {
		progressPayload.topLayouts = topLayouts;
		progressPayload.optimizerSvgTemplate = optimizerSvgTemplate;
		topLayoutsDirty = false;
	}

	onProgress?.(progressPayload);
};
```

- [ ] **Step 8: Build `topLayouts` in the return value and resume context**

Update the return value (around line 745-756):

```typescript
return {
	layout,
	topLayouts,
	stopReason,
	feasibleSolutionsFound,
	resumeContext: {
		overlapCache,
		pairFeasibilityMemo,
		optimizerSvgTemplate,
		bestLayout,
		topLayouts,
		feasibleSolutionsFound
	}
};
```

Also update the early-return paths (empty layers, no feasible) to include `topLayouts: []` in the return value and resume context.

- [ ] **Step 9: Update `emitTerminalProgressAndSnapshot` to include `topLayouts`**

Since this is called at terminal states, also include the current topLayouts:

```typescript
const emitTerminalProgressAndSnapshot = (
	feasibleSolutionsFound: number,
	stopReason: BruteforceOptimizerStopReason
): void => {
	onProgress?.({
		percent: 100,
		message: `Solutions found: ${feasibleSolutionsFound}`,
		iteration: 0,
		totalIterations: 0,
		topLayouts,
		optimizerSvgTemplate
	});
	// ... rest unchanged
};
```

---

### Task 2: UI — progress overlay thumbnail grid

**Files:**

- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add state variables for topLayouts and thumbnails**

After the existing state declarations (around line 40-53):

```typescript
let optimizerTopLayouts = $state<Record<string, number>[]>([]);
let optimizerThumbnailSvgs = $state<string[]>([]);
let optimizerSvgTemplate = $state<OptimizerSvgTemplate | null>(null);
let optimizerSelectedThumbnailIndex = $state<number | null>(null);
```

Add the `OptimizerSvgTemplate` import:

```typescript
import type { OptimizerSvgTemplate } from '$lib/utils/doodledial';
```

- [ ] **Step 2: In the progress handler, update topLayouts and svgTemplate**

In the `progressHandler` callback (around line 228-241), add after `optimizerElapsedMs`:

```typescript
const progressHandler = (progress: {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
	feasibleSolutionsFound?: number;
	topLayouts?: Record<string, number>[];
	optimizerSvgTemplate?: OptimizerSvgTemplate;
}) => {
	optimizerProgressPhase = 'Optimizing';
	optimizerProgress = Math.max(optimizerProgress, progress.percent);
	optimizerProgressMessage = progress.message;
	optimizerIteration = progress.iteration;
	optimizerTotalIterations = progress.totalIterations;
	optimizerElapsedMs = Date.now() - runStartedAtMs;
	if (progress.topLayouts) {
		optimizerTopLayouts = progress.topLayouts;
	}
	if (progress.optimizerSvgTemplate) {
		optimizerSvgTemplate = progress.optimizerSvgTemplate;
	}
};
```

- [ ] **Step 3: Add an effect to compute thumbnail SVGs when topLayouts change**

Add a `$effect` block (after `handleRunOptimizer`, before the template markup):

```typescript
import { combineOptimizerSvgTemplate } from '$lib/utils/doodledial';

// ...in script section, after state declarations:

$effect(() => {
	const layouts = optimizerTopLayouts;
	const template = optimizerSvgTemplate;
	if (!template || layouts.length === 0) {
		optimizerThumbnailSvgs = [];
		return;
	}
	optimizerThumbnailSvgs = layouts.map((layout) => combineOptimizerSvgTemplate(template, layout));
});
```

- [ ] **Step 4: Add click handler for thumbnail selection**

```typescript
function handleThumbnailClick(index: number) {
	optimizerSelectedThumbnailIndex = optimizerSelectedThumbnailIndex === index ? null : index;
}
```

- [ ] **Step 5: Widen the progress overlay panel and add the 4×3 thumbnail grid**

In the overlay template, change `max-w-2xl` to `max-w-4xl` and add the grid section after the progress bar / time counter. Find the overlay section (around line 534-581) and modify:

```svelte
{#if optimizerOverlayVisible}
	<div class="absolute inset-0 z-20 flex items-start justify-center pointer-events-none">
		<div class="absolute inset-0 rounded-2xl bg-slate-900/20 backdrop-blur-[1px]"></div>
		<section
			class="pointer-events-auto relative mt-4 w-full max-w-4xl rounded-2xl border border-indigo-200 bg-white/95 shadow-lg px-4 py-3"
		>
			<div class="flex items-center text-xs text-slate-600 mb-2 gap-4">
				<span class="font-medium uppercase tracking-wide">{optimizerProgressPhase}</span>
				<span>Solutions: {optimizerTopLayouts.length}/12</span>
			</div>
			{#if optimizerActiveMode === 'bruteforce'}
				<div
					class="mb-2 flex items-center justify-between text-xs text-slate-600"
					data-testid="optimizer-time-counter"
				>
					<span>Elapsed {formatDurationMs(optimizerElapsedMs)}</span>
					<span>
						Max {optimizerMaxRuntimeMs === null
							? 'No limit'
							: formatDurationMs(optimizerMaxRuntimeMs)}
					</span>
				</div>
			{/if}
			<div
				class="h-2 w-full rounded-full bg-indigo-100 overflow-hidden"
				data-testid="optimizer-progress-track"
			>
				<div
					data-testid="optimizer-progress-bar"
					class="h-full bg-indigo-600 transition-all duration-300"
					style="width: {optimizerProgress}%;"
				></div>
			</div>

			<!-- 4×3 Thumbnail Grid -->
			{#if optimizerActiveMode === 'bruteforce'}
				<div class="mt-3 grid grid-cols-4 gap-2">
					{#each Array(12) as _, index}
						{@const svg = optimizerThumbnailSvgs[index]}
						<button
							type="button"
							onclick={() => handleThumbnailClick(index)}
							class="aspect-square rounded-lg border-2 overflow-hidden p-1 flex items-center justify-center transition-all duration-150 {svg
								? 'bg-white border-gray-200 hover:border-indigo-400 cursor-pointer'
								: 'bg-gray-50 border-dashed border-gray-300 cursor-default'}"
						>
							{#if svg}
								<div
									class="w-full h-full {optimizerSelectedThumbnailIndex === index
										? 'opacity-100'
										: 'opacity-80 hover:opacity-100'}"
								>
									{@html svg}
								</div>
							{:else}
								<span class="text-xs text-gray-300">empty</span>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Selected thumbnail info bar -->
				{#if optimizerSelectedThumbnailIndex !== null && optimizerTopLayouts[optimizerSelectedThumbnailIndex]}
					{@const layout = optimizerTopLayouts[optimizerSelectedThumbnailIndex]}
					{@const scores = analyzeCircularGaps(layout)}
					<div class="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 flex gap-4">
						<span>Selected: <strong>#{optimizerSelectedThumbnailIndex + 1}</strong></span>
						<span>Min gap: <strong>{scores.minGap}°</strong></span>
						<span>Variance: <strong>{scores.variance.toFixed(0)}</strong></span>
						<span>Deviation: <strong>{scores.deviationSum.toFixed(0)}°</strong></span>
					</div>
				{/if}
			{/if}

			<div class="mt-2 flex items-center justify-between gap-4">
				<p class="text-sm text-slate-700" data-testid="optimizer-progress-message">
					{optimizerProgressMessage}
				</p>
				{#if optimizerPending}
					<button
						onclick={handleCancelOptimizer}
						class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
						data-testid="optimizer-cancel-button"
					>
						Cancel
					</button>
				{/if}
			</div>
		</section>
	</div>
{/if}
```

Need to import `analyzeCircularGaps` at the top:

```typescript
import { analyzeCircularGaps } from '$lib/optimizer/run-bruteforce-optimizer';
```

This function is already exported, so the import should work. Verify it's exported — if not, add `export` to `analyzeCircularGaps` in the optimizer file.

- [ ] **Step 6: Export `analyzeCircularGaps` from the optimizer**

In `src/lib/optimizer/run-bruteforce-optimizer.ts`, the function `analyzeCircularGaps` is currently not exported. Add `export` to it:

```typescript
export function analyzeCircularGaps(layout: Record<string, number>): {
  minGap: number;
  variance: number;
  deviationSum: number;
} {
```

---

### Task 3: UI — result picker dialog

**Files:**

- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add state for selected layout in result dialog**

After existing state (around line 53):

```typescript
let optimizerResultSelectedIndex = $state(0);
```

- [ ] **Step 2: Replace the bruteforce result dialog with the split-pane picker**

Find the existing result dialog section (around line 775-864) and replace it entirely:

```svelte
{#if bruteforceResultDialogOpen && bruteforceRunSummary}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="bruteforce-result-dialog"
	>
		<button
			type="button"
			onclick={handleAcceptBruteforceResult}
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close result dialog"
		></button>
		<section
			class="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-semibold text-gray-900">
					{#if bruteforceRunSummary.stopReason === 'time_limit'}
						Time Limit Reached — Select a Layout
					{:else if bruteforceRunSummary.stopReason === 'exact_complete'}
						Search Complete — Select a Layout
					{:else}
						No Feasible Layout Found
					{/if}
				</h2>
				<p class="text-sm text-gray-500 mt-0.5">
					{bruteforceRunSummary.feasibleSolutionsFound} feasible layouts found. Click a thumbnail to preview,
					then accept.
				</p>
			</div>

			{#if bruteforceRunSummary.feasibleSolutionsFound > 0}
				<!-- Split body -->
				<div class="flex flex-1 min-h-0">
					<!-- Left: thumbnail grid (2×6) -->
					<div class="w-64 shrink-0 p-4 border-r border-gray-100 overflow-y-auto">
						<div class="grid grid-cols-2 gap-2">
							{#each optimizerTopLayouts as layout, index}
								{@const isSelected = optimizerResultSelectedIndex === index}
								{@const thumbSvg = optimizerThumbnailSvgs[index]}
								<button
									type="button"
									onclick={() => {
										optimizerResultSelectedIndex = index;
									}}
									class="aspect-square rounded-lg border-2 overflow-hidden p-1 flex items-center justify-center transition-all duration-150 {isSelected
										? 'border-indigo-500 ring-2 ring-indigo-200'
										: 'border-gray-200 hover:border-indigo-300'}"
								>
									{#if thumbSvg}
										<div class="w-full h-full">
											{@html thumbSvg}
										</div>
									{:else}
										<span class="text-xs text-gray-300">rendering...</span>
									{/if}
									<div
										class="absolute bottom-1 right-1 text-xs font-semibold {isSelected
											? 'text-indigo-600 bg-indigo-50'
											: 'text-gray-500 bg-white/90'} px-1.5 py-0.5 rounded-full shadow-xs"
									>
										#{index + 1}
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Right: large preview -->
					<div class="flex-1 flex flex-col p-4 min-w-0">
						{@const selectedLayout = optimizerTopLayouts[optimizerResultSelectedIndex]}
						{@const scores = selectedLayout ? analyzeCircularGaps(selectedLayout) : null}

						<div class="flex items-center justify-between mb-3">
							<span class="text-sm font-medium text-gray-700">
								Layout #{optimizerResultSelectedIndex + 1}
							</span>
							{#if scores}
								<div class="flex gap-3 text-xs text-gray-500">
									<span>Min gap: <strong class="text-gray-900">{scores.minGap}°</strong></span>
									<span
										>Variance: <strong class="text-gray-900">{scores.variance.toFixed(0)}</strong
										></span
									>
									<span
										>Deviation: <strong class="text-gray-900"
											>{scores.deviationSum.toFixed(0)}°</strong
										></span
									>
								</div>
							{/if}
						</div>

						<div
							class="flex-1 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center min-h-[300px] overflow-hidden p-4"
						>
							{#if selectedLayout && optimizerSvgTemplate}
								{@const previewSvg = combineOptimizerSvgTemplate(
									optimizerSvgTemplate,
									selectedLayout
								)}
								<div class="max-w-full max-h-full">
									{@html previewSvg}
								</div>
							{:else}
								<span class="text-sm text-gray-400">No preview available</span>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<!-- No feasible solutions -->
				<div class="p-8 text-center text-gray-500">
					<p class="text-sm">
						No non-overlapping layout was found. Try increasing the gap or adjusting layer
						positions.
					</p>
				</div>
			{/if}

			<!-- Footer -->
			<div class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
				{#if bruteforceRunSummary.stopReason === 'time_limit'}
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={handleContinueBruteforce}
							class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
							data-testid="bruteforce-result-continue-button"
						>
							Continue Searching
						</button>
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<span>Continue for</span>
							<input
								type="number"
								min="1"
								step="1"
								bind:value={bruteforceExtendRuntimeSInput}
								class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
							/>
							<span>s</span>
						</div>
					</div>
				{:else}
					<div></div>
				{/if}
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleAcceptBruteforceResult}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
					>
						Cancel
					</button>
					{#if bruteforceRunSummary.feasibleSolutionsFound > 0}
						<button
							type="button"
							onclick={() => {
								const selectedLayout = optimizerTopLayouts[optimizerResultSelectedIndex];
								if (selectedLayout) {
									doodledialStore.applyLayerRotations(selectedLayout);
								}
								bruteforceResultDialogOpen = false;
							}}
							class="px-4 py-2 rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
							data-testid="bruteforce-result-accept-button"
						>
							Accept Layout
						</button>
					{/if}
				</div>
			</div>
		</section>
	</div>
{/if}
```

- [ ] **Step 3: Remove auto-application of best layout from the brute-force result handler**

Find where `bruteForceResult.feasibleSolutionsFound > 0` triggers `applyLayerRotations` (around line 258-261) and remove the auto-apply:

```typescript
if (bruteForceResult.feasibleSolutionsFound > 0) {
	// Don't auto-apply — user picks from the dialog
	optimizerApplied = false; // will be set to true only when user accepts
}
```

Also update the `optimizerApplied` assignment — only set it to true when the user clicks "Accept Layout". The result dialog will handle applying. But we need to make sure the "layout applied" summary still works. Actually, let's just not auto-apply and let the accept button handle it. The `optimizerApplied` state will be false, but the result dialog will show a preview and let the user apply manually.

Wait, but `optimizerApplied` controls the overlay message. Let me think about this:

- The overlay will show "Complete" with the normal message
- The result dialog opens on top
- User picks a layout and clicks Accept
- Accept applies the layout

So `optimizerApplied` should be false initially. The overlay shows "Complete / Time Limit" without saying layout applied. That's fine since the result dialog handles it.

Actually, let me reconsider. The current code flow is:

1. Optimizer finishes
2. `optimizerApplied` is set to true if a feasible solution was found
3. Overlay shows "Complete - layout applied"
4. After 1.2s overlay fades
5. Result dialog opens

With the new flow:

1. Optimizer finishes
2. `optimizerApplied` is NOT set to true (user will apply manually)
3. Overlay shows "Complete" but not "layout applied"
4. After 1.2s overlay fades
5. Result dialog opens with the picker
6. User picks a layout and clicks Accept
7. Accept applies the layout

This is cleaner. Let me update the step accordingly.

- [ ] **Step 4: Update `handleAcceptBruteforceResult` to reset without applying**

```typescript
function handleAcceptBruteforceResult() {
	bruteforceResultDialogOpen = false;
	optimizerResultSelectedIndex = 0;
}
```

The old `handleAcceptBruteforceResult` just closed the dialog. We keep that behavior since there's also a separate "Accept Layout" button that applies + closes.

- [ ] **Step 5: Wire `optimizerTopLayouts` into the result dialog**

When the brute-force run completes, the progress handler has already populated `optimizerTopLayouts` and `optimizerThumbnailSvgs` and `optimizerSvgTemplate`. The result dialog reads these directly — no additional wiring needed.

But we need to make sure `optimizerTopLayouts` is populated when the dialog opens. Since the progress handler updates it during the run, and at terminal state `emitTerminalProgressAndSnapshot` also includes it, it should be set. Add a safeguard in the result dialog to handle the case where it might not be populated:

Nothing extra needed — the `#each` loop over `optimizerTopLayouts` will just be empty.

---

### Task 4: Tests

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`

- [ ] **Step 1: Test `addToTopLayouts` behavior**

Add a test block for the new function. Since `addToTopLayouts` is not exported, we either export it or test it indirectly through the optimizer. Export it:

```typescript
export function addToTopLayouts(
  candidate: Record<string, number>,
  topLayouts: Record<string, number>[]
): boolean {
```

Then add tests:

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

	it('replaces the worst layout when at the limit and candidate is better', () => {
		const layouts: Record<string, number>[] = [];
		// Fill with 12 layouts, spread evenly at 30deg intervals
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		// The 12 layouts above all have the same min gap (30deg), so the worst is the last (tiebreak)
		// A candidate with a larger min gap should replace it
		const betterCandidate = { a: 0, b: 15, c: 195 };
		const result = addToTopLayouts(betterCandidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(betterCandidate);
	});

	it('does nothing when candidate is worse than all in a full list', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		const snapshot = layouts.map((l) => ({ ...l }));
		const worseCandidate = { a: 0, b: 0, c: 0 }; // min gap 0 — terrible
		const result = addToTopLayouts(worseCandidate, layouts);
		expect(result).toBe(false);
		expect(layouts).toEqual(snapshot);
	});
});
```

- [ ] **Step 2: Run existing tests to verify nothing is broken**

```bash
pnpm vitest run src/lib/optimizer/run-bruteforce-optimizer.spec.ts
```

Expected: all existing tests pass, new tests pass.

- [ ] **Step 3: Run checks**

```bash
pnpm check && pnpm lint
```

Expected: no errors or warnings.

---

### Plan Self-Review

**Spec coverage:**

- ✓ Optimizer tracks top-12 layouts — Task 1 Step 1 (`addToTopLayouts`)
- ✓ Keep `bestLayout` for pruning — Task 1 Step 5
- ✓ Extend interfaces — Task 1 Steps 2-4
- ✓ Progress reporting with dirty flag — Task 1 Steps 6-7
- ✓ Resume context carries topLayouts — Task 1 Step 8
- ✓ Live 4×3 thumbnail grid in overlay — Task 2
- ✓ Result picker dialog with split pane — Task 3
- ✓ Tests — Task 4

**No placeholders found.**

**Type consistency:** `addToTopLayouts` signature matches across tasks. `OptimizerProgress` extended consistently. `analyzeCircularGaps` marked as export.
