# Optimizer Stop & Result Dialog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove intermediate result thumbnails from brute-force progress overlay, replace Cancel with Stop that opens the result dialog, and allow continuing with remaining time pre-filled.

**Architecture:** Changes in `src/routes/+page.svelte` (progress overlay, stop behavior, result dialog) and `src/lib/optimizer/run-bruteforce-optimizer.ts` (add `'stopped'` to type, capture `resumeContext` on cancellation). No store or component changes needed.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind

---

### Task 0: Add 'stopped' to BruteforceOptimizerStopReason type

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts:126-130`

- [ ] **Add `'stopped'` to the type union**

```diff
 export type BruteforceOptimizerStopReason =
 	| 'exact_complete'
 	| 'cancelled'
 	| 'time_limit'
+	| 'stopped'
 	| 'no_feasible_solution';
```

### Task 1: Remove intermediate results from progress overlay

**Files:**

- Modify: `src/routes/+page.svelte:571-663`

- [ ] **Remove "Solutions: X/12" label from progress overlay**

In `src/routes/+page.svelte`, remove line 579:

```diff
 <div class="flex items-center text-xs text-slate-600 mb-2 gap-4">
   <span class="font-medium uppercase tracking-wide">{optimizerProgressPhase}</span>
-  <span>Solutions: {optimizerTopLayouts.length}/12</span>
 </div>
```

- [ ] **Remove entire 4x3 thumbnail grid and selected info bar**

Remove lines 605-645 (the entire `{#if optimizerActiveMode === 'bruteforce'}` block containing the thumbnail grid and selected info bar).

After removal, the section looks like:

```svelte
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
```

- [ ] **Verify build still passes**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

### Task 2: Capture resumeContext on stop for proper continuation

When the brute-force optimizer is cancelled, the `resumeContext` (containing `overlapCache`, `pairFeasibilityMemo`, etc.) is never returned to the UI. We need to capture it so "Continue" after stop properly resumes the search.

**Files:**

- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts:126-137` (add resumeContext to snapshot)
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.ts:856-868` (build resumeContext in catch)
- Modify: `src/routes/+page.svelte:284-289` (pass onSearchSnapshot option)

- [ ] **Add `resumeContext` to `BruteforceOptimizerSearchSnapshot` type**

In `run-bruteforce-optimizer.ts`:

```diff
export interface BruteforceOptimizerSearchSnapshot {
	nodesVisited: number;
	depth: number;
	feasibleSolutionsFound: number;
	stopReason?: BruteforceOptimizerStopReason;
+	resumeContext?: BruteforceResumeContext;
}
```

- [ ] **Build and pass resumeContext in the brute-force catch block**

In `run-bruteforce-optimizer.ts`, replace the catch block (lines 856-868):

```typescript
	} catch (error) {
		if (error instanceof BruteforceOptimizerCancelledError) {
			stopReason = 'cancelled';
			const selectedResumeLayout = bestLayout ?? buildDefaultLayout(input.layers, anchorLayerId, layerIds);
			const resumeSnapshot: BruteforceOptimizerSearchSnapshot = {
				nodesVisited,
				depth: 0,
				feasibleSolutionsFound,
				stopReason,
				resumeContext: {
					overlapCache,
					pairFeasibilityMemo,
					optimizerSvgTemplate,
					bestLayout: selectedResumeLayout,
					topLayouts,
					feasibleSolutionsFound
				}
			};
			options?.onSearchSnapshot?.(resumeSnapshot);
			throw error;
		}
		throw error;
	}
```

- [ ] **Pass `onSearchSnapshot` from the UI to capture resumeContext**

In `+page.svelte`, modify the brute-force options (line 284-289) to include `onSearchSnapshot`:

```typescript
const bruteForceResult = await runBruteforceOptimizer(optimizerInput, progressHandler, {
	signal: optimizerAbortController.signal,
	roundOutputAngles: optimizerRoundOutputAngles,
	maxRuntimeMs,
	resumeContext: resumeContext ?? undefined,
	onSearchSnapshot: (snapshot) => {
		if (snapshot.resumeContext) {
			bruteforceResumeContext = snapshot.resumeContext;
		}
	}
});
```

- [ ] **Verify build still passes**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

### Task 3: Replace Cancel with Stop, add state flag

**Files:**

- Modify: `src/routes/+page.svelte:44-59`, `src/routes/+page.svelte:117-119`

- [ ] **Add `bruteforceUserStopped` state variable**

After line 59 (`let optimizerResultSelectedIndex = $state(0);`), add:

```typescript
let bruteforceUserStopped = $state(false);
```

- [ ] **Rename `handleCancelOptimizer` to `handleStopOptimizer` and set flag**

Replace lines 117-119:

```typescript
function handleStopOptimizer() {
	if (optimizerActiveMode === 'bruteforce') {
		bruteforceUserStopped = true;
	}
	optimizerAbortController?.abort();
}
```

- [ ] **Update button to call `handleStopOptimizer` with "Stop" label**

In the progress overlay button section, change:

```svelte
<button
	onclick={handleCancelOptimizer}
	class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
	data-testid="optimizer-cancel-button"
>
	Stop
</button>
```

- [ ] **Verify build still passes**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

### Task 4: Modify catch/finally to open result dialog on stop

**Files:**

- Modify: `src/routes/+page.svelte:325-375`

- [ ] **Modify catch block to treat brute-force stop as stoppage (not error)**

Replace the catch block (lines 325-337) to handle brute-force user stop by setting `bruteforceRunStopReason`:

```typescript
		} catch (error) {
			if (
				error instanceof OptimizerCancelledError ||
				error instanceof BruteforceOptimizerCancelledError
			) {
				if (optimizerActiveMode === 'bruteforce') {
					bruteforceRunStopReason = 'stopped';
					optimizerProgressPhase = 'Stopped';
					optimizerProgressMessage = `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || '?')} - optimisation stopped.`;
				} else {
					optimizerCancelled = true;
					optimizerProgressPhase = 'Cancelled';
					optimizerProgressMessage = `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || '?')} - optimisation cancelled.`;
				}
			} else {
				optimizerProgressPhase = 'Error';
				optimizerProgressMessage = 'Optimisation failed. Please try again.';
				console.error('[optimizer] Frontend optimizer call failed:', error);
			}
		}
```

- [ ] **Modify finally block to open result dialog when brute-force is stopped**

Replace line 363:

```typescript
if (mode === 'bruteforce' && !optimizerCancelled && bruteforceRunStopReason !== null) {
	bruteforceRunSummary = {
		stopReason: bruteforceRunStopReason,
		feasibleSolutionsFound: bruteforceRunFeasibleCount,
		combinationsSearched: optimizerIteration,
		totalCombinations: optimizerTotalIterations,
		elapsedMs: optimizerElapsedMs,
		layoutApplied: optimizerApplied
	};
	bruteforceExtendRuntimeSInput = optimizerMaxRuntimeSInput;
	bruteforceResultDialogOpen = true;
}
```

Change to:

```typescript
if (mode === 'bruteforce' && bruteforceRunStopReason !== null) {
	bruteforceRunSummary = {
		stopReason: bruteforceRunStopReason,
		feasibleSolutionsFound: bruteforceRunFeasibleCount,
		combinationsSearched: optimizerIteration,
		totalCombinations: optimizerTotalIterations,
		elapsedMs: optimizerElapsedMs,
		layoutApplied: optimizerApplied
	};
	if (bruteforceUserStopped) {
		const remainingMs = Math.max(0, (optimizerMaxRuntimeMs ?? 0) - optimizerElapsedMs);
		bruteforceExtendRuntimeSInput = String(Math.round(remainingMs / 1000));
	} else {
		bruteforceExtendRuntimeSInput = optimizerMaxRuntimeSInput;
	}
	bruteforceResultDialogOpen = true;
}
```

- [ ] **Verify build still passes**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

### Task 5: Update result dialog to handle 'stopped' stop reason

**Files:**

- Modify: `src/routes/+page.svelte:856-1053`

- [ ] **Update result dialog header to show "Stopped" message**

Replace the header section (lines 873-887):

```svelte
<!-- Header -->
<div class="px-6 py-4 border-b border-gray-100">
	<h2 class="text-lg font-semibold text-gray-900">
		{#if bruteforceRunSummary.stopReason === 'time_limit'}
			Time Limit Reached — Select a Layout
		{:else if bruteforceRunSummary.stopReason === 'stopped'}
			Search Stopped — Select a Layout
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
```

- [ ] **Update footer to show "Continue Searching" for 'stopped' stop reason too**

Replace line 1000 (`{#if bruteforceRunSummary.stopReason === 'time_limit'}`):

```svelte
{#if bruteforceRunSummary.stopReason === 'time_limit' || bruteforceRunSummary.stopReason === 'stopped'}
```

- [ ] **Verify build still passes**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

### Task 6: Reset `bruteforceUserStopped` flag on new run

**Files:**

- Modify: `src/routes/+page.svelte:202-226`

- [ ] **Add reset of `bruteforceUserStopped` in `handleRunOptimizer`**

After `bruteforceResumeContext` reset at line 221 (`optimizerSelectedThumbnailIndex = null;`), add:

```typescript
bruteforceUserStopped = false;
```

- [ ] **Final verification**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.
