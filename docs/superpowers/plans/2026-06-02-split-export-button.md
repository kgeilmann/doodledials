# Split Export Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Export dropdown with a split button (main click exports default format, chevron opens format picker) and add `defaultExportFormat` to GlobalConfig.

**Architecture:** The `GlobalConfigStore` gains a `defaultExportFormat` field. `ExportButton.svelte` is rewritten to a two-part split button: a main button that reads the default format and triggers the appropriate export, and a chevron button that opens a dropdown to pick a format for one-off use. `GlobalConfigDialog.svelte` gets a radio-group control for the default format.

**Tech Stack:** Svelte 5 (runes), Tailwind CSS, TypeScript, Vitest, Playwright

---

### Task 1: Add `defaultExportFormat` to GlobalConfigStore

**Files:**

- Modify: `src/lib/stores/global-config.svelte.ts`
- Test: `src/lib/stores/global-config.spec.ts`

- [ ] **Step 1: Add `defaultExportFormat` tests to global-config.spec.ts**

Add these tests after the existing `bruteforceTimeLimit` tests in `src/lib/stores/global-config.spec.ts`:

```typescript
it('has default defaultExportFormat of laser-svg', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	expect(globalConfig.defaultExportFormat).toBe('laser-svg');
});

it('persists and restores defaultExportFormat', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.defaultExportFormat = 'stl';
	globalConfig.save();
	const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
	expect(saved.defaultExportFormat).toBe('stl');
});

it('resets defaultExportFormat to default', async () => {
	const { globalConfig } = await import('./global-config.svelte.ts');
	globalConfig.defaultExportFormat = 'stl';
	globalConfig.reset();
	expect(globalConfig.defaultExportFormat).toBe('laser-svg');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/stores/global-config.spec.ts`
Expected: 3 failures — `defaultExportFormat` not found on GlobalConfigStore

- [ ] **Step 3: Add `defaultExportFormat` to GlobalConfigStore**

In `src/lib/stores/global-config.svelte.ts`:

Add `defaultExportFormat` to `PersistedConfig`:

```typescript
interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: 'laser-svg' | 'stl';
}
```

Add to `DEFAULTS`:

```typescript
const DEFAULTS: PersistedConfig = {
	diameter: 200,
	centerHoleDiameter: 2,
	pathLabelOptimizerEnabled: false,
	forceDirectedOptimizerEnabled: false,
	optimizerGapDefault: 5,
	bruteforceTimeLimit: 120,
	defaultExportFormat: 'laser-svg'
};
```

Add to class fields:

```typescript
defaultExportFormat = $state<'laser-svg' | 'stl'>(DEFAULTS.defaultExportFormat);
```

Add to `reset()`:

```typescript
this.defaultExportFormat = DEFAULTS.defaultExportFormat;
```

Add to `_load()`:

```typescript
this.defaultExportFormat = parsed.defaultExportFormat ?? DEFAULTS.defaultExportFormat;
```

Add to `_save()`:

```typescript
defaultExportFormat: this.defaultExportFormat,
```

- [ ] **Step 4: Re-run tests to verify they pass**

Run: `pnpm vitest run src/lib/stores/global-config.spec.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts src/lib/stores/global-config.spec.ts
git commit -m "feat: add defaultExportFormat to GlobalConfigStore"
```

---

### Task 2: Add default export format selector to GlobalConfigDialog

**Files:**

- Modify: `src/lib/components/GlobalConfigDialog.svelte`

- [ ] **Step 1: Add draft state and handlers for defaultExportFormat**

In the `<script>` section of `GlobalConfigDialog.svelte`, add after the existing draft state lines:

```typescript
let draftDefaultExportFormat = $state<'laser-svg' | 'stl'>(globalConfig.defaultExportFormat);
```

In `handleReset()`, add:

```typescript
draftDefaultExportFormat = DEFAULTS.defaultExportFormat;
```

In `handleOK()`, add:

```typescript
globalConfig.defaultExportFormat = draftDefaultExportFormat;
```

- [ ] **Step 2: Add the export format radio group UI**

Add this block inside the `<div class="space-y-6">` section, before the closing `</div>` — ideally after the brute force time limit section:

```svelte
<div class="border-t border-gray-100 pt-6">
	<div class="mb-3">
		<span class="text-sm font-medium text-gray-700">Default Export Format</span>
		<p class="text-xs text-gray-500 mt-0.5">Format used when clicking the main Export button</p>
	</div>
	<fieldset class="flex gap-4">
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat ===
			'laser-svg'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="export-format"
				value="laser-svg"
				checked={draftDefaultExportFormat === 'laser-svg'}
				onchange={() => (draftDefaultExportFormat = 'laser-svg')}
				class="h-4 w-4 accent-indigo-600"
			/>
			<span>Laser SVG</span>
		</label>
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat ===
			'stl'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="export-format"
				value="stl"
				checked={draftDefaultExportFormat === 'stl'}
				onchange={() => (draftDefaultExportFormat = 'stl')}
				class="h-4 w-4 accent-indigo-600"
			/>
			<span>3D STL</span>
		</label>
	</fieldset>
</div>
```

- [ ] **Step 3: Verify the dialog compiles and renders**

Run: `pnpm check`
Expected: No type or Svelte compilation errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add default export format selector to GlobalConfigDialog"
```

---

### Task 3: Rewrite ExportButton to split-button pattern

**Files:**

- Modify: `src/lib/components/ExportButton.svelte`
- Test: `tests/export.spec.ts` (to be updated in Task 4)

- [ ] **Step 1: Rewrite ExportButton.svelte**

Replace the entire file content with the split-button implementation:

```svelte
<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { exportLaserSvg, exportStl } from '$lib/utils/export-formats';

	let menuOpen = $state(false);
	let discThicknessMm = $state('3');
	let markThicknessMm = $state('0.5');

	const STL_DIALOG_ID = 'stl-export-dialog';

	function getStlDialog(): HTMLDialogElement | null {
		return document.getElementById(STL_DIALOG_ID) as HTMLDialogElement | null;
	}

	function parseThickness(value: string, fallback: number): number {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}

	function createDownload(svgOrStl: string, filename: string, mimeType: string) {
		const blob = new Blob([svgOrStl], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportSvg() {
		if (!doodledialStore.svgContent) return;

		try {
			const svg = exportLaserSvg(
				doodledialStore.svgContent,
				doodledialStore.config,
				doodledialStore.layers
			);
			createDownload(svg, 'doodledial.svg', 'image/svg+xml');
			menuOpen = false;
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	function openStlDialog() {
		if (!doodledialStore.svgContent) return;
		menuOpen = false;
		getStlDialog()?.showModal();
	}

	function closeStlDialog() {
		getStlDialog()?.close();
	}

	function exportStlFromDialog() {
		if (!doodledialStore.svgContent) return;

		try {
			const stl = exportStl(
				doodledialStore.svgContent,
				doodledialStore.config,
				doodledialStore.layers,
				{
					discThicknessMm: parseThickness(discThicknessMm, 3),
					markThicknessMm: parseThickness(markThicknessMm, 0.5)
				}
			);
			createDownload(stl, 'doodledial.stl', 'model/stl');
			closeStlDialog();
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	function handleMainClick() {
		menuOpen = false;
		if (globalConfig.defaultExportFormat === 'stl') {
			openStlDialog();
		} else {
			exportSvg();
		}
	}

	function handleFormatSelect(format: 'laser-svg' | 'stl') {
		if (format === 'stl') {
			openStlDialog();
		} else {
			exportSvg();
		}
	}
</script>

<div class="relative inline-flex">
	<div class="flex rounded-xl shadow-md shadow-indigo-100">
		<button
			onclick={handleMainClick}
			disabled={!doodledialStore.svgContent}
			class="group flex items-center gap-2 rounded-l-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:bg-gray-300 enabled:hover:bg-indigo-700 enabled:hover:shadow-lg enabled:hover:shadow-indigo-200 enabled:active:scale-95"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>Export</span>
		</button>
		<button
			onclick={() => (menuOpen = !menuOpen)}
			disabled={!doodledialStore.svgContent}
			aria-expanded={menuOpen}
			aria-haspopup="menu"
			class="rounded-r-xl border-l border-indigo-500 bg-indigo-600 px-3 py-2.5 font-medium text-white transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-300 enabled:hover:bg-indigo-700 enabled:active:scale-95"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-4 w-4"
			>
				<path
					fill-rule="evenodd"
					d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>

	{#if menuOpen}
		<div
			class="absolute right-0 top-full z-20 mt-2 min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
		>
			<button
				type="button"
				onclick={() => handleFormatSelect('laser-svg')}
				class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>Laser SVG</span>
			</button>
			<button
				type="button"
				onclick={() => handleFormatSelect('stl')}
				class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>3D STL</span>
			</button>
		</div>
	{/if}
</div>

<dialog
	id={STL_DIALOG_ID}
	class="w-full max-w-md rounded-2xl border border-gray-200 p-0 shadow-2xl backdrop:bg-black/40"
>
	<div class="p-5">
		<h3 class="text-lg font-semibold text-gray-900">STL Export Options</h3>
		<p class="mt-1 text-sm text-gray-500">Set thickness values before generating the STL file.</p>

		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="disc-thickness-mm">
				<span>Disc thickness (mm)</span>
				<input
					id="disc-thickness-mm"
					bind:value={discThicknessMm}
					type="number"
					min="0.1"
					step="0.1"
					class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
				/>
			</label>

			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="mark-thickness-mm">
				<span>Mark thickness (mm)</span>
				<input
					id="mark-thickness-mm"
					bind:value={markThicknessMm}
					type="number"
					min="0.1"
					step="0.1"
					class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
				/>
			</label>
		</div>

		<div class="mt-5 flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={closeStlDialog}
				class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={exportStlFromDialog}
				class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
			>
				Download STL
			</button>
		</div>
	</div>
</dialog>
```

- [ ] **Step 2: Run Svelte autofixer to validate code**

Run the `svelte-autofixer` tool on the new component to check for issues.

- [ ] **Step 3: Verify compilation**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ExportButton.svelte
git commit -m "feat: rewrite ExportButton as split button with default format support"
```

---

### Task 4: Update E2E tests for split button

**Files:**

- Modify: `tests/export.spec.ts`

- [ ] **Step 1: Update existing E2E tests**

The main button now reads `globalConfig.defaultExportFormat` which defaults to `'laser-svg'`. The dropdown is accessed via the chevron button, not the main button click. The Export button text no longer toggles a menu on click — the chevron does.

Update `tests/export.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Export', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('main button exports laser SVG directly when default is laser-svg', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.locator('button:has-text("Export")').click()
		]);
		expect(download.suggestedFilename()).toContain('.svg');
	});

	test('chevron opens format picker and can select STL', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		await page.locator('[aria-haspopup="menu"]').click();
		await page.locator('button:has-text("3D STL")').click();

		await expect(page.locator('text=STL Export Options')).toBeVisible();

		await page.getByLabel('Disc thickness (mm)').fill('4');
		await page.getByLabel('Mark thickness (mm)').fill('1');

		const exportButton = page.locator('button:has-text("Download STL")');
		await expect(exportButton).toBeEnabled();

		const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

		expect(download.suggestedFilename()).toContain('.stl');
	});

	test('can select Laser SVG from chevron dropdown', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		await page.locator('[aria-haspopup="menu"]').click();
		const svgMenuItem = page.locator('button:has-text("Laser SVG")');
		await expect(svgMenuItem).toBeVisible();

		const [download] = await Promise.all([page.waitForEvent('download'), svgMenuItem.click()]);
		expect(download.suggestedFilename()).toContain('.svg');
	});
});
```

- [ ] **Step 2: Run Playwright tests**

Run: `pnpm exec playwright test tests/export.spec.ts`
Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/export.spec.ts
git commit -m "test: update E2E tests for split export button"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run all checks**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run`
Expected: All unit tests pass (including new global-config tests)
