<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { combineDoodledial } from '$lib/utils/doodledial';
	import { getAngleFromCenter } from '$lib/utils/rotation';
	import { DPI, MM_PER_INCH } from '$lib/utils/constants';

	const VIEWBOX_PADDING = 1.1;

	let isDragging = $state(false);
	let dragLayerId = $state<string | null>(null);
	let svgContainer: HTMLDivElement | null = $state(null);

	let isDraggingLabel = $state(false);
	let dragLabelLayerId = $state<string | null>(null);
	let labelDragStartX = $state(0);
	let labelDragStartY = $state(0);
	let labelInitialOffsetX = $state(0);
	let labelInitialOffsetY = $state(0);

	const paddedPixelSize = $derived(
		((doodledialStore.config.maxDiameter * DPI) / MM_PER_INCH) * VIEWBOX_PADDING
	);

	function getDiscCenter(): { cx: number; cy: number } {
		if (!svgContainer) return { cx: 0, cy: 0 };
		const svgEl = svgContainer.querySelector('svg');
		if (!svgEl) return { cx: 0, cy: 0 };
		const rect = svgEl.getBoundingClientRect();
		return {
			cx: rect.left + rect.width / 2,
			cy: rect.top + rect.height / 2
		};
	}

	function handlePointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		const { layerId, isPathLabel } = getLayerIdFromEvent(target);
		if (!layerId) return;

		doodledialStore.setSelectedLayer(layerId);
		doodledialStore.setHighlightedLayer(layerId);

		if (doodledialStore.labelEditMode && isPathLabel) {
			isDraggingLabel = true;
			dragLabelLayerId = layerId;

			const layer = doodledialStore.getLayer(layerId);
			labelInitialOffsetX = layer?.labelOffsetX || 0;
			labelInitialOffsetY = layer?.labelOffsetY || 0;

			labelDragStartX = e.clientX;
			labelDragStartY = e.clientY;

			(target as HTMLElement).setPointerCapture(e.pointerId);
		} else if (!doodledialStore.labelEditMode && !isPathLabel) {
			isDragging = true;
			dragLayerId = layerId;
			(target as HTMLElement).setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (isDraggingLabel && dragLabelLayerId) {
			const deltaX = e.clientX - labelDragStartX;
			const deltaY = e.clientY - labelDragStartY;

			const newOffsetX = labelInitialOffsetX + deltaX;
			const newOffsetY = labelInitialOffsetY + deltaY;

			doodledialStore.setLayerLabelOffset(dragLabelLayerId, newOffsetX, newOffsetY);
		} else if (isDragging && dragLayerId && !doodledialStore.labelEditMode) {
			const { cx, cy } = getDiscCenter();
			const currentAngle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
			doodledialStore.setLayerRotation(dragLayerId, currentAngle + 90);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (isDragging || isDraggingLabel) {
			const target = e.target as HTMLElement;
			target.releasePointerCapture(e.pointerId);
		}
		doodledialStore.setHighlightedLayer(null);
		isDragging = false;
		isDraggingLabel = false;
		dragLayerId = null;
		dragLabelLayerId = null;
	}

	function getLayerIdFromEvent(target: HTMLElement): {
		layerId: string | null;
		isPathLabel: boolean;
	} {
		let current: HTMLElement | null = target;
		while (current) {
			const layerId = current.getAttribute('data-layer-id');
			if (layerId) {
				const isPathLabel = current.classList.contains('path-label');
				return { layerId, isPathLabel };
			}
			current = current.parentElement;
		}
		return { layerId: null, isPathLabel: false };
	}

	function handleClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const { layerId } = getLayerIdFromEvent(target);
		if (layerId) {
			if (doodledialStore.selectedLayer != layerId) {
				doodledialStore.setSelectedLayer(layerId);
			} else {
				doodledialStore.setSelectedLayer(null);
			}
		}
	}

	function updatePreview() {
		if (doodledialStore.svgContent) {
			try {
				const layers = doodledialStore.layers;
				const highlightedLayer = doodledialStore.highlightedLayer;
				const currentSelected = doodledialStore.selectedLayer;
				const combined = combineDoodledial(
					doodledialStore.svgContent,
					doodledialStore.config,
					layers,
					highlightedLayer,
					currentSelected
				);
				doodledialStore.setCombinedSvg(combined);
				doodledialStore.setError(null);
			} catch (err) {
				doodledialStore.setError(err instanceof Error ? err.message : 'Failed to generate preview');
				doodledialStore.setCombinedSvg(null);
			}
		}
	}

	$effect(() => {
		if (doodledialStore.svgContent && doodledialStore.config.diameter) {
			updatePreview();
		}
	});

	$effect(() => {
		void doodledialStore.layers.length;
		doodledialStore.layers.forEach((l) => {
			void l.visible;
			void l.rotation;
			void l.labelOffsetX;
			void l.labelOffsetY;
		});
		void doodledialStore.highlightedLayer;
		void doodledialStore.selectedLayer;
		void doodledialStore.labelEditMode;
		void doodledialStore.config.offsetX;
		void doodledialStore.config.offsetY;
		void doodledialStore.config.scale;
		if (doodledialStore.svgContent) {
			updatePreview();
		}
	});
</script>

<div class="w-full h-full flex items-center justify-center relative">
	<div
		class="absolute inset-0 opacity-10"
		style="background-image: radial-gradient(circle, #6366f1 1px, transparent 1px); background-size: 20px 20px;"
	></div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	{#if doodledialStore.svgContent}
		<div
			class="bg-white rounded-xl shadow-lg p-4 flex items-center justify-center overflow-hidden relative z-10 {doodledialStore.labelEditMode
				? 'ring-2 ring-indigo-400 ring-offset-2'
				: ''} {doodledialStore.labelEditMode ? 'label-edit-mode' : ''}"
			style="width: {paddedPixelSize}px; height: {paddedPixelSize}px;"
			bind:this={svgContainer}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onclick={handleClick}
		>
			{#if doodledialStore.labelEditMode}
				<div
					class="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow z-20"
				>
					Drag labels to reposition
				</div>
			{/if}
			<div class="max-w-full max-h-full flex items-center justify-center">
				{@html doodledialStore.combinedSvg || ''}
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4 text-gray-400 relative z-10">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-20 w-20"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
				/>
			</svg>
			<p class="text-base font-medium">Upload an SVG to see preview</p>
		</div>
	{/if}
</div>

<style>
	:global(.label-edit-mode .path-label) {
		cursor: grab;
	}
	:global(.label-edit-mode .path-label:hover) {
		fill: #6366f1;
		font-weight: 700;
	}
	:global(.label-edit-mode .path-label:active) {
		cursor: grabbing;
	}
</style>
