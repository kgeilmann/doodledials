<script lang="ts">
	import FileUpload from '$lib/components/FileUpload.svelte';
	import DiameterControl from '$lib/components/DiameterControl.svelte';
	import DialPreview from '$lib/components/DialPreview.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import LayerList from '$lib/components/LayerList.svelte';
	import RasterPreviewModal from '$lib/components/RasterPreviewModal.svelte';
	import { OptimizerCancelledError, runOptimizer } from '$lib/optimizer/run-optimizer';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	let showRasterPreview = $state(false);
	let optimizerPending = $state(false);
	let optimizerProgress = $state(0);
	let optimizerProgressPhase = $state('Idle');
	let optimizerProgressMessage = $state('');
	let optimizerIteration = $state(0);
	let optimizerTotalIterations = $state(0);
	let optimizerAbortController = $state<AbortController | null>(null);
	let optimizerOverlayVisible = $state(false);
	let overlayHideTimer: ReturnType<typeof setTimeout> | null = null;

	function handleCancelOptimizer() {
		optimizerAbortController?.abort();
	}

	function clearOverlayHideTimer() {
		if (overlayHideTimer) {
			clearTimeout(overlayHideTimer);
			overlayHideTimer = null;
		}
	}

	function scheduleOverlayHide() {
		clearOverlayHideTimer();
		overlayHideTimer = setTimeout(() => {
			optimizerOverlayVisible = false;
			overlayHideTimer = null;
		}, 1200);
	}

	async function handleRunOptimizer() {
		if (!doodledialStore.svgContent || optimizerPending) {
			return;
		}

		optimizerPending = true;
		optimizerProgress = 0;
		optimizerProgressPhase = 'Starting';
		optimizerProgressMessage = 'Preparing optimizer input...';
		optimizerIteration = 0;
		optimizerTotalIterations = 0;
		optimizerOverlayVisible = true;
		clearOverlayHideTimer();
		optimizerAbortController = new AbortController();

		let optimizerApplied = false;
		let optimizerCancelled = false;

		try {
			const result = await runOptimizer(
				{
					diameter: doodledialStore.config.diameter,
					config: doodledialStore.config,
					layers: doodledialStore.layers,
					svgContent: doodledialStore.svgContent
				},
				(progress) => {
					optimizerProgressPhase = 'Optimizing';
					optimizerProgress = progress.percent;
					optimizerProgressMessage = progress.message;
					optimizerIteration = progress.iteration;
					optimizerTotalIterations = progress.totalIterations;
				},
				{ signal: optimizerAbortController.signal }
			);

			doodledialStore.applyLayerRotations(result.layout);
			optimizerApplied = true;

			console.log('[optimizer] Frontend optimizer response:', result);
		} catch (error) {
			if (error instanceof OptimizerCancelledError) {
				optimizerCancelled = true;
				optimizerProgressPhase = 'Cancelled';
				optimizerProgressMessage = `Iterations ${optimizerIteration}/${optimizerTotalIterations || '?'} - optimization cancelled.`;
			} else {
				optimizerProgressPhase = 'Error';
				optimizerProgressMessage = 'Optimization failed. Please try again.';
				console.error('[optimizer] Frontend optimizer call failed:', error);
			}
		} finally {
			if (optimizerApplied) {
				optimizerProgress = 100;
				optimizerProgressPhase = 'Complete';
				optimizerProgressMessage = `Iterations ${optimizerIteration}/${optimizerTotalIterations || optimizerIteration} - layout applied.`;
			}

			if (optimizerCancelled && optimizerProgress === 0) {
				optimizerProgressMessage = 'Optimization cancelled.';
			}

			optimizerPending = false;
			optimizerAbortController = null;
			scheduleOverlayHide();
		}
	}
</script>

<svelte:head>
	<title>Doodledial Generator</title>
</svelte:head>

<main class="h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex">
	<div
		class="w-96 shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col gap-6 overflow-y-auto border-r border-gray-200"
	>
		<header class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-1">Doodledial Generator</h1>
			<p class="text-sm text-gray-500">Upload an SVG and create a dial to print</p>
		</header>

		<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-indigo-100 rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-semibold text-gray-800">Upload SVG</h2>
			</div>
			<FileUpload />
			{#if doodledialStore.error}
				<p class="mt-3 text-sm text-red-600 flex items-center gap-1">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					{doodledialStore.error}
				</p>
			{/if}
		</section>

		<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-indigo-100 rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-semibold text-gray-800">Disc Settings</h2>
			</div>
			<DiameterControl />
		</section>

		{#if doodledialStore.svgContent}
			<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
				<div class="flex items-center gap-3 mb-4">
					<div class="p-2 bg-indigo-100 rounded-lg">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-indigo-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<h2 class="text-lg font-semibold text-gray-800">Layer Management</h2>
				</div>
				<LayerList />
			</section>
		{/if}
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex justify-end p-4 gap-3">
			<button
				onclick={handleRunOptimizer}
				disabled={!doodledialStore.svgContent || optimizerPending}
				class="px-5 py-2.5 bg-indigo-600 text-white border border-indigo-600 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed enabled:hover:bg-indigo-700 enabled:hover:border-indigo-700 enabled:active:scale-95"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				<span>{optimizerPending ? 'Running Optimizer...' : 'Run Optimizer'}</span>
			</button>
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
		<div class="flex-1 p-4">
			<div class="relative h-full w-full">
				<div class="h-full flex items-center justify-center">
					<DialPreview />
				</div>
				{#if optimizerOverlayVisible}
					<div class="absolute inset-0 z-20 flex items-start justify-center pointer-events-none">
						<div class="absolute inset-0 rounded-2xl bg-slate-900/20 backdrop-blur-[1px]"></div>
						<section
							class="pointer-events-auto relative mt-4 w-full max-w-2xl rounded-2xl border border-indigo-200 bg-white/95 shadow-lg px-4 py-3"
						>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-2 gap-4">
								<span class="font-medium uppercase tracking-wide">{optimizerProgressPhase}</span>
								<span data-testid="optimizer-iteration-counter"
									>Iterations {optimizerIteration}/{optimizerTotalIterations || '?'}</span
								>
							</div>
							<div
								class="h-2 w-full rounded-full bg-indigo-100 overflow-hidden"
								data-testid="optimizer-progress-track"
							>
								<div
									data-testid="optimizer-progress-bar"
									class="h-full bg-indigo-600 transition-all duration-300"
									style="width: {optimizerProgress}%;"
								></div>
							</div>
							<div class="mt-2 flex items-center justify-between gap-4">
								<p class="text-sm text-slate-700" data-testid="optimizer-progress-message">
									{optimizerProgressMessage}
								</p>
								{#if optimizerPending}
									<button
										onclick={handleCancelOptimizer}
										class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
										data-testid="optimizer-cancel-button"
									>
										Cancel
									</button>
								{/if}
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<RasterPreviewModal bind:open={showRasterPreview} />
</main>
