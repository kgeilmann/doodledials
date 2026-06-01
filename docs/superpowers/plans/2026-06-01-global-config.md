# Global Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist disc diameter and path label optimizer feature flag to localStorage with a settings dialog.

**Architecture:** A `GlobalConfigStore` class with `$state` fields syncs to localStorage via `$effect`. A modal dialog provides the UI. Existing `doodledialStore` reads the feature flag from `globalConfig` instead of the env var. The diameter slider moves from `DiameterControl.svelte` to the dialog; `DiameterControl` keeps offset/scale.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest

---

### Task 1: Create the global config store

**Files:**

- Create: `src/lib/stores/global-config.svelte.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/stores/global-config.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'doodledial:config';

describe('GlobalConfigStore', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('uses defaults when localStorage is empty', async () => {
		const { GlobalConfigStore } = await import('./global-config.svelte.ts');
		// We can't easily test the singleton; test the class behavior via a test helper
		// Instead, test that defaults are reasonable
		expect(200).toBe(200); // placeholder — see Task 6 for full test suite
	});
});
```

Wait — the class uses `$state` and `$effect` which only work in `.svelte.ts` files processed by Svelte's compiler. The test import needs proper setup. Let me come back to tests in Task 6. For now, create the implementation.

- [ ] **Step 2: Create `src/lib/stores/global-config.svelte.ts`**

```ts
const STORAGE_KEY = 'doodledial:config';

interface PersistedConfig {
	diameter: number;
	pathLabelOptimizerEnabled: boolean;
}

const DEFAULTS: PersistedConfig = {
	diameter: 200,
	pathLabelOptimizerEnabled: true
};

class GlobalConfigStore {
	diameter = $state(DEFAULTS.diameter);
	pathLabelOptimizerEnabled = $state(DEFAULTS.pathLabelOptimizerEnabled);
	dialogOpen = $state(false);

	constructor() {
		this._load();
		$effect.root(() => {
			$effect(() => {
				this._save();
			});
		});
	}

	open() {
		this.dialogOpen = true;
	}

	close() {
		this.dialogOpen = false;
	}

	reset() {
		this.diameter = DEFAULTS.diameter;
		this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
	}

	private _load(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
				this.diameter = parsed.diameter ?? DEFAULTS.diameter;
				this.pathLabelOptimizerEnabled =
					parsed.pathLabelOptimizerEnabled ?? DEFAULTS.pathLabelOptimizerEnabled;
			}
		} catch {
			// ignore corrupt data, use defaults
		}
	}

	private _save(): void {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				diameter: this.diameter,
				pathLabelOptimizerEnabled: this.pathLabelOptimizerEnabled
			})
		);
	}
}

export const globalConfig = new GlobalConfigStore();
```

- [ ] **Step 3: Run `pnpm check` and `pnpm lint` to verify no errors**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts
git commit -m "feat: add global config store with localStorage persistence"
```

---

### Task 2: Create the GlobalConfigDialog component

**Files:**

- Create: `src/lib/components/GlobalConfigDialog.svelte`

- [ ] **Step 1: Create `src/lib/components/GlobalConfigDialog.svelte`**

```svelte
<script lang="ts">
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleDiameterSliderChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		globalConfig.diameter = value;
		doodledialStore.setDiameter(value);
	}

	function handleDiameterInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		const clamped = Math.min(Math.max(value, 50), 200);
		globalConfig.diameter = clamped;
		doodledialStore.setDiameter(clamped);
	}

	function handleToggle() {
		globalConfig.pathLabelOptimizerEnabled = !globalConfig.pathLabelOptimizerEnabled;
	}

	function handleReset() {
		globalConfig.reset();
		doodledialStore.setDiameter(globalConfig.diameter);
	}

	function handleClose() {
		globalConfig.close();
	}
</script>

{#if globalConfig.dialogOpen}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="global-config-dialog"
	>
		<button
			type="button"
			onclick={handleClose}
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close settings dialog"
		></button>

		<section
			class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
		>
			<div class="flex items-start justify-between gap-4 mb-6">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Global Settings</h2>
					<p class="text-sm text-gray-600 mt-1">Configuration persisted across sessions</p>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Close
				</button>
			</div>

			<div class="space-y-6">
				<div>
					<div class="flex items-center justify-between mb-2">
						<label for="global-diameter-input" class="text-sm font-medium text-gray-700"
							>Disc Diameter</label
						>
						<div class="flex items-center gap-2">
							<input
								id="global-diameter-input"
								type="number"
								min="50"
								max="200"
								value={globalConfig.diameter}
								onchange={handleDiameterInputChange}
								class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<span class="text-sm text-gray-500">mm</span>
						</div>
					</div>
					<input
						type="range"
						min="50"
						max="200"
						value={globalConfig.diameter}
						oninput={handleDiameterSliderChange}
						class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
					/>
					<div class="flex justify-between text-xs text-gray-400 mt-1">
						<span>50mm</span>
						<span>200mm</span>
					</div>
				</div>

				<div class="border-t border-gray-100 pt-6">
					<div class="flex items-center justify-between">
						<div>
							<span class="text-sm font-medium text-gray-700">Path Label Optimizer</span>
							<p class="text-xs text-gray-500 mt-0.5">Enable auto-placement of path labels</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={globalConfig.pathLabelOptimizerEnabled}
							onclick={handleToggle}
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {globalConfig.pathLabelOptimizerEnabled
								? 'bg-indigo-600'
								: 'bg-gray-200'}"
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {globalConfig.pathLabelOptimizerEnabled
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
				<button
					type="button"
					onclick={handleReset}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Reset Defaults
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleClose}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
						data-testid="global-config-close-button"
					>
						Close
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
```

- [ ] **Step 2: Run svelte-autofixer on the component**

Run the Svelte autofixer tool to validate.

- [ ] **Step 3: Run `pnpm check` and `pnpm lint` to verify no errors**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add global configuration dialog"
```

---

### Task 3: Remove diameter controls from DiameterControl

**Files:**

- Modify: `src/lib/components/DiameterControl.svelte`

- [ ] **Step 1: Remove diameter slider and number input from `DiameterControl.svelte`**

Keep offsetX, offsetY, and scale controls. Remove the diameter section (lines 73-99).

Old code to remove (lines 73-99):

```svelte
<div class="flex items-center justify-between">
	<label for="diameter-input" class="text-sm font-medium text-gray-700">Disc Diameter</label>
	<div class="flex items-center gap-2">
		<input
			id="diameter-input"
			type="number"
			min={doodledialStore.config.minDiameter}
			max={doodledialStore.config.maxDiameter}
			value={doodledialStore.config.diameter}
			onchange={handleDiameterInputChange}
			class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
		/>
		<span class="text-sm text-gray-500">mm</span>
	</div>
</div>
<input
	type="range"
	min={doodledialStore.config.minDiameter}
	max={doodledialStore.config.maxDiameter}
	value={doodledialStore.config.diameter}
	oninput={handleDiameterSliderChange}
	class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
/>
<div class="flex justify-between text-xs text-gray-400">
	<span>{doodledialStore.config.minDiameter}mm</span>
	<span>{doodledialStore.config.maxDiameter}mm</span>
</div>
```

Also remove the now-unused handlers `handleDiameterSliderChange` and `handleDiameterInputChange` (lines 4-14).

- [ ] **Step 2: Run `pnpm check` and `pnpm lint` to verify no errors**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/DiameterControl.svelte
git commit -m "refactor: remove diameter controls from DiameterControl"
```

---

### Task 4: Wire globalConfig into doodledialStore

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Replace env var with globalConfig and sync diameter**

Changes:

a) Add import at top:

```ts
import { globalConfig } from '$lib/stores/global-config.svelte';
```

b) Remove the `AUTO_PATH_LABEL_PLACEMENT_ENABLED` constant (line 9-10):

```ts
// DELETE these two lines:
const AUTO_PATH_LABEL_PLACEMENT_ENABLED =
	import.meta.env.VITE_ENABLE_AUTO_PATH_LABEL_PLACEMENT !== 'false';
```

c) Replace all references to `AUTO_PATH_LABEL_PLACEMENT_ENABLED` with `globalConfig.pathLabelOptimizerEnabled`:

1. `executeAutoPlacementNow` (line 72): `if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED)` → `if (!globalConfig.pathLabelOptimizerEnabled)`
2. `scheduleLabelAutoPlacement` (line 94): `if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED)` → `if (!globalConfig.pathLabelOptimizerEnabled)`
3. `setAutoPlacementRunner` (line 171): `if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED)` → `if (!globalConfig.pathLabelOptimizerEnabled)`
4. `requestLayerLabelAutoPlacement` (line 324): `if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED)` → `if (!globalConfig.pathLabelOptimizerEnabled)`
5. `autoPathLabelPlacementEnabled` getter (line 145-147): change return to `globalConfig.pathLabelOptimizerEnabled`

d) Add diameter sync at the end of `createDoodledialStore()`, right before the return statement:

```ts
// Initialize diameter from persisted global config
config = { ...config, diameter: globalConfig.diameter };
```

e) In `setDiameter` (line 151-153), also persist to globalConfig:

```ts
setDiameter(diameter: number) {
	config = { ...config, diameter };
	globalConfig.diameter = diameter;
},
```

f) In `reset()` (line 349-363), also reset globalConfig:

```ts
reset() {
	// ... existing code ...
	config = { ...DEFAULT_DIAL_CONFIG };
	globalConfig.reset();
	globalConfig.diameter = DEFAULT_DIAL_CONFIG.diameter;
	// ... rest of existing code ...
},
```

- [ ] **Step 2: Run `pnpm check` and `pnpm lint` to verify no errors**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: wire globalConfig into doodledialStore, replace env var"
```

---

### Task 5: Add gear icon and render dialog in +page.svelte

**Files:**

- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add gear icon button and render the dialog**

a) Add import at top of script:

```ts
import GlobalConfigDialog from '$lib/components/GlobalConfigDialog.svelte';
import { globalConfig } from '$lib/stores/global-config.svelte';
```

b) Add gear icon button to the top action bar (between the brute force button and the export button, around line 481-483):

```svelte
<button
	onclick={() => globalConfig.open()}
	class="px-3 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out hover:bg-gray-50 active:scale-95"
	aria-label="Open global settings"
	data-testid="global-config-gear-button"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-5 w-5"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="2"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
		/>
		<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
	</svg>
</button>
```

c) Add `<GlobalConfigDialog />` near the other dialog sections, after the bruteforce result dialog (after line 835):

```svelte
<GlobalConfigDialog />
```

- [ ] **Step 2: Run `pnpm check` and `pnpm lint` to verify no errors**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add gear icon and render global config dialog"
```

---

### Task 6: Write tests

**Files:**

- Create: `src/lib/stores/global-config.spec.ts`

- [ ] **Step 1: Create test file**

```ts
import { describe, it, expect, beforeEach } from 'vitest';

const STORAGE_KEY = 'doodledial:config';

describe('GlobalConfigStore', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should be importable', async () => {
		const mod = await import('./global-config.svelte.ts');
		expect(mod.globalConfig).toBeDefined();
		expect(typeof mod.globalConfig.diameter).toBe('number');
		expect(typeof mod.globalConfig.pathLabelOptimizerEnabled).toBe('boolean');
	});

	it('should persist to localStorage on changes', async () => {
		const { globalConfig: store } = await import('./global-config.svelte.ts');
		// Track what's in localStorage after a change
		store.diameter = 150;
		// Wait a tick for $effect to fire
		await new Promise((r) => setTimeout(r, 0));
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.diameter).toBe(150);
	});
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm vitest run src/lib/stores/global-config.spec.ts`
Expected: Tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/global-config.spec.ts
git commit -m "test: add global config store tests"
```

---

### Task 7: Final validation

- [ ] **Step 1: Run full check suite**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings.

- [ ] **Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 3: Review all changed files**

```bash
git diff --stat
git log --oneline -10
```

Verify the changes look correct and consistent.
