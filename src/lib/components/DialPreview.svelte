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
	let labelDragStartSvgX = $state(0);
	let labelDragStartSvgY = $state(0);
	let labelDragLayerRotation = $state(0);
	let labelInitialOffsetX = $state(0);
	let labelInitialOffsetY = $state(0);

	let isDraggingTitle = $state(false);
	let titleDragStartSvgX = $state(0);
	let titleDragStartSvgY = $state(0);
	let titleInitialX = $state(0);
	let titleInitialY = $state(0);

	const hiddenCount = $derived(doodledialStore.hiddenLayerCount);

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

	function getSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
		if (!svgContainer) return null;
		const svgEl = svgContainer.querySelector('svg') as SVGSVGElement | null;
		if (!svgEl) return null;

		const ctm = svgEl.getScreenCTM();
		if (!ctm) return null;

		const point = svgEl.createSVGPoint();
		point.x = clientX;
		point.y = clientY;
		const transformed = point.matrixTransform(ctm.inverse());

		return { x: transformed.x, y: transformed.y };
	}

	function handlePointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;

		const isDiscTitle = target.closest('[data-disc-title]') !== null;
		if (isDiscTitle && !doodledialStore.labelEditMode) {
			isDraggingTitle = true;
			titleInitialX = doodledialStore.discTitleX;
			titleInitialY = doodledialStore.discTitleY;

			const startPoint = getSvgPoint(e.clientX, e.clientY);
			if (!startPoint) {
				isDraggingTitle = false;
				return;
			}

			titleDragStartSvgX = startPoint.x;
			titleDragStartSvgY = startPoint.y;

			(target as HTMLElement).setPointerCapture(e.pointerId);
			return;
		}

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
			labelDragLayerRotation = layer?.rotation || 0;

			const startPoint = getSvgPoint(e.clientX, e.clientY);
			if (!startPoint) {
				isDraggingLabel = false;
				dragLabelLayerId = null;
				return;
			}

			labelDragStartSvgX = startPoint.x;
			labelDragStartSvgY = startPoint.y;

			(target as HTMLElement).setPointerCapture(e.pointerId);
		} else if (!doodledialStore.labelEditMode && !isPathLabel) {
			isDragging = true;
			dragLayerId = layerId;
			(target as HTMLElement).setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (isDraggingLabel && dragLabelLayerId) {
			const currentPoint = getSvgPoint(e.clientX, e.clientY);
			if (!currentPoint) return;

			const deltaX = currentPoint.x - labelDragStartSvgX;
			const deltaY = currentPoint.y - labelDragStartSvgY;

			// Labels live inside rotated layer groups, so convert screen-space movement
			// back into layer-local coordinates to keep dragging aligned with the pointer.
			const theta = (labelDragLayerRotation * Math.PI) / 180;
			const cosTheta = Math.cos(theta);
			const sinTheta = Math.sin(theta);
			const localDeltaX = deltaX * cosTheta + deltaY * sinTheta;
			const localDeltaY = -deltaX * sinTheta + deltaY * cosTheta;

			const newOffsetX = labelInitialOffsetX + localDeltaX;
			const newOffsetY = labelInitialOffsetY + localDeltaY;

			doodledialStore.setLayerLabelOffsetManual(dragLabelLayerId, newOffsetX, newOffsetY);
		} else if (isDraggingTitle) {
			const currentPoint = getSvgPoint(e.clientX, e.clientY);
			if (!currentPoint) return;

			const deltaX = currentPoint.x - titleDragStartSvgX;
			const deltaY = currentPoint.y - titleDragStartSvgY;

			doodledialStore.setDiscTitlePosition(titleInitialX + deltaX, titleInitialY + deltaY);
			return;
		} else if (isDragging && dragLayerId && !doodledialStore.labelEditMode) {
			const { cx, cy } = getDiscCenter();
			const currentAngle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
			doodledialStore.setLayerRotation(dragLayerId, currentAngle + 90);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (isDragging || isDraggingLabel || isDraggingTitle) {
			const target = e.target as HTMLElement;
			target.releasePointerCapture(e.pointerId);
		}
		doodledialStore.setHighlightedLayer(null);
		isDragging = false;
		isDraggingLabel = false;
		isDraggingTitle = false;
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
					currentSelected,
					{
						discTitle: doodledialStore.discTitle,
						discTitleX: doodledialStore.discTitleX,
						discTitleY: doodledialStore.discTitleY,
						discTitleFontSize: doodledialStore.discTitleFontSize
					}
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
		void doodledialStore.discTitle;
		void doodledialStore.discTitleX;
		void doodledialStore.discTitleY;
		void doodledialStore.discTitleFontSize;
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
					class="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow z-30"
				>
					Drag labels to reposition
				</div>
			{/if}
			{#if hiddenCount > 0}
				<div
					class="absolute top-0 left-0 right-0 bg-amber-400 text-amber-900 text-xs px-3 py-2 rounded-t-xl flex items-center gap-2 z-20 shadow-sm"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 shrink-0"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="flex-1">
						{hiddenCount} of {doodledialStore.layers.length} layers hidden — excluded from export, optimization,
						and overlap checks
					</span>
					<button
						type="button"
						onclick={() => doodledialStore.showAllLayers()}
						class="bg-amber-300 hover:bg-amber-200 active:bg-amber-400 px-2 py-0.5 rounded text-xs font-medium transition-colors"
					>
						Show all
					</button>
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
	:global(.disc-title) {
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
	}
	:global(.disc-title:active) {
		cursor: grabbing;
	}
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
