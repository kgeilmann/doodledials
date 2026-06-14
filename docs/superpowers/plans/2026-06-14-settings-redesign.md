# Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure global settings into tabbed sections, add section headers to per-disc settings, move Title/Font Size into OffsetScaleControl, and add missing global defaults for `pathLabelFontSize` and `discTitleFontSize`.

**Architecture:** Global persisted config gains two new fields and a tabbed UI. Per-disc settings get labeled sections. Disc title/font-size controls move from `+page.svelte` inline markup into `OffsetScaleControl.svelte`.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add new fields to GlobalConfigStore

**Files:**

- Modify: `src/lib/stores/global-config.svelte.ts`
- Test: `src/lib/stores/global-config.spec.ts`

- [ ] **Step 1: Add `pathLabelFontSize` and `discTitleFontSize` to the interface and defaults**

In `src/lib/stores/global-config.svelte.ts`, add the new fields:

```ts
interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: ExportFormat;
	titleFontFamily: string;
	centerMarkType: CenterMarkType;
	pathLabelFontSize: number;
	discTitleFontSize: number;
}

export const DEFAULTS = {
	diameter: 100,
	centerHoleDiameter: 0.5,
	pathLabelOptimizerEnabled: false,
	forceDirectedOptimizerEnabled: false,
	optimizerGapDefault: 3,
	bruteforceTimeLimit: 120,
	defaultExportFormat: 'laser-svg',
	titleFontFamily: 'sans-serif',
	centerMarkType: 'hole' as CenterMarkType,
	pathLabelFontSize: 10,
	discTitleFontSize: 12
} as const satisfies PersistedConfig;
```

- [ ] **Step 2: Add $state fields in the class constructor and body**

```ts
class GlobalConfigStore {
	diameter: number = $state(DEFAULTS.diameter);
	centerHoleDiameter: number = $state(DEFAULTS.centerHoleDiameter);
	pathLabelOptimizerEnabled: boolean = $state(DEFAULTS.pathLabelOptimizerEnabled);
	forceDirectedOptimizerEnabled: boolean = $state(DEFAULTS.forceDirectedOptimizerEnabled);
	optimizerGapDefault: number = $state(DEFAULTS.optimizerGapDefault);
	bruteforceTimeLimit: number = $state(DEFAULTS.bruteforceTimeLimit);
	defaultExportFormat: ExportFormat = $state(DEFAULTS.defaultExportFormat);
	titleFontFamily: string = $state(DEFAULTS.titleFontFamily);
	centerMarkType: CenterMarkType = $state(DEFAULTS.centerMarkType);
	pathLabelFontSize: number = $state(DEFAULTS.pathLabelFontSize);
	discTitleFontSize: number = $state(DEFAULTS.discTitleFontSize);
```

- [ ] **Step 3: Update the constructor effect to track new fields**

```ts
constructor() {
	this._load();
	$effect.root(() => {
		$effect(() => {
			void this.diameter;
			void this.centerHoleDiameter;
			void this.pathLabelOptimizerEnabled;
			void this.forceDirectedOptimizerEnabled;
			void this.optimizerGapDefault;
			void this.bruteforceTimeLimit;
			void this.defaultExportFormat;
			void this.titleFontFamily;
			void this.centerMarkType;
			void this.pathLabelFontSize;
			void this.discTitleFontSize;
			this._save();
		});
	});
}
```

- [ ] **Step 4: Update the `reset()` method**

```ts
reset() {
	this.diameter = DEFAULTS.diameter;
	this.centerHoleDiameter = DEFAULTS.centerHoleDiameter;
	this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
	this.forceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
	this.optimizerGapDefault = DEFAULTS.optimizerGapDefault;
	this.bruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
	this.defaultExportFormat = DEFAULTS.defaultExportFormat;
	this.titleFontFamily = DEFAULTS.titleFontFamily;
	this.centerMarkType = DEFAULTS.centerMarkType;
	this.pathLabelFontSize = DEFAULTS.pathLabelFontSize;
	this.discTitleFontSize = DEFAULTS.discTitleFontSize;
}
```

- [ ] **Step 5: Update `_load()` to read new fields**

```ts
private _load(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
			this.diameter = parsed.diameter ?? DEFAULTS.diameter;
			this.centerHoleDiameter = parsed.centerHoleDiameter ?? DEFAULTS.centerHoleDiameter;
			this.pathLabelOptimizerEnabled =
				parsed.pathLabelOptimizerEnabled ?? DEFAULTS.pathLabelOptimizerEnabled;
			this.forceDirectedOptimizerEnabled =
				parsed.forceDirectedOptimizerEnabled ?? DEFAULTS.forceDirectedOptimizerEnabled;
			this.optimizerGapDefault = parsed.optimizerGapDefault ?? DEFAULTS.optimizerGapDefault;
			this.bruteforceTimeLimit = parsed.bruteforceTimeLimit ?? DEFAULTS.bruteforceTimeLimit;
			this.defaultExportFormat = parsed.defaultExportFormat ?? DEFAULTS.defaultExportFormat;
			this.titleFontFamily = parsed.titleFontFamily ?? DEFAULTS.titleFontFamily;
			this.centerMarkType = parsed.centerMarkType ?? DEFAULTS.centerMarkType;
			this.pathLabelFontSize = parsed.pathLabelFontSize ?? DEFAULTS.pathLabelFontSize;
			this.discTitleFontSize = parsed.discTitleFontSize ?? DEFAULTS.discTitleFontSize;
		}
	} catch (e) {
		console.warn('[global-config] Failed to load persisted config, using defaults:', e);
	}
}
```

- [ ] **Step 6: Update `_save()` to include new fields**

```ts
private _save(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({
			diameter: this.diameter,
			centerHoleDiameter: this.centerHoleDiameter,
			pathLabelOptimizerEnabled: this.pathLabelOptimizerEnabled,
			forceDirectedOptimizerEnabled: this.forceDirectedOptimizerEnabled,
			optimizerGapDefault: this.optimizerGapDefault,
			bruteforceTimeLimit: this.bruteforceTimeLimit,
			defaultExportFormat: this.defaultExportFormat,
			titleFontFamily: this.titleFontFamily,
			centerMarkType: this.centerMarkType,
			pathLabelFontSize: this.pathLabelFontSize,
			discTitleFontSize: this.discTitleFontSize
		})
	);
}
```

- [ ] **Step 7: Add tests for new fields in `global-config.spec.ts`**

Add these tests at the end of the file:

```ts
it('has default pathLabelFontSize of 10', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	expect(globalConfig.pathLabelFontSize).toBe(10);
});

it('persists and restores pathLabelFontSize', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.pathLabelFontSize = 14;
	globalConfig.save();
	const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
	expect(saved.pathLabelFontSize).toBe(14);
});

it('resets pathLabelFontSize to default', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.pathLabelFontSize = 16;
	globalConfig.reset();
	expect(globalConfig.pathLabelFontSize).toBe(10);
});

it('has default discTitleFontSize of 12', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	expect(globalConfig.discTitleFontSize).toBe(12);
});

it('persists and restores discTitleFontSize', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.discTitleFontSize = 16;
	globalConfig.save();
	const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
	expect(saved.discTitleFontSize).toBe(16);
});

it('resets discTitleFontSize to default', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.discTitleFontSize = 20;
	globalConfig.reset();
	expect(globalConfig.discTitleFontSize).toBe(12);
});
```

- [ ] **Step 8: Run tests to verify**

Run: `pnpx vitest run src/lib/stores/global-config.spec.ts`
Expected: All 20+ tests pass

- [ ] **Step 9: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts src/lib/stores/global-config.spec.ts
git commit -m "feat: add pathLabelFontSize and discTitleFontSize to global config"
```

---

### Task 2: Update DoodledialStore to seed new fields from global config

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`
- Test: `src/lib/stores/doodledial-store.spec.ts`

- [ ] **Step 1: Update `GlobalConfigLike` interface to include new fields**

```ts
interface GlobalConfigLike {
	diameter: number;
	pathLabelOptimizerEnabled: boolean;
	titleFontFamily: string;
	pathLabelFontSize: number;
	discTitleFontSize: number;
}
```

- [ ] **Step 2: Update `createDoodledialStore` to seed disc title font size from global**

```ts
let config = $state<DialConfig>({
	...DEFAULT_DIAL_CONFIG,
	diameter: globalConfig.diameter,
	titleFontFamily: globalConfig.titleFontFamily
});

let discTitle = $state<string>('');
let discTitleX = $state<number>(100);
let discTitleY = $state<number>(20);
let discTitleFontSize = $state<number>(globalConfig.discTitleFontSize);
```

- [ ] **Step 3: Update `reset()` to restore from global config**

```ts
reset() {
	labelPlacementStore.reset();
	config = {
		...DEFAULT_DIAL_CONFIG,
		diameter: globalConfig.diameter,
		titleFontFamily: globalConfig.titleFontFamily
	};
	svgContent = null;
	originalRawSvg = null;
	combinedSvg = null;
	isLoading = false;
	error = null;
	layerStore.reset();
	detectionStore.reset();
	discTitle = '';
	discTitleX = 100;
	discTitleY = 20;
	discTitleFontSize = globalConfig.discTitleFontSize;
}
```

- [ ] **Step 4: Update mock config in tests**

In `src/lib/stores/doodledial-store.spec.ts`, add the missing fields to `createStoreWithMockConfig`:

```ts
function createStoreWithMockConfig() {
	const mockConfig = {
		pathLabelOptimizerEnabled: true,
		diameter: 100,
		save: vi.fn(),
		open: vi.fn(),
		close: vi.fn(),
		reset: vi.fn(),
		centerHoleDiameter: 0.5,
		forceDirectedOptimizerEnabled: false,
		optimizerGapDefault: 3,
		bruteforceTimeLimit: 120,
		defaultExportFormat: 'laser-svg' as const,
		dialogOpen: false,
		titleFontFamily: 'sans-serif',
		pathLabelFontSize: 10,
		discTitleFontSize: 12
	};
	...
```

- [ ] **Step 5: Run tests to verify**

Run: `pnpx vitest run src/lib/stores/doodledial-store.spec.ts`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts src/lib/stores/doodledial-store.spec.ts
git commit -m "feat: seed discTitleFontSize from global config"
```

---

### Task 3: Add tabs to GlobalConfigDialog

**Files:**

- Modify: `src/lib/components/GlobalConfigDialog.svelte`

- [ ] **Step 1: Replace flat layout with tabbed structure**

Rewrite `GlobalConfigDialog.svelte` to use a tabbed UI. The full component:

````svelte
<script lang="ts">
	import { DEFAULTS, globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import type { ExportFormat } from '$lib/utils/export-formats';
	import type { CenterMarkType } from '$lib/types/doodledial';
	import { FONT_FAMILIES } from '$lib/utils/constants';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const { minDiameter, maxDiameter } = doodledialStore.config;

	let activeTab = $state<'default-disc' | 'default-optimizer' | 'experimental' | 'export'>('default-disc');

	let draftDiameter = $state(globalConfig.diameter);
	let draftCenterHoleDiameter = $state(globalConfig.centerHoleDiameter);
	let draftCenterMarkType = $state<CenterMarkType>(globalConfig.centerMarkType);
	let draftTitleFontFamily = $state(globalConfig.titleFontFamily);
	let draftPathLabelFontSize = $state(globalConfig.pathLabelFontSize);
	let draftDiscTitleFontSize = $state(globalConfig.discTitleFontSize);

	let draftOptimizerGapDefault = $state(globalConfig.optimizerGapDefault);
	let draftBruteforceTimeLimit = $state(globalConfig.bruteforceTimeLimit);

	let draftPathLabelOptimizerEnabled = $state(globalConfig.pathLabelOptimizerEnabled);
	let draftForceDirectedOptimizerEnabled = $state(globalConfig.forceDirectedOptimizerEnabled);

	let draftDefaultExportFormat = $state<ExportFormat>(globalConfig.defaultExportFormat);

	function handleDiameterInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		const clamped = Math.min(Math.max(value, minDiameter), maxDiameter);
		draftDiameter = clamped;
	}

	function handleCenterHoleInputChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		const clamped = Math.min(Math.max(value, 0), 3);
		draftCenterHoleDiameter = clamped;
	}

	function handleTogglePathLabel() {
		draftPathLabelOptimizerEnabled = !draftPathLabelOptimizerEnabled;
	}

	function handleToggleForceDirected() {
		draftForceDirectedOptimizerEnabled = !draftForceDirectedOptimizerEnabled;
	}

	function handleOptimizerGapInputChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 0) return;
		draftOptimizerGapDefault = value;
	}

	function handleBruteforceTimeLimitInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 1) return;
		draftBruteforceTimeLimit = value;
	}

	function handleReset() {
		draftDiameter = DEFAULTS.diameter;
		draftCenterHoleDiameter = DEFAULTS.centerHoleDiameter;
		draftCenterMarkType = DEFAULTS.centerMarkType;
		draftTitleFontFamily = DEFAULTS.titleFontFamily;
		draftPathLabelFontSize = DEFAULTS.pathLabelFontSize;
		draftDiscTitleFontSize = DEFAULTS.discTitleFontSize;
		draftOptimizerGapDefault = DEFAULTS.optimizerGapDefault;
		draftBruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		draftPathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
		draftForceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
		draftDefaultExportFormat = DEFAULTS.defaultExportFormat;
	}

	function handleOK() {
		globalConfig.diameter = draftDiameter;
		globalConfig.centerHoleDiameter = draftCenterHoleDiameter;
		globalConfig.centerMarkType = draftCenterMarkType;
		globalConfig.titleFontFamily = draftTitleFontFamily;
		globalConfig.pathLabelFontSize = draftPathLabelFontSize;
		globalConfig.discTitleFontSize = draftDiscTitleFontSize;
		globalConfig.optimizerGapDefault = draftOptimizerGapDefault;
		globalConfig.bruteforceTimeLimit = draftBruteforceTimeLimit;
		globalConfig.pathLabelOptimizerEnabled = draftPathLabelOptimizerEnabled;
		globalConfig.forceDirectedOptimizerEnabled = draftForceDirectedOptimizerEnabled;
		globalConfig.defaultExportFormat = draftDefaultExportFormat;
		globalConfig.save();
		doodledialStore.setCenterHoleDiameter(draftCenterHoleDiameter);
		open = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="global-config-dialog"
	>
		<button
			type="button"
			onclick={handleCancel}
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close settings dialog"
		></button>

		<section
			class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
		>
			<div class="mb-6">
				<h2 class="text-xl font-semibold text-gray-900">Global Settings</h2>
				<p class="text-sm text-gray-600 mt-1">Configuration persisted across sessions</p>
			</div>

			<!-- Tabs -->
			<div class="flex gap-1 mb-6 border-b border-gray-200" role="tablist">
				<button
					role="tab"
					aria-selected={activeTab === 'default-disc'}
					onclick={() => (activeTab = 'default-disc')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-disc' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
				>Default Disc Settings</button>
				<button
					role="tab"
					aria-selected={activeTab === 'default-optimizer'}
					onclick={() => (activeTab = 'default-optimizer')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-optimizer' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
				>Default Optimizer</button>
				<button
					role="tab"
					aria-selected={activeTab === 'experimental'}
					onclick={() => (activeTab = 'experimental')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'experimental' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
				>Experimental</button>
				<button
					role="tab"
					aria-selected={activeTab === 'export'}
					onclick={() => (activeTab = 'export')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
				>Export</button>
			</div>

			<!-- Tab Content -->
			<div class="space-y-6 min-h-[280px]">
				{#if activeTab === 'default-disc'}
					<div>
						<div class="flex items-center justify-between mb-2">
							<label for="global-diameter-input" class="text-sm font-medium text-gray-700">Disc Diameter</label>
							<div class="flex items-center gap-2">
								<input
									id="global-diameter-input"
									type="number"
									min={minDiameter}
									max={maxDiameter}
									value={draftDiameter}
									onchange={handleDiameterInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">mm</span>
							</div>
						</div>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="center-hole-diameter-input" class="text-sm font-medium text-gray-700">Center Hole Diameter</label>
							<div class="flex items-center gap-2">
								<input
									id="center-hole-diameter-input"
									type="number"
									min="0"
									max="3"
									step="0.5"
									value={draftCenterHoleDiameter}
									onchange={handleCenterHoleInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">mm</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">for needle axle. Set to 0 for no hole.</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="mb-3">
							<span class="text-sm font-medium text-gray-700">Center Mark Type</span>
							<p class="text-xs text-gray-500 mt-0.5">How the center is rendered in laser exports</p>
						</div>
						<fieldset class="flex gap-2">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType === 'hole' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="center-mark-type" value="hole" checked={draftCenterMarkType === 'hole'} onchange={() => (draftCenterMarkType = 'hole')} class="h-4 w-4 accent-indigo-600" />
								<span>Hole</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType === 'crosshair' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="center-mark-type" value="crosshair" checked={draftCenterMarkType === 'crosshair'} onchange={() => (draftCenterMarkType = 'crosshair')} class="h-4 w-4 accent-indigo-600" />
								<span>Crosshair</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType === 'none' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="center-mark-type" value="none" checked={draftCenterMarkType === 'none'} onchange={() => (draftCenterMarkType = 'none')} class="h-4 w-4 accent-indigo-600" />
								<span>None</span>
							</label>
						</fieldset>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-title-font-family" class="text-sm font-medium text-gray-700">Title Font</label>
							<select
								id="global-title-font-family"
								value={draftTitleFontFamily}
								onchange={(e) => (draftTitleFontFamily = (e.target as HTMLSelectElement).value)}
								class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							>
								{#each FONT_FAMILIES as font (font)}
									<option value={font}>{font}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-path-label-font-size" class="text-sm font-medium text-gray-700">Path Label Font Size</label>
							<div class="flex items-center gap-2">
								<input
									id="global-path-label-font-size"
									type="number"
									min="4"
									max="40"
									value={draftPathLabelFontSize}
									oninput={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (Number.isFinite(v)) draftPathLabelFontSize = v; }}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for path labels</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-disc-title-font-size" class="text-sm font-medium text-gray-700">Disc Title Font Size</label>
							<div class="flex items-center gap-2">
								<input
									id="global-disc-title-font-size"
									type="number"
									min="8"
									max="36"
									value={draftDiscTitleFontSize}
									oninput={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (Number.isFinite(v)) draftDiscTitleFontSize = v; }}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for disc titles</p>
					</div>
				{/if}

				{#if activeTab === 'default-optimizer'}
					<div>
						<div class="flex items-center justify-between mb-2">
							<label for="global-optimizer-gap-input" class="text-sm font-medium text-gray-700">Optimizer Gap</label>
							<div class="flex items-center gap-2">
								<input
									id="global-optimizer-gap-input"
									type="number"
									min="0"
									step="0.5"
									value={draftOptimizerGapDefault}
									onchange={handleOptimizerGapInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">mm</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default gap between cutouts used in optimization</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-bruteforce-time-limit-input" class="text-sm font-medium text-gray-700">Brute Force Time Limit</label>
							<div class="flex items-center gap-2">
								<input
									id="global-bruteforce-time-limit-input"
									type="number"
									min="1"
									step="1"
									value={draftBruteforceTimeLimit}
									onchange={handleBruteforceTimeLimitInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">s</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Maximum runtime for brute force optimizer</p>
					</div>
				{/if}

				{#if activeTab === 'experimental'}
					<div>
						<div class="flex items-center justify-between">
							<div>
								<span class="text-sm font-medium text-gray-700">Path Label Optimizer (Experimental)</span>
								<p class="text-xs text-gray-500 mt-0.5">Enable auto-placement of path labels</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={draftPathLabelOptimizerEnabled}
								aria-label="Toggle path label optimizer"
								onclick={handleTogglePathLabel}
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftPathLabelOptimizerEnabled ? 'bg-indigo-600' : 'bg-gray-200'}"
							>
								<span
									aria-hidden="true"
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftPathLabelOptimizerEnabled ? 'translate-x-5' : 'translate-x-0'}"
								></span>
							</button>
						</div>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between">
							<div>
								<span class="text-sm font-medium text-gray-700">Force Directed Optimizer (Experimental)</span>
								<p class="text-xs text-gray-500 mt-0.5">Use physics-based force directed optimization instead of brute force search</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={draftForceDirectedOptimizerEnabled}
								aria-label="Toggle force directed optimizer"
								data-testid="toggle-force-directed-optimizer"
								onclick={handleToggleForceDirected}
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftForceDirectedOptimizerEnabled ? 'bg-indigo-600' : 'bg-gray-200'}"
							>
								<span
									aria-hidden="true"
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftForceDirectedOptimizerEnabled ? 'translate-x-5' : 'translate-x-0'}"
								></span>
							</button>
						</div>
					</div>
				{/if}

				{#if activeTab === 'export'}
					<div>
						<div class="mb-3">
							<span class="text-sm font-medium text-gray-700">Default Export Format</span>
							<p class="text-xs text-gray-500 mt-0.5">Format used when clicking the main Export button</p>
						</div>
						<fieldset class="flex gap-4">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat === 'preview-svg' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="export-format" value="preview-svg" checked={draftDefaultExportFormat === 'preview-svg'} onchange={() => (draftDefaultExportFormat = 'preview-svg')} class="h-4 w-4 accent-indigo-600" />
								<span>Preview SVG</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat === 'laser-svg' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="export-format" value="laser-svg" checked={draftDefaultExportFormat === 'laser-svg'} onchange={() => (draftDefaultExportFormat = 'laser-svg')} class="h-4 w-4 accent-indigo-600" />
								<span>Laser SVG</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat === 'stl' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input type="radio" name="export-format" value="stl" checked={draftDefaultExportFormat === 'stl'} onchange={() => (draftDefaultExportFormat = 'stl')} class="h-4 w-4 accent-indigo-600" />
								<span>3D STL</span>
							</label>
						</fieldset>
					</div>
				{/if}
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
						onclick={handleCancel}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleOK}
						class="px-4 py-2 rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
						data-testid="global-config-ok-button"
					>
						OK
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
```

- [ ] **Step 2: Verify build**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add tabbed layout to global config dialog"
```

---

### Task 4: Add section headers to OffsetScaleControl and move Title/Font Size into it

**Files:**
- Modify: `src/lib/components/OffsetScaleControl.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add section headers and Title/Font Size controls to OffsetScaleControl**

Wrap fields in labeled sections. Add the title text input and font-size range slider from `+page.svelte` under a Typography section.

The full rewritten `OffsetScaleControl.svelte`:

```svelte
<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import { FONT_FAMILIES } from '$lib/utils/constants';

	function handleOffsetXInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetX(value);
	}

	function handleOffsetYInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetY(value);
	}

	function handleDiameterInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setDiameter(value);
	}

	function handleScaleInput(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value) || 1;
		doodledialStore.setScale(value);
	}

	function handleSizeToFitToggle() {
		doodledialStore.setSizeToFit(!doodledialStore.config.sizeToFit);
	}

	function handlePathLabelFontSizeInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 10;
		doodledialStore.setPathLabelFontSize(value);
	}

	function handleTitleFontFamilyChange(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		doodledialStore.setTitleFontFamily(value);
	}
</script>

<div class="space-y-4">
	<!-- Dimensions -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dimensions</h3>
		<div class="flex items-center justify-between">
			<label for="diameter-input" class="text-sm font-medium text-gray-700">Diameter</label>
			<div class="flex items-center gap-2">
				<input
					id="diameter-input"
					type="number"
					min={doodledialStore.config.minDiameter}
					max={doodledialStore.config.maxDiameter}
					value={doodledialStore.config.diameter}
					oninput={handleDiameterInput}
					disabled={optimizerStore.optimizerPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>
	</div>

	<!-- Image -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Image</h3>
		<div class="flex items-center justify-between">
			<label for="offsetX-input" class="text-sm font-medium text-gray-700">X Offset</label>
			<div class="flex items-center gap-2">
				<input
					id="offsetX-input"
					type="number"
					value={doodledialStore.config.offsetX}
					oninput={handleOffsetXInput}
					disabled={optimizerStore.optimizerPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="offsetY-input" class="text-sm font-medium text-gray-700">Y Offset</label>
			<div class="flex items-center gap-2">
				<input
					id="offsetY-input"
					type="number"
					value={doodledialStore.config.offsetY}
					oninput={handleOffsetYInput}
					disabled={optimizerStore.optimizerPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="scale-input" class="text-sm font-medium text-gray-700">Scale</label>
			<input
				id="scale-input"
				type="number"
				step="0.05"
				value={doodledialStore.config.scale}
				oninput={handleScaleInput}
				disabled={optimizerStore.optimizerPending}
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
			/>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="size-to-fit-toggle" class="text-sm font-medium text-gray-700">Size to Fit</label>
			<button
				id="size-to-fit-toggle"
				type="button"
				role="switch"
				aria-checked={doodledialStore.config.sizeToFit}
				aria-label="Toggle size to fit"
				onclick={handleSizeToFitToggle}
				disabled={!doodledialStore.originalRawSvg || optimizerStore.optimizerPending}
				class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {doodledialStore.config.sizeToFit ? 'bg-indigo-600' : 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span
					class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 {doodledialStore.config.sizeToFit ? 'translate-x-[18px]' : 'translate-x-[3px]'}"
				></span>
			</button>
		</div>
	</div>

	<!-- Typography -->
	<div class="pt-4">
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Typography</h3>

		{#if doodledialStore.svgContent}
			<div class="flex flex-col gap-3 mb-4">
				<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
					<span>Title</span>
					<input
						type="text"
						placeholder="Optional disc title..."
						value={doodledialStore.discTitle}
						oninput={(e) => doodledialStore.setDiscTitle(e.currentTarget.value)}
						disabled={optimizerStore.optimizerPending}
						class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
					/>
				</label>
				<div class="flex items-center gap-3">
					<span class="text-xs font-medium text-gray-600 shrink-0">Font size</span>
					<input
						type="range"
						min="8"
						max="36"
						step="1"
						value={doodledialStore.discTitleFontSize}
						oninput={(e) => doodledialStore.setDiscTitleFontSize(Number(e.currentTarget.value))}
						disabled={optimizerStore.optimizerPending}
						class="flex-1 accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<span class="text-xs text-gray-500 w-8 text-right">{doodledialStore.discTitleFontSize}</span>
				</div>
				<p class="text-xs text-gray-400">Drag title text on the disc to reposition it.</p>
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<label for="path-label-font-size-input" class="text-sm font-medium text-gray-700">Label Font Size</label>
			<div class="flex items-center gap-2">
				<input
					id="path-label-font-size-input"
					type="number"
					min="4"
					max="40"
					value={doodledialStore.config.pathLabelFontSize}
					oninput={handlePathLabelFontSizeInput}
					disabled={optimizerStore.optimizerPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">px</span>
			</div>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="title-font-family-select" class="text-sm font-medium text-gray-700">Title Font</label>
			<select
				id="title-font-family-select"
				value={doodledialStore.config.titleFontFamily}
				onchange={handleTitleFontFamilyChange}
				disabled={optimizerStore.optimizerPending}
				class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#each FONT_FAMILIES as font (font)}
					<option value={font}>{font}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
```

- [ ] **Step 2: Remove Title/Font Size from `+page.svelte`**

Replace lines 94-126 (the `{#if doodledialStore.svgContent}` block with Title/Font Size controls inside the "Disc Settings" section) with only the `<OffsetScaleControl />`. The section becomes:

```svelte
<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
	<div class="flex items-center gap-3 mb-4">
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
		<h2 class="text-lg font-semibold text-gray-800">Disc Settings</h2>
	</div>
	<OffsetScaleControl />
</section>
```

- [ ] **Step 3: Verify build**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/OffsetScaleControl.svelte src/routes/+page.svelte
git commit -m "feat: add section headers to per-disc settings, move title/typography into OffsetScaleControl"
```

---

### Task 5: Run full verification

**Files:** (none — verification only)

- [ ] **Step 1: Run checks**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

- [ ] **Step 2: Run tests**

Run: `pnpx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint/type issues after settings redesign"
```
````
