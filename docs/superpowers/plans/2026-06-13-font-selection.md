# Font Selection for Labels & Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Add font family selection for labels (mark + path) and disc title via dropdowns in both global settings (persisted defaults) and per-disc sidebar settings.

**Architecture:** Two new fields (`labelFontFamily`, `titleFontFamily`) on both `DialConfig` (per-disc) and `GlobalConfigStore` (global). Two `<select>` dropdowns in `OffsetScaleControl.svelte` and `GlobalConfigDialog.svelte`. Font values flow through `config` to `combineDoodledial()` which updates SVG text elements. Per-disc value falls back to global default, which falls back to hardcoded default.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind CSS, svg.js

---

### Task 1: Add font constants and type fields

**Files:**

- Modify: `src/lib/utils/constants.ts`
- Modify: `src/lib/types/doodledial.ts`

- [ ] **Step 1: Add FONT_FAMILIES constant**

In `src/lib/utils/constants.ts`, add:

```typescript
export const FONT_FAMILIES = [
	'monospace',
	'sans-serif',
	'serif',
	'Arial',
	'Helvetica',
	'Times New Roman',
	'Courier New',
	'Georgia',
	'Verdana',
	'Trebuchet MS',
	'Impact'
] as const;
```

- [ ] **Step 2: Add font fields to DialConfig and DEFAULT_DIAL_CONFIG**

In `src/lib/types/doodledial.ts`, add two fields to `DialConfig`:

```typescript
export interface DialConfig {
	// ... existing fields
	pathLabelFontSize: number;
	labelFontFamily: string;
	titleFontFamily: string;
}
```

And to `DEFAULT_DIAL_CONFIG`:

```typescript
export const DEFAULT_DIAL_CONFIG = {
	// ... existing values
	pathLabelFontSize: 10,
	labelFontFamily: 'monospace',
	titleFontFamily: 'sans-serif'
} as const satisfies DialConfig;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/constants.ts src/lib/types/doodledial.ts
git commit -m "feat: add font family types and constants"
```

---

### Task 2: Add global default font fields to global-config store

**Files:**

- Modify: `src/lib/stores/global-config.svelte.ts`

- [ ] **Step 1: Add fields to PersistedConfig interface**

```typescript
interface PersistedConfig {
	// ... existing fields
	defaultExportFormat: ExportFormat;
	labelFontFamily: string;
	titleFontFamily: string;
}
```

- [ ] **Step 2: Add defaults**

```typescript
export const DEFAULTS = {
	// ... existing values
	defaultExportFormat: 'laser-svg',
	labelFontFamily: 'monospace',
	titleFontFamily: 'sans-serif'
} as const satisfies PersistedConfig;
```

- [ ] **Step 3: Add $state fields**

```typescript
class GlobalConfigStore {
	// ... existing fields
	defaultExportFormat: ExportFormat = $state(DEFAULTS.defaultExportFormat);
	labelFontFamily: string = $state(DEFAULTS.labelFontFamily);
	titleFontFamily: string = $state(DEFAULTS.titleFontFamily);
```

- [ ] **Step 4: Add touch reads in $effect.root**

In the `$effect.root` callback:

```typescript
void this.defaultExportFormat;
void this.labelFontFamily;
void this.titleFontFamily;
```

- [ ] **Step 5: Update reset()**

```typescript
this.defaultExportFormat = DEFAULTS.defaultExportFormat;
this.labelFontFamily = DEFAULTS.labelFontFamily;
this.titleFontFamily = DEFAULTS.titleFontFamily;
```

- [ ] **Step 6: Update \_load()**

```typescript
this.labelFontFamily = parsed.labelFontFamily ?? DEFAULTS.labelFontFamily;
this.titleFontFamily = parsed.titleFontFamily ?? DEFAULTS.titleFontFamily;
```

- [ ] **Step 7: Update \_save()**

```typescript
JSON.stringify({
	// ... existing fields
	labelFontFamily: this.labelFontFamily,
	titleFontFamily: this.titleFontFamily
});
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts
git commit -m "feat: add global default font family settings"
```

---

### Task 3: Add per-disc font setters to doodledial store

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Update GlobalConfigLike interface**

```typescript
interface GlobalConfigLike {
	diameter: number;
	pathLabelOptimizerEnabled: boolean;
	labelFontFamily: string;
	titleFontFamily: string;
}
```

- [ ] **Step 2: Initialize config with global font defaults**

```typescript
let config = $state<DialConfig>({
	...DEFAULT_DIAL_CONFIG,
	diameter: globalConfig.diameter,
	labelFontFamily: globalConfig.labelFontFamily,
	titleFontFamily: globalConfig.titleFontFamily
});
```

- [ ] **Step 3: Add setter methods**

```typescript
setLabelFontFamily(fontFamily: string) {
	config = { ...config, labelFontFamily: fontFamily };
	labelPlacementStore.schedule();
},
setTitleFontFamily(fontFamily: string) {
	config = { ...config, titleFontFamily: fontFamily };
},
```

Add these after `setPathLabelFontSize` (line 143).

- [ ] **Step 4: Update reset()**

```typescript
config = {
	...DEFAULT_DIAL_CONFIG,
	diameter: globalConfig.diameter,
	labelFontFamily: globalConfig.labelFontFamily,
	titleFontFamily: globalConfig.titleFontFamily
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: add per-disc font family setters to doodledial store"
```

---

### Task 4: Add font dropdowns to OffsetScaleControl (per-disc)

**Files:**

- Modify: `src/lib/components/OffsetScaleControl.svelte`

- [ ] **Step 1: Add import and handler functions**

```typescript
import { FONT_FAMILIES } from '$lib/utils/constants';

function handleLabelFontFamilyChange(e: Event) {
	const value = (e.target as HTMLSelectElement).value;
	doodledialStore.setLabelFontFamily(value);
}

function handleTitleFontFamilyChange(e: Event) {
	const value = (e.target as HTMLSelectElement).value;
	doodledialStore.setTitleFontFamily(value);
}
```

- [ ] **Step 2: Add dropdown HTML after the "Label Font Size" section (after line 137)**

```svelte
<div class="flex items-center justify-between">
	<label for="label-font-family-select" class="text-sm font-medium text-gray-700">Label Font</label>
	<select
		id="label-font-family-select"
		value={doodledialStore.config.labelFontFamily}
		onchange={handleLabelFontFamilyChange}
		disabled={optimizerStore.optimizerPending}
		class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#each FONT_FAMILIES as font}
			<option value={font}>{font}</option>
		{/each}
	</select>
</div>

<div class="flex items-center justify-between">
	<label for="title-font-family-select" class="text-sm font-medium text-gray-700">Title Font</label>
	<select
		id="title-font-family-select"
		value={doodledialStore.config.titleFontFamily}
		onchange={handleTitleFontFamilyChange}
		disabled={optimizerStore.optimizerPending}
		class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#each FONT_FAMILIES as font}
			<option value={font}>{font}</option>
		{/each}
	</select>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/OffsetScaleControl.svelte
git commit -m "feat: add font family dropdowns to disc settings"
```

---

### Task 5: Add font dropdowns to GlobalConfigDialog (global defaults)

**Files:**

- Modify: `src/lib/components/GlobalConfigDialog.svelte`

- [ ] **Step 1: Add import**

```typescript
import { FONT_FAMILIES } from '$lib/utils/constants';
```

- [ ] **Step 2: Add draft state**

```typescript
let draftLabelFontFamily = $state(globalConfig.labelFontFamily);
let draftTitleFontFamily = $state(globalConfig.titleFontFamily);
```

- [ ] **Step 3: Add to handleReset()**

```typescript
draftLabelFontFamily = DEFAULTS.labelFontFamily;
draftTitleFontFamily = DEFAULTS.titleFontFamily;
```

- [ ] **Step 4: Add to handleOK()**

```typescript
globalConfig.labelFontFamily = draftLabelFontFamily;
globalConfig.titleFontFamily = draftTitleFontFamily;
```

- [ ] **Step 5: Add dropdown HTML inside the `space-y-6` div, before the buttons**

```svelte
<div class="border-t border-gray-100 pt-6">
	<div class="flex items-center justify-between mb-2">
		<label for="global-label-font-family" class="text-sm font-medium text-gray-700"
			>Label Font</label
		>
		<select
			id="global-label-font-family"
			value={draftLabelFontFamily}
			onchange={(e) => (draftLabelFontFamily = (e.target as HTMLSelectElement).value)}
			class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
		>
			{#each FONT_FAMILIES as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</div>
	<p class="text-xs text-gray-500">Default font for mark labels and path labels</p>
</div>

<div class="border-t border-gray-100 pt-6">
	<div class="flex items-center justify-between mb-2">
		<label for="global-title-font-family" class="text-sm font-medium text-gray-700"
			>Title Font</label
		>
		<select
			id="global-title-font-family"
			value={draftTitleFontFamily}
			onchange={(e) => (draftTitleFontFamily = (e.target as HTMLSelectElement).value)}
			class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
		>
			{#each FONT_FAMILIES as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</div>
	<p class="text-xs text-gray-500">Default font for the disc title</p>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add font family dropdowns to global settings"
```

---

### Task 6: Use font families in SVG rendering

**Files:**

- Modify: `src/lib/utils/doodledial.ts`

**Background:** `config` is passed to `combineDoodledial()`. Since `DialConfig` now includes `labelFontFamily` and `titleFontFamily`, we can read them from `config` inside `combineDoodledial`. For `parseSvgPaths`, `createMark` and `createPathLabel` keep defaulting to `'monospace'` — the fonts get updated later in `combineDoodledial`.

- [ ] **Step 1: Update path label font in combineDoodledial path label loop (line 366)**

Add font family update alongside the existing font size update:

```typescript
pathLabel.font('size', config.pathLabelFontSize);
pathLabel.font('family', config.labelFontFamily);
```

- [ ] **Step 2: Update mark label fonts in combineDoodledial**

After the path label loop (after line 369), add a block to update `.layer-label` elements:

```typescript
svgLayer.find('.layer-label').forEach((label) => {
	(label as Text).font('family', config.labelFontFamily);
});
```

- [ ] **Step 3: Update disc title font in combineDoodledial title block (line 425)**

Change `family: 'sans-serif'` to `family: config.titleFontFamily`:

```typescript
titleEl.font({
	family: config.titleFontFamily,
	size: options?.discTitleFontSize ?? 12,
	anchor: 'middle',
	weight: 'bold'
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat: apply font families from config in SVG rendering"
```

---

### Task 7: Include font families in save/restore metadata

**Files:**

- Modify: `src/lib/utils/doodledial-save.ts`
- Modify: `src/lib/utils/doodledial-save.spec.ts`

- [ ] **Step 1: Add font fields to DoodleDialMetadata config**

```typescript
export interface DoodleDialMetadata {
	// ... existing
	config: {
		// ... existing fields
		pathLabelFontSize: number;
		labelFontFamily: string;
		titleFontFamily: string;
	};
	// ... rest
}
```

- [ ] **Step 2: Update test sample in doodledial-save.spec.ts**

```typescript
const SAMPLE_METADATA: DoodleDialMetadata = {
	// ... existing
	config: {
		// ... existing
		pathLabelFontSize: 10,
		labelFontFamily: 'monospace',
		titleFontFamily: 'sans-serif'
	}
	// ... rest
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/doodledial-save.ts src/lib/utils/doodledial-save.spec.ts
git commit -m "feat: include font families in save/restore metadata"
```

---

### Task 8: Verify with lint and typecheck

- [ ] **Step 1: Run typecheck**

```bash
pnpm check
```

Expected: No type errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 3: Fix any issues found**
