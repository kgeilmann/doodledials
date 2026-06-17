import {
	BruteforceOptimizerCancelledError,
	runBruteforceOptimizer,
	type BruteforceOptimizerStopReason,
	type BruteforceResumeContext
} from '$lib/optimizer/run-bruteforce-optimizer';
import { combineOptimizerSvgTemplate, type OptimizerSvgTemplate } from '$lib/utils/doodledial';
import {
	OptimizerCancelledError,
	runOptimizer,
	type OptimizerTuning
} from '$lib/optimizer/run-optimizer';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { doodledialStore as defaultDoodledialStore } from '$lib/stores/doodledial.svelte';
import { globalConfig as defaultGlobalConfig } from '$lib/stores/global-config.svelte';

const RANDOM_SEED_DEFAULT = '42';
const OVERLAY_HIDE_DELAY_MS = 1200;
const LIVE_TIMER_INTERVAL_MS = 100;

export type OptimizerMode = 'force-directed' | 'bruteforce';

export interface BruteforceRunSummary {
	stopReason: BruteforceOptimizerStopReason;
	feasibleSolutionsFound: number;
	combinationsSearched: number;
	totalCombinations: number;
	elapsedMs: number;
	layoutApplied: boolean;
}

export interface OptimizerGlobalConfigLike {
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
}

export interface DoodledialStoreLike {
	svgContent: SVGContent | null;
	config: DialConfig;
	layers: Layer[];
	groups: { id: string; color: string }[];
	applyLayerRotations(rotations: Record<string, number>): void;
	setOptimizerGapMm(gapMm: number): void;
}

export const optimizerTuningDefaults: Required<OptimizerTuning> = {
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

export function createOptimizerStore(options?: {
	globalConfig?: OptimizerGlobalConfigLike;
	doodledialStore?: DoodledialStoreLike;
}) {
	const globalConfig = options?.globalConfig ?? defaultGlobalConfig;
	const ddStore = options?.doodledialStore ?? defaultDoodledialStore;

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
	let optimizerRandomSeedInput = $state(RANDOM_SEED_DEFAULT);
	let optimizerMaxRuntimeSInput = $state(String(globalConfig.bruteforceTimeLimit));
	let optimizerMode = $state<OptimizerMode>('force-directed');
	let optimizerActiveMode = $state<OptimizerMode>('force-directed');
	let optimizerElapsedMs = $state(0);
	let optimizerMaxRuntimeMs = $state<number | null>(null);
	let bruteforceResultDialogOpen = $state(false);
	let bruteforceRunSummary = $state<BruteforceRunSummary | null>(null);
	let bruteforceExtendRuntimeSInput = $state('60');
	let bruteforceResumeContext = $state<BruteforceResumeContext | null>(null);
	let optimizerTopLayouts = $state<Record<string, number>[]>([]);
	let optimizerSvgTemplate = $state<OptimizerSvgTemplate | null>(null);
	let optimizerResultSelectedIndex = $state(0);
	let bruteforceUserStopped = $state(false);
	let optimizerTuning = $state({ ...optimizerTuningDefaults });

	const optimizerThumbnailSvgs = $derived.by(() => {
		const template = optimizerSvgTemplate;
		if (!template || optimizerTopLayouts.length === 0) return [];
		return optimizerTopLayouts.map((layout) =>
			fitSvg(combineOptimizerSvgTemplate(template, layout))
		);
	});

	function fitSvg(svg: string): string {
		return svg
			.replace(/^(<svg[^>]*?)\s+width="[^"]*"/, '$1')
			.replace(/^(<svg[^>]*?)\s+height="[^"]*"/, '$1')
			.replace(/^<svg/, '<svg style="width:100%;height:100%"');
	}

	function formatDurationMs(durationMs: number): string {
		return `${(durationMs / 1000).toFixed(1)}s`;
	}

	function formatProgressCountLabel(mode: OptimizerMode, total: number | string): string {
		if (mode === 'bruteforce') {
			return `Combinations ${optimizerIteration}/${total}`;
		}
		return `Iterations ${optimizerIteration}/${total}`;
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
		}, OVERLAY_HIDE_DELAY_MS);
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
		optimizerLiveTimer = setInterval(tick, LIVE_TIMER_INTERVAL_MS);
	}

	function resetOptimizerTuning() {
		optimizerTuning = { ...optimizerTuningDefaults };
		optimizerInitializeRandomly = false;
		optimizerRoundOutputAngles = true;
		optimizerGapMmInput = String(globalConfig.optimizerGapDefault);
		optimizerRandomSeedInput = RANDOM_SEED_DEFAULT;
		optimizerMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
	}

	function handleCloseBruteforceResultDialog() {
		bruteforceResultDialogOpen = false;
	}

	function handleContinueBruteforce() {
		bruteforceResultDialogOpen = false;
		optimizerMaxRuntimeSInput = bruteforceExtendRuntimeSInput;
		void handleRunOptimizer('bruteforce', bruteforceResumeContext);
	}

	function handleStopOptimizer() {
		if (optimizerActiveMode === 'bruteforce') {
			bruteforceUserStopped = true;
		}
		optimizerAbortController?.abort();
	}

	function handleOpenOptimizerDialog(mode: OptimizerMode) {
		if (!ddStore.svgContent || optimizerPending) {
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

	function handleApplyBruteforceLayout() {
		const selectedLayout = optimizerTopLayouts[optimizerResultSelectedIndex];
		if (selectedLayout) {
			ddStore.applyLayerRotations(selectedLayout);
		}
		bruteforceResultDialogOpen = false;
	}

	async function handleRunOptimizer(
		mode: OptimizerMode = optimizerMode,
		resumeContext: BruteforceResumeContext | null = null
	) {
		if (!ddStore.svgContent || optimizerPending) {
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
					: (ddStore.config.optimizerGapMm ?? globalConfig.optimizerGapDefault);
			ddStore.setOptimizerGapMm(gapMm);
			optimizerGapMmInput = String(gapMm);

			const visibleLayers = ddStore.layers.filter((l) => l.visible);
			const optimizerInput = {
				diameter: ddStore.config.diameter,
				config: ddStore.config,
				layers: visibleLayers,
				svgContent: ddStore.svgContent,
				groups: ddStore.groups,
				hiddenLayerIds: ddStore.layers.filter((l) => !l.visible).map((l) => l.id)
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
					optimizerApplied = false;
				}
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

				ddStore.applyLayerRotations(forceDirectedResult.layout);
				optimizerApplied = true;
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

	function reset() {
		optimizerPending = false;
		optimizerProgress = 0;
		optimizerProgressPhase = 'Idle';
		optimizerProgressMessage = '';
		optimizerIteration = 0;
		optimizerTotalIterations = 0;
		optimizerAbortController = null;
		optimizerOverlayVisible = false;
		clearOverlayHideTimer();
		clearOptimizerLiveTimer();
		optimizerRunDialogOpen = false;
		optimizerInitializeRandomly = false;
		optimizerRoundOutputAngles = true;
		optimizerGapMmInput = String(globalConfig.optimizerGapDefault);
		optimizerRandomSeedInput = RANDOM_SEED_DEFAULT;
		optimizerMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
		optimizerMode = 'force-directed';
		optimizerActiveMode = 'force-directed';
		optimizerElapsedMs = 0;
		optimizerMaxRuntimeMs = null;
		bruteforceResultDialogOpen = false;
		bruteforceRunSummary = null;
		bruteforceExtendRuntimeSInput = '60';
		bruteforceResumeContext = null;
		optimizerTopLayouts = [];
		optimizerSvgTemplate = null;
		optimizerResultSelectedIndex = 0;
		bruteforceUserStopped = false;
		optimizerTuning = { ...optimizerTuningDefaults };
	}

	return {
		get optimizerPending() {
			return optimizerPending;
		},
		get optimizerProgress() {
			return optimizerProgress;
		},
		get optimizerProgressPhase() {
			return optimizerProgressPhase;
		},
		get optimizerProgressMessage() {
			return optimizerProgressMessage;
		},
		get optimizerIteration() {
			return optimizerIteration;
		},
		get optimizerTotalIterations() {
			return optimizerTotalIterations;
		},
		get optimizerOverlayVisible() {
			return optimizerOverlayVisible;
		},
		get optimizerRunDialogOpen() {
			return optimizerRunDialogOpen;
		},
		get optimizerInitializeRandomly() {
			return optimizerInitializeRandomly;
		},
		set optimizerInitializeRandomly(v: boolean) {
			optimizerInitializeRandomly = v;
		},
		get optimizerRoundOutputAngles() {
			return optimizerRoundOutputAngles;
		},
		set optimizerRoundOutputAngles(v: boolean) {
			optimizerRoundOutputAngles = v;
		},
		get optimizerGapMmInput() {
			return optimizerGapMmInput;
		},
		set optimizerGapMmInput(v: string) {
			optimizerGapMmInput = v;
		},
		get optimizerRandomSeedInput() {
			return optimizerRandomSeedInput;
		},
		set optimizerRandomSeedInput(v: string) {
			optimizerRandomSeedInput = v;
		},
		get optimizerMaxRuntimeSInput() {
			return optimizerMaxRuntimeSInput;
		},
		set optimizerMaxRuntimeSInput(v: string) {
			optimizerMaxRuntimeSInput = v;
		},
		get optimizerMode() {
			return optimizerMode;
		},
		get optimizerActiveMode() {
			return optimizerActiveMode;
		},
		get optimizerElapsedMs() {
			return optimizerElapsedMs;
		},
		get optimizerMaxRuntimeMs() {
			return optimizerMaxRuntimeMs;
		},
		get bruteforceResultDialogOpen() {
			return bruteforceResultDialogOpen;
		},
		get bruteforceRunSummary() {
			return bruteforceRunSummary;
		},
		get bruteforceExtendRuntimeSInput() {
			return bruteforceExtendRuntimeSInput;
		},
		set bruteforceExtendRuntimeSInput(v: string) {
			bruteforceExtendRuntimeSInput = v;
		},
		get optimizerTopLayouts() {
			return optimizerTopLayouts;
		},
		get optimizerSvgTemplate() {
			return optimizerSvgTemplate;
		},
		get optimizerResultSelectedIndex() {
			return optimizerResultSelectedIndex;
		},
		set optimizerResultSelectedIndex(v: number) {
			optimizerResultSelectedIndex = v;
		},
		get optimizerTuning() {
			return optimizerTuning;
		},
		get optimizerThumbnailSvgs() {
			return optimizerThumbnailSvgs;
		},

		fitSvg,
		formatDurationMs,
		resetOptimizerTuning,
		handleCloseBruteforceResultDialog,
		handleContinueBruteforce,
		handleStopOptimizer,
		handleOpenOptimizerDialog,
		handleCloseOptimizerDialog,
		handleConfirmOptimizerDialogRun,
		handleApplyBruteforceLayout,
		handleRunOptimizer,
		reset
	};
}

export const optimizerStore = createOptimizerStore();
