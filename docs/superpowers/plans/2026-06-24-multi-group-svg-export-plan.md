# Multi-Group SVG Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When SVG export is triggered with multiple top-level groups, produce one SVG with a grid of complete sub-dials — one per group.

**Architecture:** A new `combineMultiGroupSvg` helper assembles per-group SVG strings into a grid layout. The existing `exportLaserSvg` and `exportPreviewSvg` get optional `groups` parameters; when groups.length > 1, they generate per-group SVGs via the existing single-dial logic and combine them.

**Tech Stack:** TypeScript, svgdotjs/svg.js, Vitest

---

### Task 1: Create `combineMultiGroupSvg` helper

**Files:**

- Create: `src/lib/utils/multi-group-svg-export.ts`
- Test: `src/lib/utils/export-formats.svelte.spec.ts`

- [ ] **Step 1: Write the failing test for `combineMultiGroupSvg`**

Add to `src/lib/utils/export-formats.svelte.spec.ts`:

```typescript
import { combineMultiGroupSvg } from './multi-group-svg-export';

it('combineMultiGroupSvg arranges sub-SVGs in a grid', () => {
	const subSvgs = [
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle r="10"/></svg>',
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect w="10" h="10"/></svg>',
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M0 0"/></svg>',
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><line x1="0" y1="0" x2="10" y2="10"/></svg>'
	];
	const result = combineMultiGroupSvg(subSvgs, 60);

	// Should produce a valid SVG with viewBox covering 2 columns x 2 rows
	expect(result).toContain('<svg');
	expect(result).toContain('</svg>');

	// Each sub-SVG's content should be wrapped in a <g transform="translate(...)">
	expect(result).toContain('translate(0, 0)');
	expect(result).toContain('translate(160, 0)');
	expect(result).toContain('translate(0, 160)');
	expect(result).toContain('translate(160, 160)');

	// viewBox should be large enough for 2 columns of (100+60) = 320 x 320
	expect(result).toContain('viewBox="0 0 320 320"');
});

it('combineMultiGroupSvg handles single SVG', () => {
	const result = combineMultiGroupSvg(
		['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle r="10"/></svg>'],
		60
	);
	expect(result).toContain('translate(0, 0)');
	expect(result).not.toContain('translate(160');
});

it('combineMultiGroupSvg returns empty string for empty input', () => {
	expect(combineMultiGroupSvg([], 60)).toBe('');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "combineMultiGroupSvg"
```

Expected: FAIL with "combineMultiGroupSvg is not defined"

- [ ] **Step 3: Write minimal `combineMultiGroupSvg` implementation**

Create `src/lib/utils/multi-group-svg-export.ts`:

```typescript
export function combineMultiGroupSvg(subSvgs: string[], spacing: number): string {
	if (subSvgs.length === 0) return '';

	const firstMatch = subSvgs[0].match(/viewBox="([^"]*)"/);
	const firstVb = firstMatch ? firstMatch[1].split(/\s+/).map(Number) : [0, 0, 200, 200];
	const subDialWidth = firstVb[2] + spacing;
	const subDialHeight = firstVb[3] + spacing;

	const count = subSvgs.length;
	const cols = Math.ceil(Math.sqrt(count));
	const rows = Math.ceil(count / cols);
	const totalWidth = cols * subDialWidth;
	const totalHeight = rows * subDialHeight;

	const styleMatch = subSvgs[0].match(/<defs>[\s\S]*?<\/defs>/i);
	const defsContent = styleMatch ? styleMatch[0] : '';

	let result = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">`;
	if (defsContent) {
		result += defsContent;
	}

	for (let i = 0; i < subSvgs.length; i++) {
		const innerMatch = subSvgs[i].match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
		const innerContent = innerMatch ? innerMatch[1] : subSvgs[i];
		const col = i % cols;
		const row = Math.floor(i / cols);
		const tx = col * subDialWidth;
		const ty = row * subDialWidth;
		result += `<g transform="translate(${tx}, ${ty})">${innerContent}</g>`;
	}

	result += '</svg>';
	return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "combineMultiGroupSvg"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/multi-group-svg-export.ts src/lib/utils/export-formats.svelte.spec.ts
git commit -m "feat: add combineMultiGroupSvg helper for grid layout assembly"
```

---

### Task 2: Support multi-group in `exportLaserSvg`

**Files:**

- Modify: `src/lib/utils/laser-svg-export.ts`
- Test: `src/lib/utils/export-formats.svelte.spec.ts`

- [ ] **Step 1: Write failing tests for multi-group laser export**

Add to `src/lib/utils/export-formats.svelte.spec.ts`:

```typescript
it('laser export produces multiple sub-dials when groups > 1', () => {
	const { content } = buildExportFixture();
	const layers = [
		{ id: 'layer-1', name: 'Layer 1', index: 1, visible: true, rotation: 0, groupId: 'g1' },
		{ id: 'layer-2', name: 'Layer 2', index: 2, visible: true, rotation: 0, groupId: 'g1' },
		{ id: 'layer-3', name: 'Layer 3', index: 3, visible: true, rotation: 0, groupId: 'g2' }
	];
	const groups = [
		{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
		{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
	];
	const result = exportLaserSvg(content, SAMPLE_CONFIG, layers, undefined, groups);

	// Should contain two translate groups for two sub-dials
	const translateMatches = result.match(/transform="translate\(/g);
	expect(translateMatches).toHaveLength(2);

	// Each sub-dial should have a dial circle
	expect(result.match(/id="dial"/g)).toHaveLength(2);

	// Each sub-dial should have a center hole
	expect(result.match(/id="center-hole"/g)).toHaveLength(2);
});

it('laser export single group behaves the same as before', () => {
	const { content, layers } = buildExportFixture();
	const resultWithoutGroups = exportLaserSvg(content, SAMPLE_CONFIG, layers, undefined);
	const resultWithSingleGroup = exportLaserSvg(content, SAMPLE_CONFIG, layers, undefined, []);

	expect(resultWithSingleGroup).toBe(resultWithoutGroups);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "laser export"
```

Expected: FAIL on new tests

- [ ] **Step 3: Modify `exportLaserSvg` to support multi-group**

Add `LayerGroup` import and new parameter. Extract existing logic into `exportLaserSvgSingle`. Add `exportLaserSvgMultiGroup` internal function.

Modify `src/lib/utils/laser-svg-export.ts`:

```typescript
import type { CenterStyle, DialConfig, Layer, LayerGroup, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from './doodledial';
import { combineMultiGroupSvg } from './multi-group-svg-export';

export function exportLaserSvg(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	if (groups && groups.length > 1) {
		return exportLaserSvgMultiGroup(content, config, layers ?? [], options, groups);
	}
	return exportLaserSvgSingle(content, config, layers, options);
}

function exportLaserSvgMultiGroup(
	content: SVGContent,
	config: DialConfig,
	layers: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	const subSvgs = groups!.map((group) => {
		const groupLayers = layers.filter((l) => l.groupId === group.id && l.visible);
		return exportLaserSvgSingle(content, config, groupLayers, options);
	});
	return combineMultiGroupSvg(subSvgs, 60);
}

function exportLaserSvgSingle(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions
): string {
	// [existing body of exportLaserSvg unchanged]
	const cutClassName = options?.cutClassName ?? 'operation-cut';
	// ... rest of existing code ...
}
```

Actually wait, I need to be more careful. Let me show the exact refactor. The existing `exportLaserSvg` body becomes `exportLaserSvgSingle`, and the public `exportLaserSvg` becomes a dispatcher.

Let me write this out precisely. The existing `exportLaserSvg` function (lines 18-109) becomes:

```typescript
export function exportLaserSvg(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	if (groups && groups.length > 1) {
		return exportLaserSvgMultiGroup(content, config, layers ?? [], options, groups);
	}
	return exportLaserSvgSingle(content, config, layers, options);
}

function exportLaserSvgMultiGroup(
	content: SVGContent,
	config: DialConfig,
	layers: Layer[],
	options?: LaserExportOptions,
	groups?: LayerGroup[]
): string {
	const subSvgs = groups!.map((group) => {
		const groupLayers = layers.filter((l) => l.groupId === group.id && l.visible);
		return exportLaserSvgSingle(content, config, groupLayers, options);
	});
	return combineMultiGroupSvg(subSvgs, 60);
}
```

The `exportLaserSvgSingle` function is the exact body of the current `exportLaserSvg` (lines 24-109 in the original file, but adjusted - the actual content starts at line 24).

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "laser export"
```

Expected: PASS

- [ ] **Step 5: Run full check**

```bash
pnpm check
pnpm lint
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/laser-svg-export.ts
git commit -m "feat: support multi-group laser SVG export"
```

---

### Task 3: Support multi-group in `exportPreviewSvg`

**Files:**

- Modify: `src/lib/utils/preview-svg-export.ts`
- Test: `src/lib/utils/export-formats.svelte.spec.ts`

- [ ] **Step 1: Write failing tests for multi-group preview export**

Add to `src/lib/utils/export-formats.svelte.spec.ts`:

```typescript
it('preview export produces multiple sub-dials when groups > 1', () => {
	const { content } = buildExportFixture();
	const layers = [
		{ id: 'layer-1', name: 'Layer 1', index: 1, visible: true, rotation: 0, groupId: 'g1' },
		{ id: 'layer-2', name: 'Layer 2', index: 2, visible: true, rotation: 0, groupId: 'g2' }
	];
	const groups = [
		{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
		{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
	];
	const result = exportPreviewSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>', {
		groups,
		content,
		config: SAMPLE_CONFIG,
		layers
	});

	// Should contain two translate groups
	const translateMatches = result.match(/transform="translate\(/g);
	expect(translateMatches).toHaveLength(2);

	// Each sub-dial needs a dial circle
	expect(result.match(/id="dial"/g)).toHaveLength(2);
});

it('preview export single group returns combined SVG as-is', () => {
	const combined = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
	const result = exportPreviewSvg(combined);
	expect(result).toBe(combined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "preview export"
```

Expected: FAIL on new tests

- [ ] **Step 3: Modify `exportPreviewSvg` to support multi-group**

Update `src/lib/utils/preview-svg-export.ts`:

```typescript
import { combineDoodledial } from './doodledial';
import { combineMultiGroupSvg } from './multi-group-svg-export';
import type { DialConfig, Layer, LayerGroup, SVGContent } from '$lib/types/doodledial';

export interface PreviewExportOptions {
	groups?: LayerGroup[];
	content?: SVGContent;
	config?: DialConfig;
	layers?: Layer[];
	centerStyle?: CenterStyle;
}

export function exportPreviewSvg(combinedSvg: string, options?: PreviewExportOptions): string {
	if (
		options?.groups &&
		options.groups.length > 1 &&
		options.content &&
		options.config &&
		options.layers
	) {
		const subSvgs = options.groups.map((group) => {
			const groupLayers = options.layers!.filter((l) => l.groupId === group.id && l.visible);
			return combineDoodledial(options.content!, options.config!, groupLayers, null, null, {
				includeCutoutLabels: true,
				includeHighlighting: false,
				respectLayerVisibility: true,
				applyDiameter: true,
				centerStyle: options?.centerStyle ?? 'crosshair'
			});
		});
		return combineMultiGroupSvg(subSvgs, 60);
	}
	return combinedSvg;
}
```

Add `CenterStyle` to the type import in the file — the existing import doesn't include it. Need to check... actually let me just import it from the types.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/utils/export-formats.svelte.spec.ts -t "preview export"
```

Expected: PASS

- [ ] **Step 5: Run full check**

```bash
pnpm check
pnpm lint
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/preview-svg-export.ts
git commit -m "feat: support multi-group preview SVG export"
```

---

### Task 4: Update ExportButton to pass groups to export functions

**Files:**

- Modify: `src/lib/components/ExportButton.svelte`

- [ ] **Step 1: Pass groups to `exportLaserSvg`**

In `src/lib/components/ExportButton.svelte`, modify the `handleExport` function to pass `doodledialStore.groups` to the laser SVG export:

```typescript
} else if (selectedFormat === 'laser-svg') {
    const svg = exportLaserSvg(
        doodledialStore.svgContent,
        doodledialStore.config,
        getVisibleLayers(),
        {
            centerStyle: selectedCenterStyle,
            dialTitle: doodledialStore.dialTitle || undefined,
            dialTitleX: doodledialStore.dialTitleX,
            dialTitleY: doodledialStore.dialTitleY,
            dialTitleFontSize: doodledialStore.dialTitleFontSize
        },
        doodledialStore.groups
    );
    createDownload(svg, makeFilename('doodledial', 'svg'), 'image/svg+xml');
```

- [ ] **Step 2: Pass groups to `exportPreviewSvg`**

Modify the preview export section:

```typescript
if (selectedFormat === 'preview-svg') {
	if (!doodledialStore.combinedSvg) return;
	const svg = exportPreviewSvg(doodledialStore.combinedSvg, {
		groups: doodledialStore.groups,
		content: doodledialStore.svgContent ?? undefined,
		config: doodledialStore.config,
		layers: doodledialStore.layers
	});
	createDownload(svg, makeFilename('doodledial-preview', 'svg'), 'image/svg+xml');
}
```

- [ ] **Step 3: Run full check**

```bash
pnpm check
pnpm lint
```

Expected: No errors

- [ ] **Step 4: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ExportButton.svelte
git commit -m "feat: pass groups to export functions from ExportButton"
```

---

### Task 5: Verify build and lint

- [ ] **Step 1: Run full project check**

```bash
pnpm check && pnpm lint
```

Expected: No errors or warnings

- [ ] **Step 2: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: finalize multi-group SVG export implementation"
```
