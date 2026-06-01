# Center Hole Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable center hole to the disc for needle rotation

**Architecture:** A `centerHoleDiameter` (mm) config value flows from global config store → dialog → doodledial store → SVG combine/export. The hole is an SVG circle element `#center-hole` added at parse time, resized at combine time, and classified as cut/hole in exports.

**Tech Stack:** Svelte 5 (runes), TypeScript, SVG.js, Three.js

---

## File Structure

| File                                           | Role                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/types/doodledial.ts`                  | Add `centerHoleDiameter` to `DialConfig` + `DEFAULT_DIAL_CONFIG` |
| `src/lib/stores/global-config.svelte.ts`       | Add `centerHoleDiameter` state, persist, load, reset             |
| `src/lib/stores/global-config.spec.ts`         | Tests for new field                                              |
| `src/lib/stores/doodledial.svelte.ts`          | Add `setCenterHoleDiameter()` method                             |
| `src/lib/utils/doodledial.ts`                  | Add `#center-hole` circle in parse, set radius in combine        |
| `src/lib/components/GlobalConfigDialog.svelte` | UI for center hole diameter                                      |
| `src/lib/utils/laser-svg-export.ts`            | Handle center hole as cut operation                              |
| `src/lib/utils/stl-export.ts`                  | Handle center hole as through-hole polygon                       |

---

### Task 1: Add `centerHoleDiameter` to DialConfig

**Files:**

- Modify: `src/lib/types/doodledial.ts:19-29` (add field)
- Modify: `src/lib/types/doodledial.ts:36-46` (add default)

- [ ] **Step 1: Add field to DialConfig interface**

```typescript
export interface DialConfig {
	diameter: number;
	minDiameter: number;
	maxDiameter: number;
	borderWidth: number;
	padding: number;
	offsetX: number;
	offsetY: number;
	scale: number;
	centerHoleDiameter: number;
	optimizerGapMm?: number;
}
```

- [ ] **Step 2: Add to DEFAULT_DIAL_CONFIG**

```typescript
export const DEFAULT_DIAL_CONFIG: DialConfig = {
	diameter: 200,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	centerHoleDiameter: 2,
	optimizerGapMm: 2
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/doodledial.ts
git commit -m "feat: add centerHoleDiameter to DialConfig"
```

---

### Task 2: Add `centerHoleDiameter` to GlobalConfigStore

**Files:**

- Modify: `src/lib/stores/global-config.svelte.ts`

- [ ] **Step 1: Add to PersistedConfig and DEFAULTS**

Edit the `PersistedConfig` interface to add the field, then add the default:

```typescript
interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
}

const DEFAULTS: PersistedConfig = {
	diameter: 200,
	centerHoleDiameter: 2,
	pathLabelOptimizerEnabled: false,
	forceDirectedOptimizerEnabled: false
};
```

- [ ] **Step 2: Add $state field and constructor default**

Add after line 16:

```typescript
centerHoleDiameter = $state(DEFAULTS.centerHoleDiameter);
```

- [ ] **Step 3: Update reset()**

```typescript
reset() {
	this.diameter = DEFAULTS.diameter;
	this.centerHoleDiameter = DEFAULTS.centerHoleDiameter;
	this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
	this.forceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
	this.dialogOpen = false;
}
```

- [ ] **Step 4: Update \_load()**

```typescript
this.centerHoleDiameter = parsed.centerHoleDiameter ?? DEFAULTS.centerHoleDiameter;
```

- [ ] **Step 5: Update \_save()**

```typescript
localStorage.setItem(
	STORAGE_KEY,
	JSON.stringify({
		diameter: this.diameter,
		centerHoleDiameter: this.centerHoleDiameter,
		pathLabelOptimizerEnabled: this.pathLabelOptimizerEnabled,
		forceDirectedOptimizerEnabled: this.forceDirectedOptimizerEnabled
	})
);
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/global-config.svelte.ts
git commit -m "feat: add centerHoleDiameter to GlobalConfigStore"
```

---

### Task 3: Add global config store tests for centerHoleDiameter

**Files:**

- Modify: `src/lib/stores/global-config.spec.ts`

- [ ] **Step 1: Add test for default value**

Add to existing test file:

```typescript
it('has default centerHoleDiameter of 2', () => {
	const store = new GlobalConfigStore();
	expect(store.centerHoleDiameter).toBe(2);
});

it('persists and restores centerHoleDiameter', () => {
	const store = new GlobalConfigStore();
	store.centerHoleDiameter = 1.5;
	store.save();
	const loaded = new GlobalConfigStore();
	expect(loaded.centerHoleDiameter).toBe(1.5);
});

it('resets centerHoleDiameter to default', () => {
	const store = new GlobalConfigStore();
	store.centerHoleDiameter = 3;
	store.reset();
	expect(store.centerHoleDiameter).toBe(2);
});
```

Note: `GlobalConfigStore` may not be exported from the module. Check export — if only `globalConfig` singleton is exported, we'll need to adjust the test approach to match existing patterns in the file. Read the existing test file first and follow its pattern.

- [ ] **Step 2: Run tests to verify**

Run: `pnpm vitest run src/lib/stores/global-config.spec.ts`
Expected: ALL PASS (including existing tests)

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/global-config.spec.ts
git commit -m "test: add centerHoleDiameter tests for GlobalConfigStore"
```

---

### Task 4: Add `setCenterHoleDiameter()` to doodledialStore

**Files:**

- Modify: `src/lib/stores/doodledial.svelte.ts`

- [ ] **Step 1: Add method to the returned object**

Add after `setDiameter` (line 152):

```typescript
setCenterHoleDiameter(centerHoleDiameter: number) {
	config = { ...config, centerHoleDiameter };
},
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/doodledial.svelte.ts
git commit -m "feat: add setCenterHoleDiameter to doodledialStore"
```

---

### Task 5: Add center-hole circle in SVG parsing

**Files:**

- Modify: `src/lib/utils/doodledial.ts`

- [ ] **Step 1: Add `#center-hole` circle after the `#disc` circle**

In `parseSvgPaths()`, after line 74 (`.id('disc')`), add:

```typescript
doc
	.circle(2 * MM_TO_PX)
	.center(maxImageDimension / 2, maxImageDimension / 2)
	.id('center-hole');
```

- [ ] **Step 2: Add CSS rule for center-hole**

In the style block, add after the `#disc` rule:

```typescript
style.rule('#center-hole', {
	fill: 'none',
	stroke: 'black',
	'stroke-width': '1',
	'stroke-dasharray': '2 2'
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat: add center-hole SVG element in parseSvgPaths"
```

---

### Task 6: Update center-hole radius in combineDoodledial

**Files:**

- Modify: `src/lib/utils/doodledial.ts`

- [ ] **Step 1: Add center-hole radius update in combineDoodledial**

In `combineDoodledial()`, after the `applyDiameter` block (after line 347), add:

```typescript
const centerHole = doc.findOne('#center-hole') as import('@svgdotjs/svg.js').Circle | null;
if (centerHole) {
	if (config.centerHoleDiameter > 0) {
		const holeRadiusPx = (config.centerHoleDiameter * MM_TO_PX) / 2;
		centerHole.radius(holeRadiusPx);
		centerHole.show();
	} else {
		centerHole.hide();
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/doodledial.ts
git commit -m "feat: update center-hole radius in combineDoodledial"
```

---

### Task 7: Add center hole UI to GlobalConfigDialog

**Files:**

- Modify: `src/lib/components/GlobalConfigDialog.svelte`

- [ ] **Step 1: Add draft state**

After line 13 (`draftDiameter = $state(globalConfig.diameter)`):

```typescript
let draftCenterHoleDiameter = $state(globalConfig.centerHoleDiameter);
```

- [ ] **Step 2: Add input handler**

After `handleDiameterInputChange`:

```typescript
function handleCenterHoleInputChange(e: Event) {
	const value = parseFloat((e.target as HTMLInputElement).value);
	if (!Number.isFinite(value)) return;
	const clamped = Math.min(Math.max(value, 0), 3);
	draftCenterHoleDiameter = clamped;
}
```

- [ ] **Step 3: Update handleReset**

```typescript
draftCenterHoleDiameter = DEFAULTS.centerHoleDiameter;
```

- [ ] **Step 4: Update handleOK**

```typescript
globalConfig.centerHoleDiameter = draftCenterHoleDiameter;
doodledialStore.setCenterHoleDiameter(draftCenterHoleDiameter);
```

- [ ] **Step 5: Add UI below Disc Diameter**

After the disc diameter section (after the `</div>` closing the disc diameter block, around line 91), add:

```html
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
				value="{draftCenterHoleDiameter}"
				onchange="{handleCenterHoleInputChange}"
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			/>
			<span class="text-sm text-gray-500">mm</span>
		</div>
	</div>
	<p class="text-xs text-gray-500">for needle axle. Set to 0 for no hole.</p>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/GlobalConfigDialog.svelte
git commit -m "feat: add center hole diameter UI to GlobalConfigDialog"
```

---

### Task 8: Handle center hole in laser SVG export

**Files:**

- Modify: `src/lib/utils/laser-svg-export.ts`

- [ ] **Step 1: Add center hole as cut operation**

In `exportLaserSvg()`, after the disc/cutout cut operations (after line 47), add:

```typescript
if (config.centerHoleDiameter > 0) {
	doc.find('#center-hole').forEach((hole) => {
		hole.addClass(cutClassName);
		hole.css('stroke', cutColor);
		hole.css('fill', 'none');
		hole.css('stroke-width', String(cutStrokeWidth));
	});
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/laser-svg-export.ts
git commit -m "feat: add center hole cut operation to laser SVG export"
```

---

### Task 9: Handle center hole in STL export

**Files:**

- Modify: `src/lib/utils/stl-export.ts`

- [ ] **Step 1: Add center hole polygon to holePolygons**

In `exportStl()`, after `const discRadiusMm = config.diameter / 2;` (line 223) and before `const holePolygons: THREE.Vector2[][] = [];` (line 225), add:

```typescript
const centerHoleRadiusMm = config.centerHoleDiameter / 2;
```

Then after initializing `holePolygons` and before the layer loop, add the hole polygon:

```typescript
if (centerHoleRadiusMm > 0) {
	const centerHolePoints: THREE.Vector2[] = [];
	const segments = 32;
	for (let i = 0; i <= segments; i++) {
		const angle = (i / segments) * Math.PI * 2;
		centerHolePoints.push(
			new THREE.Vector2(centerHoleRadiusMm * Math.cos(angle), centerHoleRadiusMm * Math.sin(angle))
		);
	}
	holePolygons.push(centerHolePoints);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/stl-export.ts
git commit -m "feat: add center hole through-hole to STL export"
```

---

## Spec Coverage Check

| Spec Requirement                             | Task                           |
| -------------------------------------------- | ------------------------------ |
| `centerHoleDiameter` in config types         | Task 1                         |
| Global config store persist/load/reset       | Task 2                         |
| Global config store tests                    | Task 3                         |
| `setCenterHoleDiameter()` in doodledialStore | Task 4                         |
| `#center-hole` circle in parseSvgPaths       | Task 5                         |
| Update radius in combineDoodledial           | Task 6                         |
| Dialog UI for center hole                    | Task 7                         |
| Laser export: hole as cut                    | Task 8                         |
| STL export: hole as through-hole             | Task 9                         |
| 0-value hides hole                           | Task 6 (hide), Task 8-9 (skip) |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-center-hole.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
