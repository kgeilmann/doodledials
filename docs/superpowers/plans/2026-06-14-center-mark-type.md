# Center Mark Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to choose between a cut hole, engraved crosshair, or nothing at the center of the disc in laser exports.

**Architecture:** Replace the binary `useCrosshair` boolean with a three-way `CenterMarkType = 'hole' | 'crosshair' | 'none'` in `CombineDoodledialOptions`, thread it through laser export, persist it in global config, and expose it in both Global Settings dialog and Export dropdown.

**Tech Stack:** Svelte 5 (runes), TypeScript, SVG.js, Vitest

---

### Task 1: Add `CenterMarkType` type and update `DialConfig`

**Files:**

- Modify: `src/lib/types/doodledial.ts:1-33`

- [ ] **Step 1: Add CenterMarkType type and centerMarkType field to DialConfig**

```typescript
export type CenterMarkType = 'hole' | 'crosshair' | 'none';

export interface DialConfig {
	diameter: number;
	minDiameter: number;
	maxDiameter: number;
	borderWidth: number;
	padding: number;
	offsetX: number;
	offsetY: number;
	scale: number;
	sizeToFit: boolean;
	centerHoleDiameter: number;
	centerMarkType: CenterMarkType;
	optimizerGapMm?: number;
	pathLabelFontSize: number;
	titleFontFamily: string;
}

export const DEFAULT_DIAL_CONFIG = {
	// ... existing fields unchanged ...
	centerHoleDiameter: 0.5,
	centerMarkType: 'hole'
	// ... rest unchanged ...
} as const satisfies DialConfig;
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/doodledial.ts
git commit -m "feat: add CenterMarkType and centerMarkType to DialConfig"
```

---

### Task 2: Update `combineDoodledial` to accept `centerMarkType` instead of `useCrosshair`

**Files:**

- Modify: `src/lib/utils/doodledial.ts:209-220, 335-469`

- [ ] **Step 1: Replace `useCrosshair` with `centerMarkType` in options interface**

```typescript
export interface CombineDoodledialOptions {
	includePathLabels?: boolean;
	includeHighlighting?: boolean;
	respectLayerVisibility?: boolean;
	applyCutoutTransforms?: boolean;
	applyDiameter?: boolean;
	centerMarkType?: CenterMarkType;
	discTitle?: string;
	discTitleX?: number;
	discTitleY?: number;
	discTitleFontSize?: number;
}
```

- [ ] **Step 2: Update combineDoodledial function: replace useCrosshair logic with centerMarkType**

Change the center rendering section at lines 427-451:

```typescript
const centerMarkType = options?.centerMarkType ?? 'crosshair';

// ... existing layer/scale/transform code ...

const centerHoleCircle = doc.findOne('#center-hole') as import('@svgdotjs/svg.js').Circle | null;
if (centerHoleCircle) {
	if (centerMarkType === 'crosshair') {
		centerHoleCircle.hide();
		const halfLen = 4;
		doc
			.line(cx - halfLen, cy, cx + halfLen, cy)
			.stroke({ width: 1, color: 'black' })
			.addClass('center-crosshair');
		doc
			.line(cx, cy - halfLen, cx, cy + halfLen)
			.stroke({ width: 1, color: 'black' })
			.addClass('center-crosshair');
	} else if (centerMarkType === 'hole') {
		if (config.centerHoleDiameter > 0) {
			const holeRadiusPx = (config.centerHoleDiameter * MM_TO_PX) / 2;
			centerHoleCircle.radius(holeRadiusPx);
			centerHoleCircle.show();
		} else {
			centerHoleCircle.hide();
		}
	} else {
		// 'none'
		centerHoleCircle.hide();
	}
}
```

Make sure import of `CenterMarkType` is added at the top:

```typescript
import {
	DEFAULT_DIAL_CONFIG,
	type CenterMarkType,
	type DialConfig,
	type Layer,
	type SVGContent
} from '$lib/types/doodledial';
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat: replace useCrosshair with centerMarkType in combineDoodledial"
```

---

### Task 3: Update `exportLaserSvg` to accept and use `centerMarkType`

**Files:**

- Modify: `src/lib/utils/laser-svg-export.ts:1-89`

- [ ] **Step 1: Add centerMarkType to LaserExportOptions and pass through to combineDoodledial**

```typescript
import { SVG, Svg } from '@svgdotjs/svg.js';
import type { CenterMarkType, DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from './doodledial';

export interface LaserExportOptions {
	cutClassName?: string;
	engraveClassName?: string;
	cutColor?: string;
	engraveColor?: string;
	cutStrokeWidth?: number;
	centerMarkType?: CenterMarkType;
}

export function exportLaserSvg(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions
): string {
	const cutClassName = options?.cutClassName ?? 'operation-cut';
	const engraveClassName = options?.engraveClassName ?? 'operation-engrave';
	const cutColor = options?.cutColor ?? '#ff0000';
	const engraveColor = options?.engraveColor ?? 'rgb(0, 0, 0)';
	const cutStrokeWidth = options?.cutStrokeWidth ?? 0.1;
	const centerMarkType = options?.centerMarkType ?? config.centerMarkType;

	const combinedSvg = combineDoodledial(content, config, layers, null, null, {
		includePathLabels: true,
		includeHighlighting: false,
		respectLayerVisibility: true,
		applyCutoutTransforms: true,
		applyDiameter: true,
		centerMarkType
	});

	// ... rest of function unchanged ...
```

- [ ] **Step 2: Add crosshair engrave handling after the center-hole cut handling (around line 65)**

After the `#center-hole` cut section, add:

```typescript
doc.find('.center-crosshair').forEach((crosshair) => {
	crosshair.addClass(engraveClassName);
	crosshair.css('stroke', engraveColor);
});
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/laser-svg-export.ts
git commit -m "feat: accept centerMarkType in laser export options"
```

---

### Task 4: Update `globalConfig` store to persist `centerMarkType`

**Files:**

- Modify: `src/lib/stores/global-config.svelte.ts:1-108`

- [ ] **Step 1: Add centerMarkType to PersistedConfig, DEFAULTS, load/save/reset**

Import the type:

```typescript
import type { CenterMarkType, ExportFormat } from '$lib/utils/export-formats'; // or from types directly
```

Actually, we should import `CenterMarkType` from the types file. Let's adjust:

```typescript
import type { CenterMarkType } from '$lib/types/doodledial';
import type { ExportFormat } from '$lib/utils/export-formats';
```

Add to `PersistedConfig`:

```typescript
interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	centerMarkType: CenterMarkType;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: ExportFormat;
	titleFontFamily: string;
}
```

Add to `DEFAULTS`:

```typescript
export const DEFAULTS = {
	diameter: 100,
	centerHoleDiameter: 0.5,
	centerMarkType: 'hole' as CenterMarkType
	// ... rest unchanged ...
} as const satisfies PersistedConfig;
```

Add to class body:

```typescript
class GlobalConfigStore {
	diameter: number = $state(DEFAULTS.diameter);
	centerHoleDiameter: number = $state(DEFAULTS.centerHoleDiameter);
	centerMarkType: CenterMarkType = $state(DEFAULTS.centerMarkType);
	// ... rest unchanged ...
```

Add to constructor `$effect.root` tracking list:

```typescript
void this.centerMarkType;
```

Add to `_load()`:

```typescript
this.centerMarkType = parsed.centerMarkType ?? DEFAULTS.centerMarkType;
```

Add to `_save()`:

```typescript
localStorage.setItem(
	STORAGE_KEY,
	JSON.stringify({
		// ... existing ...
		centerMarkType: this.centerMarkType
		// ...
	})
);
```

Add to `reset()`:

```typescript
this.centerMarkType = DEFAULTS.centerMarkType;
```

- [ ] **Step 2: Run tests to verify persistence works**

Run: `pnpm test`
Expected: All tests pass (especially global-config.spec.ts)

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts
git commit -m "feat: persist centerMarkType in global config"
```

---

### Task 5: Update `ExportButton.svelte` to pass `centerMarkType` and add dropdown options

**Files:**

- Modify: `src/lib/components/ExportButton.svelte:52-66`

- [ ] **Step 1: Add laser export with crosshair and no-center variants in the component**

Add a local state for the override:

```typescript
import type { CenterMarkType } from '$lib/types/doodledial';
```

Make `exportSvg` accept an optional center mark override:

```typescript
function exportSvg(centerMarkOverride?: CenterMarkType) {
	if (!doodledialStore.svgContent) return;

	try {
		const svg = exportLaserSvg(
			doodledialStore.svgContent,
			doodledialStore.config,
			getVisibleLayers(),
			{ centerMarkType: centerMarkOverride }
		);
		createDownload(svg, makeFilename('doodledial', 'svg'), 'image/svg+xml');
		menuOpen = false;
	} catch (err) {
		doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
	}
}
```

Update `handleFormatSelect`:

```typescript
function handleFormatSelect(format: 'preview-svg' | 'laser-svg' | 'stl') {
	if (format === 'preview-svg') {
		exportPreview();
	} else if (format === 'stl') {
		openStlDialog();
	} else {
		exportSvg();
	}
}
```

Update `handleMainClick`:

```typescript
function handleMainClick() {
	menuOpen = false;
	handleFormatSelect(globalConfig.defaultExportFormat);
}
```

- [ ] **Step 2: Add crosshair and no-center entries to the export dropdown menu**

Add after the "Laser SVG" menu item:

```svelte
<button
	type="button"
	onclick={() => {
		exportSvg('crosshair');
		menuOpen = false;
	}}
	class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
	role="menuitem"
>
	<span>Laser SVG (Crosshair)</span>
</button>
<button
	type="button"
	onclick={() => {
		exportSvg('none');
		menuOpen = false;
	}}
	class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
	role="menuitem"
>
	<span>Laser SVG (No Center)</span>
</button>
```

- [ ] **Step 3: Run pnpm check to verify**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ExportButton.svelte
git commit -m "feat: add crosshair/no-center options in export dropdown"
```

---

### Task 6: Update `GlobalConfigDialog.svelte` with center mark type UI

**Files:**

- Modify: `src/lib/components/GlobalConfigDialog.svelte:1-356`

- [ ] **Step 1: Import CenterMarkType**

```typescript
import type { CenterMarkType } from '$lib/types/doodledial';
```

- [ ] **Step 2: Add draftCenterMarkType state**

```typescript
let draftCenterMarkType = $state<CenterMarkType>(globalConfig.centerMarkType);
```

- [ ] **Step 3: Update handleOK to save it**

```typescript
function handleOK() {
	// ... existing ...
	globalConfig.centerMarkType = draftCenterMarkType;
	// ...
}
```

- [ ] **Step 4: Update handleReset**

```typescript
function handleReset() {
	// ... existing ...
	draftCenterMarkType = DEFAULTS.centerMarkType;
}
```

- [ ] **Step 5: Add segmented control UI after the center hole diameter input**

Replace the "for needle axle" paragraph with:

```svelte
<div class="border-t border-gray-100 pt-6">
	<div class="flex items-center justify-between mb-2">
		<label for="center-hole-diameter-input" class="text-sm font-medium text-gray-700"
			>Center Hole Diameter</label
		>
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
		<p class="text-xs text-gray-500 mt-0.5">Choose how the center is rendered in laser exports</p>
	</div>
	<fieldset class="flex gap-2">
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
			'hole'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="center-mark-type"
				value="hole"
				checked={draftCenterMarkType === 'hole'}
				onchange={() => (draftCenterMarkType = 'hole')}
				class="h-4 w-4 accent-indigo-600"
			/>
			<span>Hole</span>
		</label>
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
			'crosshair'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="center-mark-type"
				value="crosshair"
				checked={draftCenterMarkType === 'crosshair'}
				onchange={() => (draftCenterMarkType = 'crosshair')}
				class="h-4 w-4 accent-indigo-600"
			/>
			<span>Crosshair</span>
		</label>
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
			'none'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="center-mark-type"
				value="none"
				checked={draftCenterMarkType === 'none'}
				onchange={() => (draftCenterMarkType = 'none')}
				class="h-4 w-4 accent-indigo-600"
			/>
			<span>None</span>
		</label>
	</fieldset>
</div>
```

- [ ] **Step 6: Run pnpm check**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add center mark type UI in global settings"
```

---

### Task 7: Update existing tests for `useCrosshair` → `centerMarkType` migration

**Files:**

- Modify: `src/lib/utils/scale-transform.svelte.spec.ts` (all lines referencing `useCrosshair`)
- Modify: `src/lib/utils/export-formats.svelte.spec.ts` (SAMPLE_CONFIG and tests)

- [ ] **Step 1: Update SAMPLE_CONFIG in export-formats.svelte.spec.ts**

Add `centerMarkType: 'hole'` to the SAMPLE_CONFIG:

```typescript
const SAMPLE_CONFIG: DialConfig = {
	diameter: 120,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	sizeToFit: true,
	centerHoleDiameter: 0.5,
	centerMarkType: 'hole',
	pathLabelFontSize: 10,
	titleFontFamily: 'sans-serif'
};
```

- [ ] **Step 2: Update scale-transform.svelte.spec.ts**

Replace all `useCrosshair: false` with `centerMarkType: 'hole'` (4 occurrences).

- [ ] **Step 3: Run tests to verify**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 4: Run pnpm check and pnpm lint**

Run: `pnpm check && pnpm lint`
Expected: No errors or warnings

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/scale-transform.svelte.spec.ts src/lib/utils/export-formats.svelte.spec.ts
git commit -m "test: update tests for centerMarkType migration"
```

---

### Task 8: Final verification

**Files:**

- All modified files

- [ ] **Step 1: Run full check suite**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 2: Run full lint**

Run: `pnpm lint`
Expected: No errors or warnings

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 4: Run build to verify production build**

Run: `pnpm build`
Expected: Build succeeds
