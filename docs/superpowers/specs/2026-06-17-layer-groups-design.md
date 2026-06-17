# Layer Groups from SVG Top-Level `<g>` Elements

## Problem

When importing SVGs that use top-level `<g>` elements to organize paths into logical groups (e.g., different disc designs), the app flattens all paths into a single flat layer list, losing the original group structure. Users cannot see which layers belong to which group, and there is no path toward treating each group as its own disc.

## Solution

Preserve top-level `<g>` elements from the imported SVG as group containers in both the data model and the SVG DOM. Display them as collapsible tree nodes in the layer list when multiple groups exist.

---

## Data Model

### New: `LayerGroup` interface

```typescript
export interface LayerGroup {
	id: string;
	name: string;
}
```

### Modified: `Layer` interface — add `groupId`

```typescript
export interface Layer {
	id: string;
	name: string;
	index: number;
	groupId: string; // NEW — references the parent LayerGroup.id
	visible: boolean;
	rotation: number;
	labelOffsetX?: number;
	labelOffsetY?: number;
	labelPlacementMode?: LabelPlacementMode;
	labelPlacementStatus?: LabelPlacementStatus;
}
```

---

## SVG Parsing (`parseSvgPaths`)

### Input → Output changes

The function's return type expands:

```typescript
return {
    layers: { id: string; name: string; index: number; groupId: string }[];
    groups: LayerGroup[];
    updatedSvg: string;
};
```

### Algorithm

1. Parse the SVG with `SVG()`, run `flattenSvg()` as before (flattens nested groups, keeps top-level groups).

2. Move all top-level children into `#all` group (existing behavior).

3. Identify grouping structure from `#all`'s children:
   - For each child `<g>` element → it's a named group. Collect its path elements.
   - For each direct `<path>` child of `#all` (loose path) → auto-group all loose paths into a generated group.

4. Name each group:
   - First: `inkscape:label` attribute on the `<g>` element
   - Fallback: `id` attribute on the `<g>` element
   - Fallback: `"Disc N"` with N = 1, 2, 3... (sequential)

5. For each group, iterate over its path elements. For each path:
   - Apply transforms, scaling, styling (same as current behavior)
   - Create a layer wrapper `<g id="layer-N">` with marks and labels
   - Add the layer wrapper back into the **original parent `<g>` element** (not into `#all` directly)
   - Record the layer with its `groupId`

6. For loose paths (auto-grouped), create a new `<g>` element, move paths into it with proper styling/transforms, then add the layer wrappers inside it. Name it `"Disc N"`.

7. The original `<g>` elements remain in the SVG DOM, now containing the structured layer groups instead of raw paths.

---

## Store Changes (`createLayerStore`)

### New state

```typescript
const groupMap: SvelteMap<string, LayerGroup> = new SvelteMap();
```

### New derived values

```typescript
const groups = $derived(Array.from(groupMap.values()));
const layersByGroup = $derived(
	// Returns groups with their child layers, maintaining order
	groups.map((g) => ({
		group: g,
		layers: layerArray.filter((l) => l.groupId === g.id)
	}))
);
```

### New methods

- `addGroup(id, name)` — registers a group
- `clearGroups()` — clears all groups
- `getGroup(id)` — look up a group

`addLayer` now takes an optional `groupId` parameter.

### Expose through `doodledialStore`

```
get groups()           → LayerGroup[]
get layersByGroup()    → { group: LayerGroup; layers: Layer[] }[]
```

---

## Layer List Component (`LayerList.svelte`)

### Decision: tree vs flat

```svelte
{#if doodledialStore.groups.length <= 1}
	<!-- existing flat list -->
{:else}
	<!-- tree list with collapsible groups -->
{/if}
```

### Tree structure (2+ groups)

- Groups render as collapsible nodes using `<details>`/`<summary>` (or a custom toggle)
- Group name displayed as the header text
- Group can toggle expand/collapse
- Child layers indented under their group (pl/padding-left)
- Each child layer row is identical to the current flat-list layer row

### Flat list (0-1 groups)

- Exactly as today's UI — no change.

### Considerations

- Group collapse state is local UI state (no need to persist)
- Summary count per group (e.g. "3 layers") would be nice but is optional
- The group header should look distinct from a layer row (e.g. slightly bolder, maybe a folder-style icon)

---

## SVG Rendering (`combineDoodledial`, `createOptimizerSvgTemplate`)

### `combineDoodledial`

This function already finds layers by `doc.findOne('#' + layer.id)`, which works regardless of nesting level inside group `<g>` elements. **No structural changes needed** — the function iterates all layers, finds them by ID (which is document-unique), and applies rotation/visibility/label changes. The group containers are passive — they don't affect rendering logic.

### `createOptimizerSvgTemplate`

Same — finds layers by `doc.findOne('#' + layerId)`, applies rotation placeholders. Works as-is.

### Future disc extraction

When groups need to become independent discs, the group `<g>` element can be cloned with its child layers, and a new SVG root can be created from it — the group already contains everything needed.

---

## File-by-File Change Summary

| File                                   | Changes                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/lib/types/doodledial.ts`          | Add `LayerGroup` interface, add `groupId` to `Layer`                                                         |
| `src/lib/utils/doodledial.ts`          | Modify `parseSvgPaths` to identify groups, return groups + layered paths, add layers back into parent groups |
| `src/lib/stores/layers.svelte.ts`      | Add groups map, `addGroup`, `clearGroups`, `layersByGroup` derived                                           |
| `src/lib/stores/doodledial.svelte.ts`  | Expose groups/layersByGroup, pass groupId through addLayer                                                   |
| `src/lib/components/LayerList.svelte`  | Tree view for 2+ groups, flat for 0-1                                                                        |
| `src/lib/components/FileUpload.svelte` | Pass group info through addLayer calls                                                                       |
| `src/lib/stores/layers.spec.ts`        | Tests for groups functionality                                                                               |

---

## Open Questions / Edge Cases

- **groups with zero paths**: Should a top-level `<g>` with no path children be preserved? (Proposal: skip it — no layers → no group)
- **group visibility toggle**: Not in scope now, but the model allows it — a group-level visibility toggle could cascade to all children.
- **rotation within groups**: Not affected — each layer still has independent rotation.
- **layer renumber-by-angle**: Groups are a visual structure; renumber-by-angle is a global operation (ignores groups).
