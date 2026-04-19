<script lang="ts">
	import { tick } from 'svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { DPI, MM_PER_INCH } from '$lib/utils/constants';

	let { open = $bindable(false) } = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let isGenerating = $state(false);
	let renderError = $state<string | null>(null);

	const pixelSize = $derived(Math.round((doodledialStore.config.diameter / MM_PER_INCH) * DPI));

	async function generateRaster() {
		await tick();
		await tick();
		await tick();

		console.log('generateRaster called, canvas:', canvas);

		if (!doodledialStore.combinedSvg || !canvas) {
			console.log('Missing combinedSvg or canvas', {
				hasSvg: !!doodledialStore.combinedSvg,
				hasCanvas: !!canvas
			});
			return;
		}

		isGenerating = true;
		renderError = null;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			renderError = 'Failed to get canvas context';
			isGenerating = false;
			return;
		}

		canvas.width = pixelSize;
		canvas.height = pixelSize;

		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, pixelSize, pixelSize);

		const img = new Image();
		const svgBlob = new Blob([doodledialStore.combinedSvg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(svgBlob);

		console.log('Loading SVG, size:', pixelSize);

		img.onload = () => {
			console.log('Image loaded, drawing to canvas');
			ctx.drawImage(img, 0, 0, pixelSize, pixelSize);
			URL.revokeObjectURL(url);
			isGenerating = false;
			console.log('Done, isGenerating:', false);
		};

		img.onerror = (e) => {
			console.error('Image load error:', e);
			renderError = 'Failed to load SVG image';
			URL.revokeObjectURL(url);
			isGenerating = false;
		};

		img.src = url;
	}

	$effect(() => {
		if (open && doodledialStore.combinedSvg) {
			console.log('Modal opened, scheduling generateRaster');
			tick().then(generateRaster);
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
				<h2 class="text-lg font-semibold text-gray-800">Raster Preview ({DPI} DPI)</h2>
				<button
					onclick={() => (open = false)}
					class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
					aria-label="Close modal"
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
			<div class="p-6 overflow-auto flex items-center justify-center min-h-[300px]">
				<canvas
					bind:this={canvas}
					class="max-w-full max-h-[70vh] object-contain border border-gray-200"
				></canvas>
			</div>
		</div>
	</div>
{/if}
