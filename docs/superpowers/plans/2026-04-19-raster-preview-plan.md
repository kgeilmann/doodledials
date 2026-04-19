# Raster Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Preview Raster" button that opens a modal showing the disc rendered as a PNG at 300 DPI print quality.

**Architecture:**

- Add a "Preview Raster" button next to Export button
- Create a new `RasterPreviewModal.svelte` component that:
  - Takes the combined SVG and renders it to a canvas at 300 DPI
  - Displays the result in a modal overlay
- Use Svelte stores to manage modal open/close state

**Tech Stack:** Svelte 5, HTML Canvas API for rasterization

---

### Task 1: Create RasterPreviewModal component

**Files:**

- Create: `src/lib/components/RasterPreviewModal.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Create RasterPreviewModal.svelte**

```svelte
<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { DPI, MM_PER_INCH } from '$lib/utils/constants';

	let { open = $bindable(false) } = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let isGenerating = $state(false);

	const pixelSize = $derived(Math.round((doodledialStore.config.diameter / MM_PER_INCH) * DPI));

	async function generateRaster() {
		if (!doodledialStore.combinedSvg || !canvas) return;

		isGenerating = true;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = pixelSize;
		canvas.height = pixelSize;

		const img = new Image();
		const svgBlob = new Blob([doodledialStore.combinedSvg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			ctx.clearRect(0, 0, pixelSize, pixelSize);
			ctx.drawImage(img, 0, 0, pixelSize, pixelSize);
			URL.revokeObjectURL(url);
			isGenerating = false;
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			isGenerating = false;
		};

		img.src = url;
	}

	$effect(() => {
		if (open && doodledialStore.combinedSvg) {
			generateRaster();
		}
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			open = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		onclick={handleBackdropClick}
	>
		<div
			class="bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
		>
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-800">Raster Preview (300 DPI)</h2>
				<button
					onclick={() => (open = false)}
					class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-6 overflow-auto flex items-center justify-center">
				{#if isGenerating}
					<div class="text-gray-500">Generating preview...</div>
				{:else}
					<canvas
						bind:this={canvas}
						class="max-w-full max-h-[70vh] object-contain border border-gray-200"
					></canvas>
				{/if}
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/RasterPreviewModal.svelte
git commit -m "feat: add RasterPreviewModal component"
```

---

### Task 2: Add Preview Raster button to UI

**Files:**

- Modify: `src/routes/+page.svelte:1-122`

- [ ] **Step 1: Add state and import for modal**

Add to the script section:

```svelte
let showRasterPreview = $state(false);
```

Add import:

```svelte
import RasterPreviewModal from '$lib/components/RasterPreviewModal.svelte';
```

- [ ] **Step 2: Add button next to Export button**

Replace:

```svelte
<div class="flex justify-end p-4">
	<ExportButton />
</div>
```

With:

```svelte
<div class="flex justify-end p-4 gap-3">
	<button
		onclick={() => (showRasterPreview = true)}
		disabled={!doodledialStore.svgContent}
		class="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-gray-50 enabled:hover:border-gray-400 enabled:active:scale-95"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-5 w-5"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
		<span>Preview Raster</span>
	</button>
	<ExportButton />
</div>
```

- [ ] **Step 3: Add modal component at end of page**

Add before the closing `</div>` of the main flex container:

```svelte
<RasterPreviewModal bind:open={showRasterPreview} />
```

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm check && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add Preview Raster button and integrate modal"
```

---

### Task 3: Verify the implementation

**Files:**

- Test manually in browser

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Test flow**

1. Upload an SVG file
2. Click "Preview Raster" button
3. Verify modal opens with raster image
4. Verify close button works
5. Verify clicking outside closes modal
6. Verify button is disabled when no SVG loaded

- [ ] **Step 3: Final typecheck**

Run: `pnpm check && pnpm lint`
Expected: PASS

---

**Plan complete.** Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
