# Laser and 3D Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-selectable export flow that produces either laser-ready SVG output or a printable STL for the current dial.

**Architecture:** Keep the current SVG export pipeline as the shared source of dial geometry, then layer two format-specific writers on top. The laser writer stays in the SVG domain and marks cut versus engrave operations explicitly. The STL writer uses Three.js to turn the same dial geometry into a printable 3D relief with a base disc, through-holes, and raised marks/labels.

**Tech Stack:** SvelteKit, TypeScript, SVG.js, Three.js, Playwright, Vitest, pnpm.

---

### Task 1: Add shared export utilities and STL dependency

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/utils/export-label-glyphs.ts`
- Create: `src/lib/utils/export-formats.ts`
- Create: `src/lib/utils/laser-svg-export.ts`
- Create: `src/lib/utils/stl-export.ts`

- [ ] **Step 1: Write the failing unit tests for the new export helpers**

Create `src/lib/utils/export-formats.spec.ts` with tests that import `exportLaserSvg` and `exportStl` and assert:

```ts
import { describe, expect, it } from 'vitest';
import { exportLaserSvg, exportStl } from './export-formats';

it('laser export separates cut and engrave geometry', () => {
	const svg = exportLaserSvg(mockSvgContent, mockConfig, mockLayers);
	expect(svg).toContain('operation-cut');
	expect(svg).toContain('operation-engrave');
	expect(svg).not.toContain('<text');
});

it('stl export includes a solid header and facets', () => {
	const stl = exportStl(mockSvgContent, mockConfig, mockLayers, {
		discThicknessMm: 3,
		markThicknessMm: 1
	});
	expect(stl.startsWith('solid')).toBe(true);
	expect(stl).toContain('facet normal');
});
```

Run: `pnpm vitest run src/lib/utils/export-formats.spec.ts -t "laser export separates cut and engrave geometry"`
Expected: fail because the helpers do not exist yet.

- [ ] **Step 2: Implement the smallest shared export helper surface**

Implement `export-formats.ts` so it exports a format enum and the two formatter functions. Keep the API small enough for the UI to call directly:

```ts
export type ExportFormat = 'laser-svg' | 'stl';

export interface StlExportOptions {
	discThicknessMm: number;
	markThicknessMm: number;
}

export function exportLaserSvg(content: SVGContent, config: DialConfig, layers?: Layer[]): string;

export function exportStl(
	content: SVGContent,
	config: DialConfig,
	layers: Layer[] | undefined,
	options: StlExportOptions
): string;
```

Use `export-label-glyphs.ts` for numeric label outlines so both formats can share the same label geometry. Add `three` to `package.json` and generate the lockfile update with pnpm.

- [ ] **Step 3: Run the helper tests and verify the new API is wired**

Run: `pnpm vitest run src/lib/utils/export-formats.spec.ts -t "laser export separates cut and engrave geometry"`
Expected: PASS.

Run: `pnpm vitest run src/lib/utils/export-formats.spec.ts -t "stl export includes a solid header and facets"`
Expected: PASS.

### Task 2: Update the export UI to choose format and thickness

**Files:**

- Modify: `src/lib/components/ExportButton.svelte`
- Modify: `src/routes/+page.svelte` if the button placement or surrounding panel needs a format selector wrapper
- Modify: `tests/page.e2e.ts`

- [ ] **Step 1: Write the failing Playwright test for format selection**

Add a test that loads the app, opens the export control, selects `3D STL`, fills `disc thickness` and `mark thickness`, and confirms the download filename ends with `.stl`.

- [ ] **Step 2: Implement the minimal UI state and wiring**

Update `ExportButton.svelte` so it exposes a format picker with these options:

- `Laser SVG`
- `3D STL`

When `3D STL` is selected, show two numeric inputs:

- `disc thickness` in mm
- `mark thickness` in mm

Keep the existing download button behavior, but route the click to `exportLaserSvg(...)` or `exportStl(...)` depending on the selected format.

- [ ] **Step 3: Run the Playwright test and verify the new download path**

Run: `pnpm playwright test tests/page.e2e.ts -g "format selection"`
Expected: PASS and the suggested filename matches the selected format.

### Task 3: Add focused coverage for laser and STL output

**Files:**

- Modify: `tests/layer-management.spec.ts`
- Modify: `src/lib/utils/export-formats.spec.ts`
- Modify: `src/lib/utils/stl-export.spec.ts` if a separate STL-focused unit file is needed

- [ ] **Step 1: Add the failing assertions for laser operation encoding**

Cover the existing SVG export behavior with a test that asserts the generated laser SVG contains separate cut and engrave groups and that no `<text>` elements remain in the exported file.

- [ ] **Step 2: Add the failing assertions for STL relief geometry**

Write a unit test that checks the STL output changes when `discThicknessMm` or `markThicknessMm` changes, and that the output includes the expected facet structure for a printable mesh.

- [ ] **Step 3: Run the targeted test files**

Run: `pnpm vitest run src/lib/utils/export-formats.spec.ts`

Run: `pnpm playwright test tests/layer-management.spec.ts -g "export SVG excludes hidden layers"`

Expected: both pass and the existing SVG export behavior remains intact.

### Task 4: Final validation

**Files:**

- All modified files from Tasks 1-3

- [ ] **Step 1: Run the repo checks**

Run: `pnpm check`

Run: `pnpm lint`

Expected: both complete without errors or warnings.

- [ ] **Step 2: Run the export-focused tests again**

Run: `pnpm vitest run src/lib/utils/export-formats.spec.ts`

Run: `pnpm playwright test tests/page.e2e.ts tests/layer-management.spec.ts`

Expected: all export-related tests pass.
