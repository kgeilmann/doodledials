<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import { combineDoodledial } from '$lib/utils/doodledial';
	import { getAngleFromCenter } from '$lib/utils/rotation';
	import { DPI, MM_PER_INCH } from '$lib/utils/constants';

	const VIEWBOX_PADDING = 1.1;

	const ZOOM_MIN = 0.25;
	const ZOOM_MAX = 3;
	const ZOOM_STEP = 0.1;
	const CARD_PADDING = 32;

	let zoomLevel = $state(1);
	let fitSize = $state(0);

	let isDragging = $state(false);
	let dragLayerId = $state<string | null>(null);
	let svgContainer: HTMLDivElement | null = $state(null);
	let outerWrapper: HTMLDivElement | null = $state(null);
	let didDrag = false;

	let scrollContainer: HTMLDivElement | null = $state(null);
	let isPanning = $state(false);
	let panStartX = 0;
	let panStartY = 0;
	let scrollStartLeft = 0;
	let scrollStartTop = 0;

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
		if (optimizerStore.optimizerPending) return;
		didDrag = false;
		const target = e.target as HTMLElement;

		const isDiscTitle = target.closest('[data-disc-title]') !== null;
		if (isDiscTitle) {
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
		if (!layerId) {
			// Background click — start pan mode
			if (!scrollContainer || !svgContainer) return;
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
			scrollStartLeft = scrollContainer.scrollLeft;
			scrollStartTop = scrollContainer.scrollTop;
			svgContainer.setPointerCapture(e.pointerId);
			return;
		}

		doodledialStore.setHighlightedLayer(layerId!);

		if (isPathLabel) {
			isDraggingLabel = true;
			dragLabelLayerId = layerId;

			const layer = doodledialStore.getLayer(layerId!);
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
		} else if (!isPathLabel) {
			isDragging = true;
			dragLayerId = layerId;
			(target as HTMLElement).setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (isPanning) {
			const dx = e.clientX - panStartX;
			const dy = e.clientY - panStartY;
			if (scrollContainer) {
				scrollContainer.scrollLeft = scrollStartLeft - dx;
				scrollContainer.scrollTop = scrollStartTop - dy;
			}
			return;
		}
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
		} else if (isDragging && dragLayerId) {
			didDrag = true;
			const { cx, cy } = getDiscCenter();
			const currentAngle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
			doodledialStore.setLayerRotation(dragLayerId, currentAngle + 90);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			if (svgContainer) {
				svgContainer.releasePointerCapture(e.pointerId);
			}
			return;
		}
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
		if (optimizerStore.optimizerPending) return;
		if (didDrag) return;
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

	function handleWheel(e: WheelEvent) {
		if (optimizerStore.optimizerPending) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
		zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel + delta));
	}

	function zoomIn() {
		zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
	}

	function zoomOut() {
		zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
	}

	function resetZoom() {
		zoomLevel = 1;
	}

	let combinedSvg = $derived.by(() => {
		if (!doodledialStore.svgContent) return null;
		try {
			return combineDoodledial(
				doodledialStore.svgContent,
				doodledialStore.config,
				doodledialStore.layers,
				doodledialStore.highlightedLayer,
				doodledialStore.selectedLayer,
				{
					discTitle: doodledialStore.discTitle,
					discTitleX: doodledialStore.discTitleX,
					discTitleY: doodledialStore.discTitleY,
					discTitleFontSize: doodledialStore.discTitleFontSize
				}
			);
		} catch {
			return null;
		}
	});

	$effect(() => {
		if (doodledialStore.svgContent && combinedSvg === null) {
			doodledialStore.setCombinedSvg(null);
			doodledialStore.setError('Failed to generate preview');
		} else if (combinedSvg) {
			doodledialStore.setCombinedSvg(combinedSvg);
			doodledialStore.setError(null);
		}
	});

	$effect(() => {
		const ps = paddedPixelSize;
		const el = outerWrapper;
		if (!el) {
			fitSize = ps;
			return;
		}

		const update = () => {
			const avail = Math.min(el.clientWidth, el.clientHeight);
			fitSize = Math.min(ps, Math.max(avail - CARD_PADDING, 200));
		};

		update();

		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<div class="w-full h-full flex items-center justify-center relative" bind:this={outerWrapper}>
	<div
		class="absolute inset-0 opacity-10"
		style="background-image: radial-gradient(circle, #6366f1 1px, transparent 1px); background-size: 20px 20px;"
	></div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	{#if doodledialStore.svgContent}
		<div class="absolute inset-0 overflow-auto flex cursor-grab" bind:this={scrollContainer}>
			<div
				class="shrink-0 flex items-center justify-center overflow-hidden rounded-xl"
				style="width: {fitSize * zoomLevel}px; height: {fitSize * zoomLevel}px; margin: auto;"
			>
				<div
					class="bg-white rounded-xl shadow-lg p-4 flex items-center justify-center overflow-hidden relative z-10 {optimizerStore.optimizerPending
						? 'cursor-not-allowed'
						: isPanning
							? 'cursor-grabbing'
							: ''}"
					style="width: {fitSize}px; height: {fitSize}px; transform: scale({zoomLevel}); transform-origin: center center;"
					bind:this={svgContainer}
					onpointerdown={handlePointerDown}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onclick={handleClick}
					onwheel={handleWheel}
				>
					<div
						class="absolute top-2 right-2 z-30 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-md px-2 py-1.5 text-xs select-none"
						onpointerdown={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onclick={zoomOut}
							disabled={zoomLevel <= ZOOM_MIN}
							class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
						>
							−
						</button>
						<span class="text-gray-600 font-medium tabular-nums min-w-[3ch] text-center"
							>{Math.round(zoomLevel * 100)}%</span
						>
						<button
							type="button"
							onclick={zoomIn}
							disabled={zoomLevel >= ZOOM_MAX}
							class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
						>
							+
						</button>
						<span class="w-px h-4 bg-gray-300 mx-0.5"></span>
						<button
							type="button"
							onclick={resetZoom}
							disabled={zoomLevel === 1}
							class="px-1.5 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500"
						>
							reset
						</button>
					</div>
					<div class="max-w-full max-h-full flex items-center justify-center">
						{@html doodledialStore.combinedSvg || ''}
					</div>
				</div>
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
	:global(.path-label) {
		cursor: grab;
	}
	:global(.path-label:hover) {
		fill: #6366f1;
		font-weight: 700;
	}
	:global(.path-label:active) {
		cursor: grabbing;
	}
</style>
