# Multi-dial Laser SVG Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the laser SVG export feature to support choosing layer numbering schemes, customizing dial title formats, and selecting specific dial groups for multi-dial exports.

**Architecture:** Update `LaserExportOptions` with the new options. Modify `exportLaserSvg` and `exportLaserSvgMultiGroup` in `src/lib/utils/laser-svg-export.ts` to filter dial groups, remap layer indices if independent numbering is chosen, and dynamically generate titles. Enhance `ExportButton.svelte` to add dropdowns and checkboxes for these options.

**Tech Stack:** TypeScript, Svelte 5 (with Svelte runes), Vitest, svg.js.

## Global Constraints

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, playwright, sveltekit-adapter, mcp
- Run `pnpm check` and `pnpm lint` after writing code. Do not accept any errors or warnings.

---

### Task 1: Exporter Utility Enhancements

**Files:**

- Modify: `src/lib/utils/laser-svg-export.ts`

**Interfaces:**

- Consumes: `DialConfig`, `Layer`, `LayerGroup` from `$lib/types/doodledial`
- Produces: Updated `LaserExportOptions` interface and updated `exportLaserSvg` implementation.

- [ ] **Step 1: Update `LaserExportOptions` and `exportLaserSvgMultiGroup`**
      Modify `src/lib/utils/laser-svg-export.ts` to add the new options to `LaserExportOptions` and update the multi-group generation logic to handle filtering, renumbering, and title construction.

  Replace:

  ```typescript
  export interface LaserExportOptions {
  	cutClassName?: string;
  	engraveClassName?: string;
  	cutColor?: string;
  	engraveColor?: string;
  	cutStrokeWidth?: number;
  	centerStyle?: CenterStyle;
  	dialTitle?: string;
  	dialTitleX?: number;
  	dialTitleY?: number;
  	dialTitleFontSize?: number;
  }
  ```

  With:

  ```typescript
  export interface LaserExportOptions {
  	cutClassName?: string;
  	engraveClassName?: string;
  	cutColor?: string;
  	engraveColor?: string;
  	cutStrokeWidth?: number;
  	centerStyle?: CenterStyle;
  	dialTitle?: string;
  	dialTitleX?: number;
  	dialTitleY?: number;
  	dialTitleFontSize?: number;
  	numberingScheme?: 'continuous' | 'independent';
  	titleMode?: 'none' | 'name' | 'numbered' | 'both';
  	selectedGroupIds?: string[];
  }
  ```

  And replace `exportLaserSvgMultiGroup` with:

  ```typescript
  function exportLaserSvgMultiGroup(
  	content: SVGContent,
  	config: DialConfig,
  	layers: Layer[],
  	options?: LaserExportOptions,
  	groups?: LayerGroup[]
  ): string {
  	const selectedGroupIds = options?.selectedGroupIds;
  	const groupsToExport = selectedGroupIds
  		? (groups ?? []).filter((g) => selectedGroupIds.includes(g.id))
  		: (groups ?? []);

  	const groupsWithLayers = groupsToExport.filter((group) =>
  		layers.some((l) => l.groupId === group.id && l.visible)
  	);

  	if (groupsWithLayers.length === 0) {
  		return '';
  	}

  	const subSvgs = groupsWithLayers.map((group) => {
  		let groupLayers = layers.filter((l) => l.groupId === group.id && l.visible);
  		if (options?.numberingScheme === 'independent') {
  			// Sort by their original index and assign sequential 1-based indices
  			groupLayers = groupLayers
  				.slice()
  				.sort((a, b) => a.index - b.index)
  				.map((l, index) => ({
  					...l,
  					index: index + 1
  				}));
  		}

  		const title = options?.dialTitle || '';
  		const groupName = group.name || '';
  		const titleMode = options?.titleMode ?? 'none';
  		const totalGroups = groupsWithLayers.length;
  		const groupIndex = groupsWithLayers.indexOf(group) + 1;

  		let finalTitle = '';
  		if (titleMode === 'name') {
  			finalTitle = title ? `${title} - ${groupName}` : groupName;
  		} else if (titleMode === 'numbered') {
  			const numStr = `(${groupIndex}/${totalGroups})`;
  			finalTitle = title ? `${title} ${numStr}` : numStr;
  		} else if (titleMode === 'both') {
  			const numStr = `(${groupIndex}/${totalGroups})`;
  			finalTitle = title ? `${title} - ${groupName} ${numStr}` : `${groupName} ${numStr}`;
  		} else {
  			finalTitle = title;
  		}

  		return exportLaserSvgSingle(content, config, groupLayers, {
  			...options,
  			dialTitle: finalTitle || undefined
  		});
  	});

  	if (groupsWithLayers.length === 1) {
  		return subSvgs[0];
  	}

  	return combineMultiGroupSvg(subSvgs, 60);
  }
  ```

- [ ] **Step 2: Run verification checks**
      Run `pnpm check` and check if there are compilation errors.

---

### Task 2: Unit Testing for Multi-dial Options

**Files:**

- Modify: `src/lib/utils/export-formats.svelte.spec.ts`

- [ ] **Step 1: Add unit tests for new multi-dial exporter options**
      Open `src/lib/utils/export-formats.svelte.spec.ts` and add tests verifying selection filtering, independent layer renumbering, and title construction under different modes.

  Add the following tests inside the `describe('laser export multi-group', ...)` block:

  ```typescript
  it('filters by selectedGroupIds when provided', () => {
  	const { content, layers: fixtureLayers } = buildExportFixture();
  	const layers = fixtureLayers.map((l, i) => ({
  		...l,
  		groupId: i < Math.ceil(fixtureLayers.length / 2) ? 'g1' : 'g2'
  	}));
  	const groups = [
  		{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
  		{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
  	];
  	const result = exportLaserSvg(
  		content,
  		SAMPLE_CONFIG,
  		layers,
  		{ selectedGroupIds: ['g1'] },
  		groups
  	);

  	// Only 1 group should be exported, so no layout translate should exist
  	expect(result).not.toContain('transform="translate(');
  	expect(result.match(/id="dial"/g)).toHaveLength(1);
  });

  it('applies independent numbering scheme when selected', () => {
  	const { content, layers: fixtureLayers } = buildExportFixture();
  	// Force layer 2 (index 2) to be in group g2
  	const layers = [
  		{ id: 'shape-a', name: 'shape-a', index: 1, visible: true, rotation: 0, groupId: 'g1' },
  		{ id: 'shape-b', name: 'shape-b', index: 2, visible: true, rotation: 0, groupId: 'g2' }
  	];
  	const groups = [
  		{ id: 'g1', name: 'Dial 1', color: '#e6194b' },
  		{ id: 'g2', name: 'Dial 2', color: '#3cb44b' }
  	];

  	// independent scheme: g2 layers should start renumbering from 1
  	const result = exportLaserSvg(
  		content,
  		SAMPLE_CONFIG,
  		layers,
  		{ numberingScheme: 'independent' },
  		groups
  	);
  	const doc = SVG(result) as Svg;

  	// Find all mark-label elements
  	const markLabels = doc.find('.mark-label').map((el) => el.text());
  	// In group 1, index 1 -> label is "1"
  	// In group 2, index 2 -> renumbered to 1 -> label is "1"
  	expect(markLabels).toContain('1');
  	expect(markLabels.filter((t) => t === '1')).toHaveLength(2);
  	expect(markLabels).not.toContain('2');
  });

  it('formats titles correctly based on titleMode options', () => {
  	const { content } = buildExportFixture();
  	const layers = [
  		{ id: 'shape-a', name: 'shape-a', index: 1, visible: true, rotation: 0, groupId: 'g1' },
  		{ id: 'shape-b', name: 'shape-b', index: 2, visible: true, rotation: 0, groupId: 'g2' }
  	];
  	const groups = [
  		{ id: 'g1', name: 'Dial Alpha', color: '#e6194b' },
  		{ id: 'g2', name: 'Dial Beta', color: '#3cb44b' }
  	];

  	const resultName = exportLaserSvg(
  		content,
  		SAMPLE_CONFIG,
  		layers,
  		{
  			dialTitle: 'MyProject',
  			titleMode: 'name'
  		},
  		groups
  	);
  	expect(resultName).toContain('MyProject - Dial Alpha');
  	expect(resultName).toContain('MyProject - Dial Beta');

  	const resultNumbered = exportLaserSvg(
  		content,
  		SAMPLE_CONFIG,
  		layers,
  		{
  			dialTitle: 'MyProject',
  			titleMode: 'numbered'
  		},
  		groups
  	);
  	expect(resultNumbered).toContain('MyProject (1/2)');
  	expect(resultNumbered).toContain('MyProject (2/2)');

  	const resultBoth = exportLaserSvg(
  		content,
  		SAMPLE_CONFIG,
  		layers,
  		{
  			dialTitle: 'MyProject',
  			titleMode: 'both'
  		},
  		groups
  	);
  	expect(resultBoth).toContain('MyProject - Dial Alpha (1/2)');
  	expect(resultBoth).toContain('MyProject - Dial Beta (2/2)');
  });
  ```

- [ ] **Step 2: Run all unit tests**
      Run: `pnpm test:unit --run`
      Expected: All tests pass.

---

### Task 3: Export Dialog UI Adjustments

**Files:**

- Modify: `src/lib/components/ExportButton.svelte`

**Interfaces:**

- Updates UI settings bound to `selectedFormat === 'laser-svg'` block in dialog.

- [ ] **Step 1: Add options state variables in script block**
      Add Svelte 5 state variables for the new configurations:

  ```typescript
  let numberingScheme: 'continuous' | 'independent' = $state('continuous');
  let titleMode: 'none' | 'name' | 'numbered' | 'both' = $state('none');
  let selectedGroupIds: string[] = $state([]);

  // Initialize selectedGroupIds when dialog opens or when groups change
  $effect(() => {
  	if (doodledialStore.groups) {
  		selectedGroupIds = doodledialStore.groups.map((g) => g.id);
  	}
  });
  ```

  Update the `handleExport()` function where `selectedFormat === 'laser-svg'` is handled:

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
  						dialTitleFontSize: doodledialStore.dialTitleFontSize,
  						numberingScheme,
  						titleMode,
  						selectedGroupIds
  					},
  					doodledialStore.groups
  				);
  				createDownload(svg, makeFilename('doodledial', 'svg'), 'image/svg+xml');
  ```

- [ ] **Step 2: Add UI controls in HTML template**
      Insert control fields in the export options section under `{#if selectedFormat === 'laser-svg'}` in `src/lib/components/ExportButton.svelte`.

  ```svelte
  {#if selectedFormat === 'laser-svg'}
  	<div class="mt-4 flex flex-col gap-4">
  		<p class="text-sm text-gray-500">Laser-ready SVG with cut/engrave encoding.</p>

  		<div>
  			<span class="text-xs font-medium text-gray-600">Center mark</span>
  			<div class="mt-1 flex gap-2">
  				<button
  					type="button"
  					onclick={() => (selectedCenterStyle = 'hole')}
  					class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
  					class:bg-indigo-600={selectedCenterStyle === 'hole'}
  					class:text-white={selectedCenterStyle === 'hole'}
  					class:border={selectedCenterStyle !== 'hole'}
  					class:border-gray-300={selectedCenterStyle !== 'hole'}
  					class:text-gray-600={selectedCenterStyle !== 'hole'}
  					class:hover:bg-gray-50={selectedCenterStyle !== 'hole'}>Hole</button
  				>
  				<button
  					type="button"
  					onclick={() => (selectedCenterStyle = 'crosshair')}
  					class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
  					class:bg-indigo-600={selectedCenterStyle === 'crosshair'}
  					class:text-white={selectedCenterStyle === 'crosshair'}
  					class:border={selectedCenterStyle !== 'crosshair'}
  					class:border-gray-300={selectedCenterStyle !== 'crosshair'}
  					class:text-gray-600={selectedCenterStyle !== 'crosshair'}
  					class:hover:bg-gray-50={selectedCenterStyle !== 'crosshair'}>Crosshair</button
  				>
  				<button
  					type="button"
  					onclick={() => (selectedCenterStyle = 'none')}
  					class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
  					class:bg-indigo-600={selectedCenterStyle === 'none'}
  					class:text-white={selectedCenterStyle === 'none'}
  					class:border={selectedCenterStyle !== 'none'}
  					class:border-gray-300={selectedCenterStyle !== 'none'}
  					class:text-gray-600={selectedCenterStyle !== 'none'}
  					class:hover:bg-gray-50={selectedCenterStyle !== 'none'}>None</button
  				>
  			</div>
  		</div>

  		<div class="grid grid-cols-2 gap-3">
  			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="numbering-scheme">
  				<span>Numbering scheme</span>
  				<select
  					id="numbering-scheme"
  					bind:value={numberingScheme}
  					class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500"
  				>
  					<option value="continuous">Continuous</option>
  					<option value="independent">Independent</option>
  				</select>
  			</label>

  			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="title-mode">
  				<span>Title format</span>
  				<select
  					id="title-mode"
  					bind:value={titleMode}
  					class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500"
  				>
  					<option value="none">None (As-is)</option>
  					<option value="name">Name Only</option>
  					<option value="numbered">Numbered Only</option>
  					<option value="both">Name & Numbered</option>
  				</select>
  			</label>
  		</div>

  		{#if doodledialStore.groups.length > 1}
  			<div>
  				<span class="text-xs font-medium text-gray-600">Select dials to export</span>
  				<div
  					class="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 p-3 max-h-36 overflow-y-auto"
  				>
  					{#each doodledialStore.groups as group (group.id)}
  						<label class="flex items-center gap-2 text-sm text-gray-700">
  							<input
  								type="checkbox"
  								checked={selectedGroupIds.includes(group.id)}
  								onchange={(e) => {
  									if (e.currentTarget.checked) {
  										selectedGroupIds = [...selectedGroupIds, group.id];
  									} else {
  										selectedGroupIds = selectedGroupIds.filter((id) => id !== group.id);
  									}
  								}}
  								class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
  							/>
  							<span class="w-3 h-3 rounded-full" style="background-color: {group.color}"></span>
  							<span>{group.name}</span>
  						</label>
  					{/each}
  				</div>
  			</div>
  		{/if}
  	</div>
  {/if}
  ```

  And update the Export button disabled state:

  ```svelte
  <button
  	type="button"
  	onclick={handleExport}
  	disabled={selectedFormat === 'laser-svg' &&
  		doodledialStore.groups.length > 1 &&
  		selectedGroupIds.length === 0}
  	class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
  	>Export</button
  >
  ```

- [ ] **Step 3: Check build and linting**
      Run: `pnpm check && pnpm lint`
      Expected: No warnings or errors.
