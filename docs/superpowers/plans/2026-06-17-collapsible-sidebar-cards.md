# Collapsible Sidebar Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three sidebar cards (Upload SVG, Disc Settings, Layer Management) collapsible via a reusable `CollapsibleCard` component.

**Architecture:** Create a `CollapsibleCard.svelte` component that wraps the existing card pattern (icon, title, body slot) with a collapse toggle using CSS `grid-template-rows` transition. Replace the three inline `<section>` card blocks in `+page.svelte`.

**Tech Stack:** Svelte 5 (snippets via `{@snippet}`, `$state()`), Tailwind CSS v4

---

### Task 1: Create `CollapsibleCard.svelte`

**Files:**

- Create: `src/lib/components/CollapsibleCard.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/components/CollapsibleCard.svelte`:

```svelte
<script lang="ts">
	let {
		title,
		icon,
		children,
		open = $state(true)
	}: {
		title: string;
		icon?: Snippet;
		children: Snippet;
		open?: boolean;
	} = $props();
</script>

<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
	<div class="flex items-center gap-3 mb-4">
		<button
			onclick={() => (open = !open)}
			class="p-2 rounded-lg transition-colors duration-150 shrink-0 cursor-pointer"
			class:bg-indigo-100={open}
			class:bg-gray-100={!open}
			aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
			aria-expanded={open}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 transition-transform duration-200"
				class:text-indigo-600={open}
				class:text-gray-400={!open}
				class:rotate-180={open}
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if icon}
			{@render icon()}
		{/if}
		<h2 class="text-lg font-semibold text-gray-800">{title}</h2>
	</div>
	<div
		class="grid transition-[grid-template-rows] duration-200 ease-out"
		style={open ? 'grid-template-rows: 1fr' : 'grid-template-rows: 0fr'}
	>
		<div class="overflow-hidden min-h-0">
			{@render children()}
		</div>
	</div>
</section>
```

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm check`
Expected: No errors or warnings

---

### Task 2: Update `+page.svelte`

**Files:**

- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add import and state variables**

Add to the imports in `src/routes/+page.svelte:2`:

```ts
import CollapsibleCard from '$lib/components/CollapsibleCard.svelte';
```

Add state variables after line 15 (`let globalConfigDialogOpen = $state(false);`):

```ts
let uploadOpen = $state(true);
let settingsOpen = $state(true);
let layersOpen = $state(true);
```

- [ ] **Step 2: Replace Upload SVG card (lines 31-71)**

Replace the entire `<section>...</section>` (lines 31-71) with:

```svelte
<CollapsibleCard title="Upload SVG" bind:open={uploadOpen}>
	{#snippet icon()}
		<div class="p-2 bg-indigo-100 rounded-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 text-indigo-600"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
				/>
			</svg>
		</div>
	{/snippet}
	<FileUpload />
	{#if doodledialStore.error}
		<p class="mt-3 text-sm text-red-600 flex items-center gap-1">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
			{doodledialStore.error}
		</p>
	{/if}
</CollapsibleCard>
```

- [ ] **Step 3: Replace Disc Settings card (lines 73-94)**

Replace the entire `<section>...</section>` (lines 73-94) with:

```svelte
<CollapsibleCard title="Disc Settings" bind:open={settingsOpen}>
	{#snippet icon()}
		<div class="p-2 bg-indigo-100 rounded-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 text-indigo-600"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
				/>
			</svg>
		</div>
	{/snippet}
	<OffsetScaleControl />
</CollapsibleCard>
```

- [ ] **Step 4: Replace Layer Management card (lines 96-119)**

Replace the entire `{#if}...{/if}` (lines 96-119) with:

```svelte
{#if doodledialStore.svgContent}
	<CollapsibleCard title="Layer Management" bind:open={layersOpen}>
		{#snippet icon()}
			<div class="p-2 bg-indigo-100 rounded-lg">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-indigo-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
					/>
				</svg>
			</div>
		{/snippet}
		<LayerList />
	</CollapsibleCard>
{/if}
```

- [ ] **Step 5: Run check and lint**

```bash
pnpm check && pnpm lint
```

Expected: No errors or warnings
