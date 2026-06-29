# Solver Progress Group Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show which group is currently being solved, which are done, and which are waiting in the solver progress overlay when processing multiple dial groups.

**Architecture:** Two-file change: add tracking state to the solver store (`solver.svelte.ts`) and a group status row to the overlay component (`SolverProgressOverlay.svelte`). New state variables track current and completed group IDs; the component derives display state from selected/completed/current/queue arrays, looking up names and colors from the doodledial store.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest

---

### Task 1: Add group progress state to solver store

**Files:**

- Modify: `src/lib/stores/solver.svelte.ts`
- Test: `tests/lib/stores/solver-store.spec.ts`

- [ ] **Step 1: Add new reactive state variables**

After line 71 (`let solverMultiGroupStarted = $state(false);`), add:

```typescript
let solverCurrentGroupId = $state<string | null>(null);
let solverMultiGroupCompletedIds: string[] = $state([]);
```

- [ ] **Step 2: Populate solverCurrentGroupId in handleRunSolver**

In `handleRunSolver`, after the `targetGroupId` assignment (line 308 after shifting the queue) and after the queue initialization block (line 314), add:

```typescript
solverCurrentGroupId = targetGroupId;
```

- [ ] **Step 3: Track completed groups when transitioning to next group**

In `handleApplyBruteforceLayout` (around line 197), before starting the next group:

```typescript
if (solverMultiGroupQueue.length > 0) {
	solverProgressMessage = `Solving next group...`;
	solverMultiGroupCompletedIds = [...solverMultiGroupCompletedIds, solverCurrentGroupId!];
	solverOverlayVisible = true;
	void handleRunSolver();
}
```

In `handleCloseBruteforceResultDialog` (around line 146), before starting the next group:

```typescript
if (solverMultiGroupQueue.length > 0) {
	solverMultiGroupCompletedIds = [...solverMultiGroupCompletedIds, solverCurrentGroupId!];
	solverOverlayVisible = true;
	void handleRunSolver();
}
```

- [ ] **Step 4: Clear group state on fresh solve start and reset**

In `handleConfirmSolverDialogRun`, add two lines before `await handleRunSolver();`:

```typescript
solverRunDialogOpen = false;
bruteforceResumeContext = null;
solverMultiGroupCompletedIds = [];
solverCurrentGroupId = null;
await handleRunSolver(); // existing call
```

In `reset()`, add these two lines after line 420 (`solverMultiGroupStarted = false;`):

```typescript
solverCurrentGroupId = null;
solverMultiGroupCompletedIds = [];
```

- [ ] **Step 5: Add getters to the returned object**

After line 504 (`get solverMultiGroupQueue() {`), add:

```typescript
get solverCurrentGroupId() {
	return solverCurrentGroupId;
},
get solverMultiGroupCompletedIds() {
	return solverMultiGroupCompletedIds;
},
```

- [ ] **Step 6: Run tests to confirm existing behavior is preserved**

Run: `pnpm vitest run tests/lib/stores/solver-store.spec.ts`
Expected: All existing tests PASS

---

### Task 2: Write tests for new group progress state

**Files:**

- Modify: `tests/lib/stores/solver-store.spec.ts`

- [ ] **Step 1: Add test for initial state of new properties**

In the `initial state` describe block, after the "has empty selected group ids by default" test:

```typescript
it('has null current group id by default', () => {
	const store = createTestStore();
	store.reset();
	expect(store.solverCurrentGroupId).toBeNull();
});

it('has empty completed group ids by default', () => {
	const store = createTestStore();
	store.reset();
	expect(store.solverMultiGroupCompletedIds).toEqual([]);
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run tests/lib/stores/solver-store.spec.ts`
Expected: All tests PASS

---

### Task 3: Update SolverProgressOverlay with group status row

**Files:**

- Modify: `src/lib/components/SolverProgressOverlay.svelte`

- [ ] **Step 1: Import doodledialStore**

After the `import { solverStore }` line, add:

```typescript
import { doodledialStore } from '$lib/stores/doodledial.svelte';
```

- [ ] **Step 2: Add group indicator row between timer and progress bar**

After the time-counter div (which has `data-testid="solver-time-counter"`) and before the progress track div (which has `data-testid="solver-progress-track"`), add the group pills row:

```svelte
{#if doodledialStore.groups.length > 1 && solverStore.solverSelectedGroupIds.length > 1}
	<div class="mb-2 flex flex-wrap items-center gap-2 text-xs" data-testid="solver-group-progress">
		{#each solverStore.solverSelectedGroupIds as groupId, i}
			{@const group = doodledialStore.groups.find((g) => g.id === groupId)}
			{@const isCompleted = solverStore.solverMultiGroupCompletedIds.includes(groupId)}
			{@const isCurrent = solverStore.solverCurrentGroupId === groupId}
			{@const isWaiting = !isCompleted && !isCurrent}
			<span
				class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium transition-colors"
				class:bg-green-100={isCompleted}
				class:text-green-700={isCompleted}
				class:bg-indigo-100={isCurrent}
				class:text-indigo-700={isCurrent}
				class:bg-slate-100={isWaiting}
				class:text-slate-500={isWaiting}
				class:ring-1={isCurrent}
				class:ring-indigo-300={isCurrent}
			>
				<span
					class="w-2 h-2 rounded-full shrink-0"
					style="background-color: {group?.color ?? '#999'}"
					aria-hidden="true"
				></span>
				<span>{isCompleted ? '✓' : isCurrent ? '◉' : '○'}</span>
				<span>{group?.name ?? groupId}</span>
			</span>
		{/each}
	</div>
{/if}
```

- [ ] **Step 3: Run pnpm check and lint to verify**

Run: `pnpm check`
Expected: No errors

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 4: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS
