<script lang="ts">
	import FileUpload from '$lib/components/FileUpload.svelte';
	import DiameterControl from '$lib/components/DiameterControl.svelte';
	import DialPreview from '$lib/components/DialPreview.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import LayerList from '$lib/components/LayerList.svelte';
	import {
		BruteforceOptimizerCancelledError,
		runBruteforceOptimizer,
		type BruteforceOptimizerStopReason,
		type BruteforceResumeContext,
		analyzeCircularGaps
	} from '$lib/optimizer/run-bruteforce-optimizer';
	import type { OptimizerTuning } from '$lib/optimizer/run-optimizer';
	import { combineOptimizerSvgTemplate, type OptimizerSvgTemplate } from '$lib/utils/doodledial';
	import { OptimizerCancelledError, runOptimizer } from '$lib/optimizer/run-optimizer';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import GlobalConfigDialog from '$lib/components/GlobalConfigDialog.svelte';
	import { globalConfig } from '$lib/stores/global-config.svelte';

	type OptimizerMode = 'force-directed' | 'bruteforce';

	let optimizerPending = $state(false);
	let optimizerProgress = $state(0);
	let optimizerProgressPhase = $state('Idle');
	let optimizerProgressMessage = $state('');
	let optimizerIteration = $state(0);
	let optimizerTotalIterations = $state(0);
	let optimizerAbortController = $state<AbortController | null>(null);
	let optimizerOverlayVisible = $state(false);
	let overlayHideTimer: ReturnType<typeof setTimeout> | null = null;
	let optimizerLiveTimer: ReturnType<typeof setInterval> | null = null;
	let optimizerRunDialogOpen = $state(false);
	let optimizerInitializeRandomly = $state(false);
	let optimizerRoundOutputAngles = $state(true);
	let optimizerGapMmInput = $state(String(globalConfig.optimizerGapDefault));
	let optimizerRandomSeedInput = $state('42');
	let optimizerMaxRuntimeSInput = $state(String(globalConfig.bruteforceTimeLimit));
	let optimizerMode = $state<OptimizerMode>('force-directed');
	let optimizerActiveMode = $state<OptimizerMode>('force-directed');
	let optimizerElapsedMs = $state(0);
	let optimizerMaxRuntimeMs = $state<number | null>(null);

	interface BruteforceRunSummary {
		stopReason: BruteforceOptimizerStopReason;
		feasibleSolutionsFound: number;
		combinationsSearched: number;
		totalCombinations: number;
		elapsedMs: number;
		layoutApplied: boolean;
	}
	let bruteforceResultDialogOpen = $state(false);
	let bruteforceRunSummary = $state<BruteforceRunSummary | null>(null);
	let bruteforceExtendRuntimeSInput = $state('60');
	let bruteforceResumeContext = $state<BruteforceResumeContext | null>(null);
	let optimizerTopLayouts = $state<Record<string, number>[]>([]);
	let optimizerSvgTemplate = $state<OptimizerSvgTemplate | null>(null);
	let optimizerResultSelectedIndex = $state(0);
	let bruteforceUserStopped = $state(false);

	function fitSvg(svg: string): string {
		return svg
			.replace(/^(<svg[^>]*?)\s+width="[^"]*"/, '$1')
			.replace(/^(<svg[^>]*?)\s+height="[^"]*"/, '$1')
			.replace(/^<svg/, '<svg style="width:100%;height:100%"');
	}

	let optimizerThumbnailSvgs = $derived.by(() => {
		const template = optimizerSvgTemplate;
		if (!template || optimizerTopLayouts.length === 0) return [];
		return optimizerTopLayouts.map((layout) =>
			fitSvg(combineOptimizerSvgTemplate(template, layout))
		);
	});

	const optimizerTuningDefaults: Required<OptimizerTuning> = {
		overlapMagnitudeWeight: 0.1,
		overlapMagnitudePower: 1.2,
		maxOverlapForceMagnitude: 8,
		overlapTestStep: 1,
		overlapDirectionSearchSteps: [1, 2, 4, 8],
		timeStepDt: 0.5,
		restoringForceWeight: 0.02,
		maxRestoringForce: 2,
		uniqueForceWeight: 0.02,
		minUniqueAngleSeparation: 5,
		maxUniqueForce: 2
	};

	let optimizerTuning = $state({ ...optimizerTuningDefaults });

	function resetOptimizerTuning() {
		optimizerTuning = { ...optimizerTuningDefaults };
		optimizerInitializeRandomly = false;
		optimizerRoundOutputAngles = true;
		optimizerGapMmInput = String(globalConfig.optimizerGapDefault);
		optimizerRandomSeedInput = '42';
		optimizerMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
	}

	function handleAcceptBruteforceResult() {
		bruteforceResultDialogOpen = false;
	}

	async function handleContinueBruteforce() {
		bruteforceResultDialogOpen = false;
		optimizerMaxRuntimeSInput = bruteforceExtendRuntimeSInput;
		await handleRunOptimizer('bruteforce', bruteforceResumeContext);
	}

	function handleStopOptimizer() {
		if (optimizerActiveMode === 'bruteforce') {
			bruteforceUserStopped = true;
		}
		optimizerAbortController?.abort();
	}

	function handleOpenOptimizerDialog(mode: OptimizerMode) {
		if (!doodledialStore.svgContent || optimizerPending) {
			return;
		}

		optimizerMode = mode;
		optimizerGapMmInput = String(globalConfig.optimizerGapDefault);
		optimizerMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
		optimizerRunDialogOpen = true;
	}

	function handleCloseOptimizerDialog() {
		optimizerRunDialogOpen = false;
	}

	async function handleConfirmOptimizerDialogRun() {
		optimizerRunDialogOpen = false;
		bruteforceResumeContext = null;
		await handleRunOptimizer(optimizerMode);
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

	function clearOptimizerLiveTimer() {
		if (optimizerLiveTimer) {
			clearInterval(optimizerLiveTimer);
			optimizerLiveTimer = null;
		}
	}

	function startOptimizerLiveTimer(runStartedAtMs: number) {
		clearOptimizerLiveTimer();

		const tick = () => {
			if (!optimizerPending) {
				clearOptimizerLiveTimer();
				return;
			}

			const elapsedMs = Date.now() - runStartedAtMs;
			optimizerElapsedMs = elapsedMs;

			if (
				optimizerActiveMode === 'bruteforce' &&
				typeof optimizerMaxRuntimeMs === 'number' &&
				optimizerMaxRuntimeMs > 0
			) {
				const runtimePercent = Math.min(99, Math.round((elapsedMs / optimizerMaxRuntimeMs) * 100));
				optimizerProgress = Math.max(optimizerProgress, runtimePercent);
			}
		};

		tick();
		optimizerLiveTimer = setInterval(tick, 100);
	}

	function formatProgressCountLabel(mode: OptimizerMode, total: number | string): string {
		if (mode === 'bruteforce') {
			return `Combinations ${optimizerIteration}/${total}`;
		}

		return `Iterations ${optimizerIteration}/${total}`;
	}

	function formatDurationMs(durationMs: number): string {
		return `${(durationMs / 1000).toFixed(1)}s`;
	}

	async function handleRunOptimizer(
		mode: OptimizerMode = optimizerMode,
		resumeContext: BruteforceResumeContext | null = null
	) {
		if (!doodledialStore.svgContent || optimizerPending) {
			return;
		}

		optimizerPending = true;
		optimizerProgress = 0;
		optimizerProgressPhase = 'Starting';
		optimizerProgressMessage = 'Preparing optimizer input...';
		optimizerIteration = 0;
		optimizerTotalIterations = 0;
		optimizerElapsedMs = 0;
		optimizerMaxRuntimeMs = null;
		optimizerActiveMode = mode;
		optimizerOverlayVisible = true;
		optimizerTopLayouts = [];
		optimizerSvgTemplate = null;
		bruteforceUserStopped = false;
		clearOverlayHideTimer();
		clearOptimizerLiveTimer();
		optimizerAbortController = new AbortController();
		const runStartedAtMs = Date.now();

		let optimizerApplied = false;
		let optimizerCancelled = false;
		let optimizerTimeLimited = false;
		let optimizerNoFeasible = false;
		let bruteforceRunStopReason: BruteforceOptimizerStopReason | null = null;
		let bruteforceRunFeasibleCount = 0;

		try {
			const parsedGapMm = Number(optimizerGapMmInput);
			const gapMm =
				Number.isFinite(parsedGapMm) && parsedGapMm > 0
					? parsedGapMm
					: (doodledialStore.config.optimizerGapMm ?? globalConfig.optimizerGapDefault);
			doodledialStore.setOptimizerGapMm(gapMm);
			optimizerGapMmInput = String(gapMm);

			const optimizerInput = {
				diameter: doodledialStore.config.diameter,
				config: doodledialStore.config,
				layers: doodledialStore.layers.filter((l) => l.visible),
				svgContent: doodledialStore.svgContent
			};
			const parsedSeed = Number(optimizerRandomSeedInput);
			const randomSeed = Number.isFinite(parsedSeed) ? parsedSeed : undefined;
			const parsedMaxRuntimeS = Math.round(Number(optimizerMaxRuntimeSInput));
			const maxRuntimeMs =
				Number.isFinite(parsedMaxRuntimeS) && parsedMaxRuntimeS >= 0
					? parsedMaxRuntimeS * 1000
					: undefined;

			const progressHandler = (progress: {
				percent: number;
				message: string;
				iteration: number;
				totalIterations: number;
				feasibleSolutionsFound?: number;
				topLayouts?: Record<string, number>[];
				optimizerSvgTemplate?: OptimizerSvgTemplate;
			}) => {
				optimizerProgressPhase = 'Optimizing';
				optimizerProgress = Math.max(optimizerProgress, progress.percent);
				optimizerProgressMessage = progress.message;
				optimizerIteration = progress.iteration;
				optimizerTotalIterations = progress.totalIterations;
				optimizerElapsedMs = Date.now() - runStartedAtMs;
				if (progress.topLayouts) {
					optimizerTopLayouts = progress.topLayouts;
				}
				if (progress.optimizerSvgTemplate) {
					optimizerSvgTemplate = progress.optimizerSvgTemplate;
				}
				if (typeof progress.feasibleSolutionsFound === 'number') {
					bruteforceRunFeasibleCount = progress.feasibleSolutionsFound;
				}
			};

			if (mode === 'bruteforce') {
				optimizerMaxRuntimeMs = typeof maxRuntimeMs === 'number' ? maxRuntimeMs : null;
				startOptimizerLiveTimer(runStartedAtMs);
				const bruteForceResult = await runBruteforceOptimizer(optimizerInput, progressHandler, {
					signal: optimizerAbortController.signal,
					roundOutputAngles: optimizerRoundOutputAngles,
					maxRuntimeMs,
					resumeContext: resumeContext ?? undefined,
					onSearchSnapshot: (snapshot) => {
						if (snapshot.resumeContext) {
							bruteforceResumeContext = snapshot.resumeContext;
						}
					}
				});

				bruteforceRunStopReason = bruteForceResult.stopReason;
				bruteforceRunFeasibleCount = bruteForceResult.feasibleSolutionsFound;
				bruteforceResumeContext = bruteForceResult.resumeContext;
				optimizerTimeLimited = bruteForceResult.stopReason === 'time_limit';
				optimizerNoFeasible = bruteForceResult.stopReason === 'no_feasible_solution';
				if (bruteForceResult.feasibleSolutionsFound > 0) {
					optimizerApplied = false; // user picks from the dialog
				}

				console.log('[optimizer] Frontend optimizer response:', bruteForceResult);
			} else {
				startOptimizerLiveTimer(runStartedAtMs);
				const forceDirectedResult = await runOptimizer(optimizerInput, progressHandler, {
					signal: optimizerAbortController.signal,
					initializeRandomly: optimizerInitializeRandomly,
					randomSeed: optimizerInitializeRandomly ? randomSeed : undefined,
					roundOutputAngles: optimizerRoundOutputAngles,
					tuning: {
						overlapMagnitudeWeight: optimizerTuning.overlapMagnitudeWeight,
						overlapMagnitudePower: optimizerTuning.overlapMagnitudePower,
						maxOverlapForceMagnitude: optimizerTuning.maxOverlapForceMagnitude,
						timeStepDt: optimizerTuning.timeStepDt,
						restoringForceWeight: optimizerTuning.restoringForceWeight,
						maxRestoringForce: optimizerTuning.maxRestoringForce,
						uniqueForceWeight: optimizerTuning.uniqueForceWeight,
						minUniqueAngleSeparation: optimizerTuning.minUniqueAngleSeparation,
						maxUniqueForce: optimizerTuning.maxUniqueForce
					}
				});

				doodledialStore.applyLayerRotations(forceDirectedResult.layout);
				optimizerApplied = true;
				console.log('[optimizer] Frontend optimizer response:', forceDirectedResult);
			}
		} catch (error) {
			if (
				error instanceof OptimizerCancelledError ||
				error instanceof BruteforceOptimizerCancelledError
			) {
				if (optimizerActiveMode === 'bruteforce') {
					bruteforceRunStopReason = 'stopped';
					bruteforceRunFeasibleCount = Math.max(
						bruteforceRunFeasibleCount,
						optimizerTopLayouts.length
					);
					optimizerProgressPhase = 'Stopped';
					optimizerProgressMessage = `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || '?')} - optimisation stopped.`;
				} else {
					optimizerCancelled = true;
					optimizerProgressPhase = 'Cancelled';
					optimizerProgressMessage = `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || '?')} - optimisation cancelled.`;
				}
			} else {
				optimizerProgressPhase = 'Error';
				optimizerProgressMessage = 'Optimization failed. Please try again.';
				console.error('[optimizer] Frontend optimizer call failed:', error);
			}
		} finally {
			clearOptimizerLiveTimer();
			optimizerElapsedMs = Date.now() - runStartedAtMs;

			if (optimizerApplied) {
				optimizerProgress = 100;
				optimizerProgressPhase = optimizerTimeLimited ? 'Time Limit' : 'Complete';
				optimizerProgressMessage = optimizerTimeLimited
					? `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || optimizerIteration)} - time limit reached, best feasible layout applied.`
					: `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || optimizerIteration)} - layout applied.`;
			}

			if (optimizerNoFeasible) {
				optimizerProgress = 100;
				optimizerProgressPhase = 'No Feasible Layout';
				optimizerProgressMessage = `${formatProgressCountLabel(optimizerActiveMode, optimizerTotalIterations || optimizerIteration || '?')} - no feasible non-overlapping layout found.`;
			}

			if (optimizerCancelled && optimizerProgress === 0) {
				optimizerProgressMessage = 'Optimization cancelled.';
			}

			optimizerPending = false;
			optimizerAbortController = null;
			scheduleOverlayHide();
			if (mode === 'bruteforce' && bruteforceRunStopReason !== null) {
				bruteforceRunSummary = {
					stopReason: bruteforceRunStopReason,
					feasibleSolutionsFound: bruteforceRunFeasibleCount,
					combinationsSearched: optimizerIteration,
					totalCombinations: optimizerTotalIterations,
					elapsedMs: optimizerElapsedMs,
					layoutApplied: optimizerApplied
				};
				if (bruteforceUserStopped) {
					const remainingMs = Math.max(0, (optimizerMaxRuntimeMs ?? 0) - optimizerElapsedMs);
					bruteforceExtendRuntimeSInput = String(Math.round(remainingMs / 1000));
				} else {
					bruteforceExtendRuntimeSInput = optimizerMaxRuntimeSInput;
				}
				bruteforceResultDialogOpen = true;
			}
		}
	}
</script>

<svelte:head>
	<title>Doodle Dial Generator</title>
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
			{#if doodledialStore.svgContent}
				<hr class="my-4 border-gray-100" />
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
						<span>Title</span>
						<input
							type="text"
							placeholder="Optional disc title..."
							value={doodledialStore.discTitle}
							oninput={(e) => doodledialStore.setDiscTitle(e.currentTarget.value)}
							class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</label>
					<div class="flex items-center gap-3">
						<span class="text-xs font-medium text-gray-600 shrink-0">Font size</span>
						<input
							type="range"
							min="8"
							max="36"
							step="1"
							value={doodledialStore.discTitleFontSize}
							oninput={(e) => doodledialStore.setDiscTitleFontSize(Number(e.currentTarget.value))}
							class="flex-1 accent-indigo-600"
						/>
						<span class="text-xs text-gray-500 w-8 text-right"
							>{doodledialStore.discTitleFontSize}</span
						>
					</div>
					<p class="text-xs text-gray-400">Drag title text on the disc to reposition it.</p>
				</div>
			{/if}
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
				onclick={() =>
					handleOpenOptimizerDialog(
						globalConfig.forceDirectedOptimizerEnabled ? 'force-directed' : 'bruteforce'
					)}
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
				onclick={() => globalConfig.open()}
				class="px-3 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out hover:bg-gray-50 active:scale-95"
				aria-label="Open global settings"
				data-testid="global-config-gear-button"
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
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
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
							class="pointer-events-auto relative mt-4 w-full max-w-4xl rounded-2xl border border-indigo-200 bg-white/95 shadow-lg px-4 py-3"
						>
							<div class="flex items-center text-xs text-slate-600 mb-2">
								<span class="font-medium uppercase tracking-wide">{optimizerProgressPhase}</span>
							</div>
							{#if optimizerActiveMode === 'bruteforce'}
								<div
									class="mb-2 flex items-center justify-between text-xs text-slate-600"
									data-testid="optimizer-time-counter"
								>
									<span>Elapsed {formatDurationMs(optimizerElapsedMs)}</span>
									<span>
										Max {optimizerMaxRuntimeMs === null
											? 'No limit'
											: formatDurationMs(optimizerMaxRuntimeMs)}
									</span>
								</div>
							{/if}
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
										onclick={handleStopOptimizer}
										class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
										data-testid="optimizer-cancel-button"
									>
										Stop
									</button>
								{/if}
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
	{#if optimizerRunDialogOpen}
		<div
			class="fixed inset-0 z-30 flex items-center justify-center p-4"
			data-testid="optimizer-config-dialog"
		>
			<button
				type="button"
				onclick={handleCloseOptimizerDialog}
				class="absolute inset-0 bg-slate-900/40"
				aria-label="Close optimizer dialog"
			></button>

			<section
				class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
			>
				<div>
					<h2 class="text-xl font-semibold text-gray-900">
						{optimizerMode === 'bruteforce' ? 'Run Brute Force Optimizer' : 'Run Optimizer'}
					</h2>
					<p class="text-sm text-gray-600 mt-1">Configure options, then start optimization.</p>
				</div>

				<div class="grid grid-cols-2 gap-3 text-sm">
					{#if optimizerMode === 'force-directed'}
						<label class="col-span-2 flex items-center gap-2">
							<input type="checkbox" bind:checked={optimizerRoundOutputAngles} />
							<span>Round Output Angles</span>
						</label>
						<label class="col-span-2 flex items-center gap-2">
							<input type="checkbox" bind:checked={optimizerInitializeRandomly} />
							<span>Initialize Randomly</span>
						</label>
						<label class="col-span-2">
							<span class="block text-gray-600 mb-1">Gap (mm)</span>
							<input
								type="number"
								min="0.1"
								step="0.1"
								bind:value={optimizerGapMmInput}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label class="col-span-2">
							<span class="block text-gray-600 mb-1">Random Seed</span>
							<input
								type="text"
								bind:value={optimizerRandomSeedInput}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
					{/if}
					{#if optimizerMode === 'bruteforce'}
						<label class="col-span-2">
							<span class="block text-gray-600 mb-1">Gap (mm)</span>
							<input
								type="number"
								min="0.1"
								step="0.1"
								bind:value={optimizerGapMmInput}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label class="col-span-2">
							<span class="block text-gray-600 mb-1">Max Runtime (s)</span>
							<input
								type="number"
								min="0"
								step="1"
								bind:value={optimizerMaxRuntimeSInput}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
					{/if}
					{#if optimizerMode === 'force-directed'}
						<label>
							<span class="block text-gray-600 mb-1">Overlap Weight</span>
							<input
								type="number"
								step="0.01"
								bind:value={optimizerTuning.overlapMagnitudeWeight}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Overlap Power</span>
							<input
								type="number"
								step="0.1"
								bind:value={optimizerTuning.overlapMagnitudePower}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Max Overlap Force</span>
							<input
								type="number"
								step="0.1"
								bind:value={optimizerTuning.maxOverlapForceMagnitude}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Time Step</span>
							<input
								type="number"
								step="0.05"
								bind:value={optimizerTuning.timeStepDt}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Restoring Weight</span>
							<input
								type="number"
								step="0.01"
								bind:value={optimizerTuning.restoringForceWeight}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Max Restoring Force</span>
							<input
								type="number"
								step="0.1"
								bind:value={optimizerTuning.maxRestoringForce}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Unique Weight</span>
							<input
								type="number"
								step="0.01"
								bind:value={optimizerTuning.uniqueForceWeight}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label>
							<span class="block text-gray-600 mb-1">Min Unique Separation</span>
							<input
								type="number"
								step="0.5"
								bind:value={optimizerTuning.minUniqueAngleSeparation}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
						<label class="col-span-2">
							<span class="block text-gray-600 mb-1">Max Unique Force</span>
							<input
								type="number"
								step="0.1"
								bind:value={optimizerTuning.maxUniqueForce}
								class="w-full rounded-lg border border-gray-300 px-2 py-1"
							/>
						</label>
					{/if}
				</div>

				<div class="mt-5 flex items-center justify-between gap-3">
					<button
						type="button"
						onclick={resetOptimizerTuning}
						class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
					>
						Reset Defaults
					</button>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={handleCloseOptimizerDialog}
							class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
							data-testid="optimizer-dialog-cancel-button"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleConfirmOptimizerDialogRun}
							class="px-4 py-2 rounded-lg border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700"
							data-testid="optimizer-dialog-run-button"
						>
							Start Optimization
						</button>
					</div>
				</div>
			</section>
		</div>
	{/if}

	{#if bruteforceResultDialogOpen && bruteforceRunSummary}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-30 flex items-center justify-center p-4"
			data-testid="bruteforce-result-dialog"
			onkeydown={(e) => e.key === 'Escape' && handleAcceptBruteforceResult()}
		>
			<button
				type="button"
				onclick={handleAcceptBruteforceResult}
				class="absolute inset-0 bg-slate-900/40"
				aria-label="Close result dialog"
			></button>
			<section
				class="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
			>
				<div class="px-6 py-4 border-b border-gray-100">
					<h2 class="text-lg font-semibold text-gray-900">
						{#if bruteforceRunSummary.stopReason === 'stopped'}
							Search Stopped — Select a Layout
						{:else if bruteforceRunSummary.stopReason === 'time_limit'}
							Time Limit Reached — Select a Layout
						{:else if bruteforceRunSummary.stopReason === 'exact_complete'}
							Search Complete — Select a Layout
						{:else}
							No Feasible Layout Found
						{/if}
					</h2>
					<p class="text-sm text-gray-500 mt-0.5">
						{bruteforceRunSummary.feasibleSolutionsFound} feasible layouts found. Click a thumbnail to
						preview, then accept.
					</p>
				</div>

				{#if bruteforceRunSummary.feasibleSolutionsFound > 0}
					{@const selectedLayout = optimizerTopLayouts[optimizerResultSelectedIndex]}
					{@const scores = selectedLayout ? analyzeCircularGaps(selectedLayout) : null}
					<!-- Split body -->
					<div class="flex flex-1 min-h-0">
						<!-- Left: thumbnail grid (2×6) -->
						<div class="w-64 shrink-0 p-4 border-r border-gray-100 overflow-y-auto">
							<div class="grid grid-cols-2 gap-2">
								{#each optimizerThumbnailSvgs as thumbSvg, index (index)}
									{@const isSelected = optimizerResultSelectedIndex === index}
									<button
										type="button"
										onclick={() => {
											optimizerResultSelectedIndex = index;
										}}
										class="relative aspect-square rounded-lg border-2 overflow-hidden p-0.5 flex items-center justify-center transition-all duration-150 {isSelected
											? 'border-indigo-500 ring-2 ring-indigo-200'
											: 'border-gray-200 hover:border-indigo-300'}"
									>
										{#if thumbSvg}
											<div class="w-full h-full">
												{@html thumbSvg}
											</div>
										{:else}
											<span class="text-xs text-gray-300">rendering...</span>
										{/if}
										<div
											class="absolute bottom-1 right-1 text-xs font-semibold {isSelected
												? 'text-indigo-600'
												: 'text-gray-500'} bg-white/90 px-1.5 py-0.5 rounded-full shadow-xs"
										>
											#{index + 1}
										</div>
									</button>
								{/each}
							</div>

							<!-- Summary stats below grid -->
							<div class="mt-4 text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-3">
								<div class="flex justify-between">
									<span>Combinations searched</span>
									<span class="text-gray-900 font-medium">
										{bruteforceRunSummary.combinationsSearched.toLocaleString()} /
										{bruteforceRunSummary.totalCombinations >= Number.MAX_SAFE_INTEGER
											? '∞'
											: bruteforceRunSummary.totalCombinations.toLocaleString()}
									</span>
								</div>
								<div class="flex justify-between">
									<span>Elapsed</span>
									<span class="text-gray-900 font-medium"
										>{formatDurationMs(bruteforceRunSummary.elapsedMs)}</span
									>
								</div>
								<div class="flex justify-between">
									<span>Stop reason</span>
									<span class="text-gray-900 font-medium">{bruteforceRunSummary.stopReason}</span>
								</div>
							</div>
						</div>

						<!-- Right: large preview -->
						<div class="flex-1 flex flex-col p-4 min-w-0">
							<div class="flex items-center justify-between mb-3">
								<span class="text-sm font-medium text-gray-700">
									Layout #{optimizerResultSelectedIndex + 1}
								</span>
								{#if scores}
									<div class="flex gap-3 text-xs text-gray-500">
										<span>Min gap: <strong class="text-gray-900">{scores.minGap}°</strong></span>
										<span
											>Variance: <strong class="text-gray-900">{scores.variance.toFixed(0)}</strong
											></span
										>
										<span
											>Deviation: <strong class="text-gray-900"
												>{scores.deviationSum.toFixed(0)}°</strong
											></span
										>
									</div>
								{/if}
							</div>

							<div
								class="flex-1 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center min-h-[300px] overflow-hidden p-4"
							>
								{#if selectedLayout && optimizerSvgTemplate}
									{@const previewSvg = fitSvg(
										combineOptimizerSvgTemplate(optimizerSvgTemplate, selectedLayout)
									)}
									<div class="w-full h-full flex items-center justify-center">
										{@html previewSvg}
									</div>
								{:else}
									<span class="text-sm text-gray-400">No preview available</span>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- No feasible solutions -->
					<div class="p-8 text-center text-gray-500">
						<p class="text-sm">
							No non-overlapping layout was found. Try increasing the gap or adjusting layer
							positions.
						</p>
					</div>
				{/if}

				<!-- Footer -->
				<div class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
					{#if bruteforceRunSummary.stopReason === 'time_limit' || bruteforceRunSummary.stopReason === 'stopped'}
						<div class="flex items-center gap-3">
							<button
								type="button"
								onclick={handleContinueBruteforce}
								class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
								data-testid="bruteforce-result-continue-button"
							>
								Continue Searching
							</button>
							<div class="flex items-center gap-2 text-sm text-gray-500">
								<span>Continue for</span>
								<input
									type="number"
									min="1"
									step="1"
									bind:value={bruteforceExtendRuntimeSInput}
									class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
								/>
								<span>s</span>
							</div>
						</div>
					{:else}
						<div></div>
					{/if}
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={handleAcceptBruteforceResult}
							class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
						>
							Cancel
						</button>
						{#if bruteforceRunSummary.feasibleSolutionsFound > 0}
							<button
								type="button"
								onclick={() => {
									const selectedLayout = optimizerTopLayouts[optimizerResultSelectedIndex];
									if (selectedLayout) {
										doodledialStore.applyLayerRotations(selectedLayout);
									}
									bruteforceResultDialogOpen = false;
								}}
								class="px-4 py-2 rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
								data-testid="bruteforce-result-accept-button"
							>
								Accept Layout
							</button>
						{/if}
					</div>
				</div>
			</section>
		</div>
	{/if}
	<GlobalConfigDialog />
</main>
