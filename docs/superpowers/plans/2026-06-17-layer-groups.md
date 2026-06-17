# Layer Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve top-level `<g>` elements from imported SVGs as collapsible group nodes in the layer list.

**Architecture:** Top-level SVG `<g>` elements are identified during `parseSvgPaths`. Each becomes a `LayerGroup` with a name derived from `inkscape:label` → `id` → `"Disc N"`. Layers get a `groupId` field. The layer list renders a tree view when 2+ groups exist. Layer `<g>` wrappers are added back into their original parent group in the SVG DOM.

**Tech Stack:** TypeScript, Svelte 5, svg.js

---

### Task 1: Add LayerGroup type and groupId to Layer

**Files:**

- Modify: `src/lib/types/doodledial.ts:1-19`

- [ ] **Add LayerGroup interface and groupId to Layer**

After `LabelPlacementStatus`:

```typescript
export interface LayerGroup {
	id: string;
	name: string;
}
```

Add `groupId: string;` to the `Layer` interface.

- [ ] **Run check to see expected errors**

Run: `pnpm check`
Expected: Type errors in files constructing `Layer` without `groupId` (layers.svelte.ts, layers.spec.ts). Fixes in later tasks.

---

### Task 2: Add group support to createLayerStore

**Files:**

- Modify: `src/lib/stores/layers.svelte.ts`
- Modify: `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`
- Modify: `src/lib/optimizer/run-optimizer.spec.ts`
- Modify: `src/lib/stores/detection.spec.ts`
- Test: `src/lib/stores/layers.spec.ts`

- [ ] **Add import for LayerGroup**

```typescript
import type { LabelPlacementStatus, Layer, LayerGroup } from '$lib/types/doodledial';
```

- [ ] **Add groups map and methods**

After `const layers: SvelteMap<string, Layer> = new SvelteMap();`:

```typescript
const groups: SvelteMap<string, LayerGroup> = new SvelteMap();
```

Add methods:

```typescript
function addGroup(id: string, name: string) {
	groups.set(id, { id, name });
}

function clearGroups() {
	groups.clear();
}

function getGroup(id: string): LayerGroup | undefined {
	return groups.get(id);
}
```

Add getter in return object:

```typescript
get groups() {
    return Array.from(groups.values());
},
```

Return `addGroup`, `clearGroups`, `getGroup` from the factory.

- [ ] **Update addLayer to accept groupId**

Change signature from `addLayer(layerId: string, index: number, name: string)` to:

```typescript
function addLayer(layerId: string, index: number, name: string, groupId: string = '') {
```

Add `groupId,` to the `newLayer` object.

- [ ] **Fix test fixtures in optimizer and detection specs**

In `src/lib/optimizer/run-bruteforce-optimizer.spec.ts`, `src/lib/optimizer/run-optimizer.spec.ts`, and `src/lib/stores/detection.spec.ts`, add `groupId: ''` to all inline Layer objects.

Example pattern — search for `{ id:` in each file and add `groupId: ''`:

```typescript
// Before:
{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true }
// After:
{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true, groupId: '' }
```

- [ ] **Update clearLayers and reset to also clear groups**

In `clearLayers()`, add: `clearGroups();`
In `reset()`, add: `clearGroups();`

- [ ] **Add group tests to layers.spec.ts**

Add a `describe('groups', () => { ... })` block after the `reset` block:

```typescript
describe('groups', () => {
	it('starts with empty groups', () => {
		expect(store.groups).toEqual([]);
	});

	it('addGroup adds a group', () => {
		store.addGroup('group-1', 'Disc 1');
		expect(store.groups).toHaveLength(1);
		expect(store.groups[0]).toEqual({ id: 'group-1', name: 'Disc 1' });
	});

	it('getGroup returns a group by id', () => {
		store.addGroup('g1', 'G1');
		expect(store.getGroup('g1')).toEqual({ id: 'g1', name: 'G1' });
	});

	it('getGroup returns undefined for non-existent group', () => {
		expect(store.getGroup('ghost')).toBeUndefined();
	});

	it('clearGroups removes all groups', () => {
		store.addGroup('g1', 'G1');
		store.addGroup('g2', 'G2');
		store.clearGroups();
		expect(store.groups).toEqual([]);
	});

	it('clearLayers also clears groups', () => {
		store.addGroup('g1', 'G1');
		store.clearLayers();
		expect(store.groups).toEqual([]);
	});

	it('reset also clears groups', () => {
		store.addGroup('g1', 'G1');
		store.reset();
		expect(store.groups).toEqual([]);
	});

	it('addLayer stores groupId on the layer', () => {
		store.addGroup('g1', 'Disc 1');
		store.addLayer('layer-1', 1, 'Layer 1', 'g1');
		expect(store.getLayer('layer-1')!.groupId).toBe('g1');
	});
});
```

- [ ] **Run tests**

Run: `pnpm exec vitest run src/lib/stores/layers.spec.ts`
Expected: All tests pass

---

### Task 3: Modify parseSvgPaths to detect and return groups

**Files:**

- Modify: `src/lib/utils/doodledial.ts:48-187`
- Also exports from: `src/lib/types/doodledial.ts`

- [ ] **Add ParsedLayer and ParseResult types to the return**

Change the return type annotation. After `const layers: ... = [];` replace the current accumulation with group-aware logic.

The core changes inside `parseSvgPaths`:

1. **After moving children into `#all`, scan `#all`'s children** to identify top-level `<g>` elements (containing paths) and loose `<path>` elements.

2. **Create a `parsedGroups` array** and a working array of `{ element: G, paths: Element[] }`.

3. **Auto-group loose paths** into a generated `<g>` element.

4. **For each group**, determine its name (`inkscape:label` → `id` → `"Disc N"`).

5. **Iterate paths per group**, create layer wrappers as before (with marks and labels), but add them back into the parent group's `<g>` element (not `#all`).

6. **Return `{ layers, groups: parsedGroups, updatedSvg }`** instead of `{ layers, updatedSvg }`.

Full implementation sketch:

```typescript
// After existing viewBox/scale/style setup and moving children into #all:

interface WorkGroup {
	element: G;
	paths: Element[];
}

const workGroups: WorkGroup[] = [];
const loosePaths: Element[] = [];

for (const child of [...all.children()]) {
	if (child.type === 'g') {
		const g = child as unknown as G;
		const groupPaths = g.find('path');
		if (groupPaths.length > 0) {
			workGroups.push({ element: g, paths: groupPaths });
		}
	} else if (child.type === 'path') {
		loosePaths.push(child);
	}
}

if (loosePaths.length > 0) {
	const autoGroup = SVG().group();
	for (const path of loosePaths) {
		path.remove();
		autoGroup.add(path);
	}
	all.add(autoGroup);
	workGroups.push({
		element: autoGroup,
		paths: loosePaths
	});
}

const layers: ParsedLayer[] = [];
const parsedGroups: { id: string; name: string }[] = [];
let globalIndex = 0;

for (const [groupIdx, { element: groupEl, paths: groupPaths }] of workGroups.entries()) {
	const inkscapeLabel = groupEl.attr('inkscape:label');
	const elId = groupEl.attr('id');
	let groupName: string;
	let groupId: string;

	if (inkscapeLabel) {
		groupName = String(inkscapeLabel);
		groupId = elId ? String(elId) : `group-${groupIdx}`;
	} else if (elId) {
		groupName = String(elId);
		groupId = String(elId);
	} else {
		groupName = `Disc ${groupIdx + 1}`;
		groupId = `group-${groupIdx}`;
	}

	parsedGroups.push({ id: groupId, name: groupName });

	for (const path of groupPaths) {
		globalIndex++;
		const sourcePathBox = path.bbox();
		(path as unknown as import('@svgdotjs/svg.js').Path).addClass('cutout');

		const pathEl = path as unknown as import('@svgdotjs/svg.js').Path;
		pathEl.scale(sourceScale, 0, 0).translate(normalizedTranslateX, normalizedTranslateY);

		// Same CSS clearing as current code
		const cssKeys = ['stroke', 'stroke-width', 'fill', 'fill-opacity'] as const;
		for (const key of cssKeys) {
			(pathEl.css as any)(key as any, null);
		}

		const layerId = `layer-${globalIndex}`;
		const layer = SVG().group().attr('id', layerId);
		layer.addClass('layer');
		path.remove();
		layer.add(path);

		const mark = createMark(
			layerId,
			maxImageDimension,
			maxImageDimension * Math.SQRT2,
			globalIndex
		);
		const markWrapper = SVG().group().addClass('mark-wrapper');
		markWrapper.add(mark);
		layer.add(markWrapper);

		const pathLabel = createPathLabel(layerId, globalIndex, {
			x2: sourcePathBox.x2 * sourceScale + normalizedTranslateX,
			cy: sourcePathBox.cy * sourceScale + normalizedTranslateY
		});
		layer.add(pathLabel);

		groupEl.add(layer);

		layers.push({
			id: layerId,
			name: `Layer ${globalIndex}`,
			index: globalIndex,
			groupId
		});
	}
}

// Rest of function unchanged (discElements, viewbox, error check etc.)
all.add(discElements);

if (layers.length === 0) {
	throw new Error('No SVG paths found in the uploaded file. The file must contain path elements.');
}

// ... existing viewbox setup ...

const updatedSvg = doc.svg();
return { layers, groups: parsedGroups, updatedSvg };
```

Important: keep ALL existing code before the path scanning (viewBox, scale, style, `all` group setup, disc elements creation) exactly as-is. Only replace the section from `const paths = doc.find('path')` onward.

- [ ] **Run check**

Run: `pnpm check`
Expected: No type errors

---

### Task 4: Expose group methods through doodledialStore

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Wire up group methods**

Add getter to the return object:

```typescript
get groups() {
    return layerStore.groups;
},
```

Add pass-through methods:

```typescript
addGroup(id: string, name: string) {
    layerStore.addGroup(id, name);
},
```

Wrap the existing `addLayer` call to also pass groupId:

```typescript
addLayer(layerId: string, index: number, name: string, groupId?: string) {
    layerStore.addLayer(layerId, index, name, groupId ?? '');
},
```

- [ ] **Update setSizeToFit to register groups and pass groupId**

In `doodledial.svelte.ts`, the `setSizeToFit` method re-parses the SVG. Replace its content:

```typescript
setSizeToFit(sizeToFit: boolean) {
    config = { ...config, sizeToFit };
    if (originalRawSvg) {
        const parsed = parseSvgPaths(originalRawSvg, sizeToFit);
        layerStore.clearLayers();
        layerStore.clearGroups();
        for (const group of parsed.groups ?? []) {
            layerStore.addGroup(group.id, group.name);
        }
        for (const layer of parsed.layers) {
            layerStore.addLayer(layer.id, layer.index, layer.name, layer.groupId);
        }
        svgContent = {
            raw: parsed.updatedSvg,
            filename: svgContent?.filename ?? ''
        };
    }
    labelPlacementStore.schedule();
},
```

- [ ] **Run check**

Run: `pnpm check`
Expected: No type errors

---

### Task 5: Pass group info through FileUpload

**Files:**

- Modify: `src/lib/components/FileUpload.svelte:54-57`

- [ ] **Update the import line to import groups too**

Currently imports `parseSvgPaths` — that's fine, the return type includes groups.

- [ ] **Update processFile to register groups and pass groupId**

Replace:

```typescript
parsed.layers.forEach((layer) => {
	doodledialStore.addLayer(layer.id, layer.index, layer.name);
});
```

With:

```typescript
if (parsed.groups) {
	for (const group of parsed.groups) {
		doodledialStore.addGroup(group.id, group.name);
	}
}
parsed.layers.forEach((layer) => {
	doodledialStore.addLayer(layer.id, layer.index, layer.name, layer.groupId);
});
```

- [ ] **Run check**

Run: `pnpm check`
Expected: No type errors

---

### Task 6: Update LayerList with tree view for multiple groups

**Files:**

- Modify: `src/lib/components/LayerList.svelte`

- [ ] **Add tree/flat switch**

At the top of the template, after `{#if doodledialStore.layers.length > 0}`:

```svelte
{#if doodledialStore.layers.length > 0}
	<div class="space-y-3">
		<!-- existing header with hide/show/renumber etc. -->

		{#if doodledialStore.groups.length <= 1}
			<!-- Flat list (existing) -->
			<div class="border border-gray-200 rounded-lg">
				<ul class="divide-y divide-gray-100">
					{#each doodledialStore.layers as layer (layer.id)}
						<!-- existing layer row -->
					{/each}
				</ul>
			</div>
		{:else}
			<!-- Tree list -->
			<div class="border border-gray-200 rounded-lg">
				{#each doodledialStore.groups as group}
					<details class="group" open>
						<summary
							class="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 list-none select-none"
						>
							<span class="text-sm font-semibold text-gray-700">{group.name}</span>
							<svg
								class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</summary>
						<ul class="divide-y divide-gray-100">
							{#each doodledialStore.layers.filter((l) => l.groupId === group.id) as layer (layer.id)}
								<li
									class="flex items-center justify-between px-3 py-2.5 pl-8 transition-colors list-none {optimizerStore.optimizerPending
										? 'opacity-60'
										: 'cursor-pointer hover:bg-gray-50'} {doodledialStore.selectedLayer === layer.id
										? 'bg-indigo-50 border-l-2 border-indigo-500'
										: ''}"
									role="menuitem"
									tabindex={optimizerStore.optimizerPending ? -1 : 0}
									onclick={() => handleSelect(layer.id)}
									onkeydown={(e) => e.key === 'Enter' && handleSelect(layer.id)}
									onmouseenter={() => handleMouseEnter(layer.id)}
									onmouseleave={handleMouseLeave}
								>
									<!-- same layer row content as flat list -->
								</li>
							{/each}
						</ul>
					</details>
				{/each}
			</div>
		{/if}
	</div>
{/if}
```

The layer row `<li>` content is identical to the flat list — extract into an `{#snippet}` or just duplicate the markup.

- [ ] **Run check**

Run: `pnpm check`
Expected: No type errors

- [ ] **Run lint**

Run: `pnpm lint`
Expected: No warnings/errors

---

### Task 7: Run full verification

- [ ] **Run all checks and tests**

Run: `pnpm check && pnpm lint && pnpm exec vitest run`
Expected: All pass

---

### Implementation Notes

- `combineDoodledial` and `createOptimizerSvgTemplate` find layers by `doc.findOne('#' + layer.id)` — this works with SVG elements at any nesting depth. No changes needed.
- The `flattenSvg()` function already preserves top-level `<g>` elements (it only flattens nested groups within them). No changes needed.
- The `removeNestedGroups()` function is unchanged — path transforms are applied correctly before layers are created.
