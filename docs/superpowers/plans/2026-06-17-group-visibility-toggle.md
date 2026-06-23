# Group Visibility Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to hide/show all layers in a top-level SVG group with a single click on an eye icon in the group header.

**Architecture:** Add `toggleGroupVisibility(groupId)` and `isGroupVisible(groupId)` to the layer store (no new state needed — group visibility is derived from its layers). Add an eye icon to each group's `<summary>` row in `LayerList.svelte`. Proxy the new functions through `doodledialStore`.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add `toggleGroupVisibility` and `isGroupVisible` to layer store

**Files:**

- Modify: `src/lib/stores/layers.svelte.ts` (after `toggleVisibility`)
- Test: `src/lib/stores/layers.spec.ts` (after `toggleVisibility` tests)

- [ ] **Step 1: Write the failing tests for `toggleGroupVisibility` and `isGroupVisible`**

Add to the `groups` describe block in `src/lib/stores/layers.spec.ts`:

```typescript
describe('toggleGroupVisibility', () => {
	it('hides all layers in a group when any are visible', () => {
		store.addGroup('g1', 'Disc 1');
		store.addLayer('a', 1, 'A', 'g1');
		store.addLayer('b', 2, 'B', 'g1');
		store.toggleGroupVisibility('g1');
		expect(store.getLayer('a')!.visible).toBe(false);
		expect(store.getLayer('b')!.visible).toBe(false);
	});

	it('shows all layers in a group when all are hidden', () => {
		store.addGroup('g1', 'Disc 1');
		store.addLayer('a', 1, 'A', 'g1');
		store.addLayer('b', 2, 'B', 'g1');
		store.toggleVisibility('a');
		store.toggleVisibility('b');
		store.toggleGroupVisibility('g1');
		expect(store.getLayer('a')!.visible).toBe(true);
		expect(store.getLayer('b')!.visible).toBe(true);
	});

	it('does not affect layers in other groups', () => {
		store.addGroup('g1', 'Disc 1');
		store.addGroup('g2', 'Disc 2');
		store.addLayer('a', 1, 'A', 'g1');
		store.addLayer('b', 2, 'B', 'g2');
		store.toggleGroupVisibility('g1');
		expect(store.getLayer('b')!.visible).toBe(true);
	});

	it('calls onChange', () => {
		const onChange = vi.fn();
		store = createLayerStore({ onChange });
		store.addGroup('g1', 'Disc 1');
		store.addLayer('a', 1, 'A', 'g1');
		onChange.mockClear();
		store.toggleGroupVisibility('g1');
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe('isGroupVisible', () => {
	it('returns true when at least one layer in group is visible', () => {
		store.addGroup('g1', 'Disc 1');
		store.addLayer('a', 1, 'A', 'g1');
		store.addLayer('b', 2, 'B', 'g1');
		store.toggleVisibility('a');
		expect(store.isGroupVisible('g1')).toBe(true);
	});

	it('returns false when all layers in group are hidden', () => {
		store.addGroup('g1', 'Disc 1');
		store.addLayer('a', 1, 'A', 'g1');
		store.addLayer('b', 2, 'B', 'g1');
		store.toggleVisibility('a');
		store.toggleVisibility('b');
		expect(store.isGroupVisible('g1')).toBe(false);
	});

	it('returns false for empty group', () => {
		store.addGroup('g1', 'Disc 1');
		expect(store.isGroupVisible('g1')).toBe(false);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/stores/layers.spec.ts --reporter verbose`
Expected: Tests fail because `toggleGroupVisibility` and `isGroupVisible` are not defined on the store.

- [ ] **Step 3: Add `toggleGroupVisibility` and `isGroupVisible` to the layer store**

In `src/lib/stores/layers.svelte.ts`, after `toggleVisibility` (line ~94), add:

```typescript
function toggleGroupVisibility(groupId: string) {
	const groupLayers = Array.from(layers.values()).filter((l) => l.groupId === groupId);
	const anyVisible = groupLayers.some((l) => l.visible);
	for (const layer of groupLayers) {
		layers.set(layer.id, { ...layer, visible: !anyVisible });
	}
	notifyChange();
}

function isGroupVisible(groupId: string): boolean {
	return Array.from(layers.values()).some((l) => l.groupId === groupId && l.visible);
}
```

Then add them to the return object:

```typescript
return {
	// ... existing exports ...
	toggleVisibility,
	toggleGroupVisibility,
	isGroupVisible
	// ...
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/stores/layers.spec.ts --reporter verbose`
Expected: All tests pass, including the new group visibility tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/layers.svelte.ts src/lib/stores/layers.spec.ts
git commit -m "feat: add toggleGroupVisibility and isGroupVisible to layer store"
```

---

### Task 2: Proxy new functions through doodledial store

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Add proxy methods to `doodledialStore`**

In `src/lib/stores/doodledial.svelte.ts`, after the `hideAllLayers` proxy (line ~279), add:

```typescript
toggleGroupVisibility(groupId: string) {
	layerStore.toggleGroupVisibility(groupId);
},
isGroupVisible(groupId: string): boolean {
	return layerStore.isGroupVisible(groupId);
},
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: proxy toggleGroupVisibility through doodledial store"
```

---

### Task 3: Add eye icon to group headers in LayerList

**Files:**

- Modify: `src/lib/components/LayerList.svelte`

- [ ] **Step 1: Add the eye icon to each group `<summary>`**

In `src/lib/components/LayerList.svelte`, in the `<summary>` block (around line 272-296), after the group name and layer count badge, add an eye icon button. The icon mirrors the existing per-layer eye icons.

Replace the summary block from:

```svelte
<summary
	class="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 list-none select-none"
>
	<span class="flex items-center gap-2 text-sm font-semibold text-gray-700">
		<span class="inline-block w-3 h-3 rounded-full shrink-0" style="background: {group.color}"
		></span>
		{group.name}
	</span>
	<svg …chevron…></svg>
</summary>
```

To:

```svelte
<summary
	class="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 list-none select-none"
>
	<span class="flex items-center gap-2 text-sm font-semibold text-gray-700">
		<span class="inline-block w-3 h-3 rounded-full shrink-0" style="background: {group.color}"
		></span>
		{group.name}
	</span>
	<span class="flex items-center gap-2">
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				doodledialStore.toggleGroupVisibility(group.id);
			}}
			disabled={optimizerStore.optimizerPending}
			class="p-1 rounded transition-colors {optimizerStore.optimizerPending
				? 'cursor-not-allowed opacity-50'
				: 'hover:bg-gray-200'}"
		>
			{#if doodledialStore.isGroupVisible(group.id)}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-gray-600"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-gray-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
					/>
				</svg>
			{/if}
		</button>
		<svg
			class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</span>
</summary>
```

- [ ] **Step 2: Run lint and type check**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/LayerList.svelte
git commit -m "feat: add group visibility eye icon to layer list"
```
