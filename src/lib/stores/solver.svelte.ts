import {
	BruteforceSolverCancelledError,
	runBruteforceSolver,
	type BruteforceSolverStopReason,
	type BruteforceResumeContext
} from '$lib/solver/run-bruteforce-solver';
import { combineSolverSvgTemplate, type SolverSvgTemplate } from '$lib/utils/doodledial';
import { SolverCancelledError, runSolver, type SolverTuning } from '$lib/solver/run-solver';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { doodledialStore as defaultDoodledialStore } from '$lib/stores/doodledial.svelte';
import { globalConfig as defaultGlobalConfig } from '$lib/stores/global-config.svelte';

const RANDOM_SEED_DEFAULT = '42';
const OVERLAY_HIDE_DELAY_MS = 1200;
const LIVE_TIMER_INTERVAL_MS = 100;

export type SolverMode = 'force-directed' | 'bruteforce';

export interface BruteforceRunSummary {
	stopReason: BruteforceSolverStopReason;
	feasibleSolutionsFound: number;
	combinationsSearched: number;
	totalCombinations: number;
	elapsedMs: number;
	layoutApplied: boolean;
}

export interface SolverGlobalConfigLike {
	solverGapDefault: number;
	bruteforceTimeLimit: number;
}

export interface DoodledialStoreLike {
	svgContent: SVGContent | null;
	config: DialConfig;
	layers: Layer[];
	groups: { id: string; color: string }[];
	applyLayerRotations(rotations: Record<string, number>): void;
	setSolverGapMm(gapMm: number): void;
}

export const solverTuningDefaults: Required<SolverTuning> = {
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

export function createSolverStore(options?: {
	globalConfig?: SolverGlobalConfigLike;
	doodledialStore?: DoodledialStoreLike;
}) {
	const globalConfig = options?.globalConfig ?? defaultGlobalConfig;
	const ddStore = options?.doodledialStore ?? defaultDoodledialStore;

	let solverPending = $state(false);
	let solverProgress = $state(0);
	let solverProgressPhase = $state('Idle');
	let solverProgressMessage = $state('');
	let solverIteration = $state(0);
	let solverTotalIterations = $state(0);
	let solverAbortController = $state<AbortController | null>(null);
	let solverOverlayVisible = $state(false);
	let overlayHideTimer: ReturnType<typeof setTimeout> | null = null;
	let solverLiveTimer: ReturnType<typeof setInterval> | null = null;
	let solverRunDialogOpen = $state(false);
	let solverInitializeRandomly = $state(false);
	let solverRoundOutputAngles = $state(true);
	let solverGapMmInput = $state(String(globalConfig.solverGapDefault));
	let solverRandomSeedInput = $state(RANDOM_SEED_DEFAULT);
	let solverMaxRuntimeSInput = $state(String(globalConfig.bruteforceTimeLimit));
	let solverMode = $state<SolverMode>('force-directed');
	let solverActiveMode = $state<SolverMode>('force-directed');
	let solverElapsedMs = $state(0);
	let solverMaxRuntimeMs = $state<number | null>(null);
	let bruteforceResultDialogOpen = $state(false);
	let bruteforceRunSummary = $state<BruteforceRunSummary | null>(null);
	let bruteforceExtendRuntimeSInput = $state('60');
	let bruteforceResumeContext = $state<BruteforceResumeContext | null>(null);
	let solverTopLayouts = $state<Record<string, number>[]>([]);
	let solverSvgTemplate = $state<SolverSvgTemplate | null>(null);
	let solverResultSelectedIndex = $state(0);
	let bruteforceUserStopped = $state(false);
	let solverSelectedGroupIds: string[] = $state([]);
	let solverTuning = $state({ ...solverTuningDefaults });

	const solverThumbnailSvgs = $derived.by(() => {
		const template = solverSvgTemplate;
		if (!template || solverTopLayouts.length === 0) return [];
		return solverTopLayouts.map((layout) => fitSvg(combineSolverSvgTemplate(template, layout)));
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

	function formatProgressCountLabel(mode: SolverMode, total: number | string): string {
		if (mode === 'bruteforce') {
			return `Combinations ${solverIteration}/${total}`;
		}
		return `Iterations ${solverIteration}/${total}`;
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
			solverOverlayVisible = false;
			overlayHideTimer = null;
		}, OVERLAY_HIDE_DELAY_MS);
	}

	function clearSolverLiveTimer() {
		if (solverLiveTimer) {
			clearInterval(solverLiveTimer);
			solverLiveTimer = null;
		}
	}

	function startSolverLiveTimer(runStartedAtMs: number) {
		clearSolverLiveTimer();

		const tick = () => {
			if (!solverPending) {
				clearSolverLiveTimer();
				return;
			}

			const elapsedMs = Date.now() - runStartedAtMs;
			solverElapsedMs = elapsedMs;

			if (
				solverActiveMode === 'bruteforce' &&
				typeof solverMaxRuntimeMs === 'number' &&
				solverMaxRuntimeMs > 0
			) {
				const runtimePercent = Math.min(99, Math.round((elapsedMs / solverMaxRuntimeMs) * 100));
				solverProgress = Math.max(solverProgress, runtimePercent);
			}
		};

		tick();
		solverLiveTimer = setInterval(tick, LIVE_TIMER_INTERVAL_MS);
	}

	function resetSolverTuning() {
		solverTuning = { ...solverTuningDefaults };
		solverInitializeRandomly = false;
		solverRoundOutputAngles = true;
		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverRandomSeedInput = RANDOM_SEED_DEFAULT;
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
	}

	function handleCloseBruteforceResultDialog() {
		bruteforceResultDialogOpen = false;
	}

	function handleContinueBruteforce() {
		bruteforceResultDialogOpen = false;
		solverMaxRuntimeSInput = bruteforceExtendRuntimeSInput;
		void handleRunSolver('bruteforce', bruteforceResumeContext);
	}

	function handleStopSolver() {
		if (solverActiveMode === 'bruteforce') {
			bruteforceUserStopped = true;
		}
		solverAbortController?.abort();
	}

	function handleOpenSolverDialog(mode: SolverMode) {
		if (!ddStore.svgContent || solverPending) {
			return;
		}

		solverMode = mode;
		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
		// Pre-populate from groups that have at least one visible layer
		const visibleGroupIds = ddStore.groups
			.filter((g) => ddStore.layers.some((l) => l.groupId === g.id && l.visible))
			.map((g) => g.id);
		solverSelectedGroupIds = visibleGroupIds;
		solverRunDialogOpen = true;
	}

	function handleCloseSolverDialog() {
		solverRunDialogOpen = false;
	}

	async function handleConfirmSolverDialogRun() {
		solverRunDialogOpen = false;
		bruteforceResumeContext = null;
		await handleRunSolver(solverMode);
	}

	function handleApplyBruteforceLayout() {
		const selectedLayout = solverTopLayouts[solverResultSelectedIndex];
		if (selectedLayout) {
			ddStore.applyLayerRotations(selectedLayout);
		}
		bruteforceResultDialogOpen = false;
	}

	async function handleRunSolver(
		mode: SolverMode = solverMode,
		resumeContext: BruteforceResumeContext | null = null
	) {
		if (!ddStore.svgContent || solverPending) {
			return;
		}

		solverPending = true;
		solverProgress = 0;
		solverProgressPhase = 'Starting';
		solverProgressMessage = 'Preparing solver input...';
		solverIteration = 0;
		solverTotalIterations = 0;
		solverElapsedMs = 0;
		solverMaxRuntimeMs = null;
		solverActiveMode = mode;
		solverOverlayVisible = true;
		solverTopLayouts = [];
		solverSvgTemplate = null;
		bruteforceUserStopped = false;
		clearOverlayHideTimer();
		clearSolverLiveTimer();
		solverAbortController = new AbortController();
		const runStartedAtMs = Date.now();

		let solverApplied = false;
		let solverCancelled = false;
		let solverTimeLimited = false;
		let solverNoFeasible = false;
		let bruteforceRunStopReason: BruteforceSolverStopReason | null = null;
		let bruteforceRunFeasibleCount = 0;

		try {
			const parsedGapMm = Number(solverGapMmInput);
			const gapMm =
				Number.isFinite(parsedGapMm) && parsedGapMm > 0
					? parsedGapMm
					: (ddStore.config.solverGapMm ?? globalConfig.solverGapDefault);
			ddStore.setSolverGapMm(gapMm);
			solverGapMmInput = String(gapMm);

			const visibleLayers = ddStore.layers.filter((l) => l.visible);
			const solverInput = {
				diameter: ddStore.config.diameter,
				config: ddStore.config,
				layers: visibleLayers,
				svgContent: ddStore.svgContent,
				groups: ddStore.groups,
				hiddenLayerIds: ddStore.layers.filter((l) => !l.visible).map((l) => l.id)
			};
			const parsedSeed = Number(solverRandomSeedInput);
			const randomSeed = Number.isFinite(parsedSeed) ? parsedSeed : undefined;
			const parsedMaxRuntimeS = Math.round(Number(solverMaxRuntimeSInput));
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
				solverSvgTemplate?: SolverSvgTemplate;
			}) => {
				solverProgressPhase = 'Optimizing';
				solverProgress = Math.max(solverProgress, progress.percent);
				solverProgressMessage = progress.message;
				solverIteration = progress.iteration;
				solverTotalIterations = progress.totalIterations;
				solverElapsedMs = Date.now() - runStartedAtMs;
				if (progress.topLayouts) {
					solverTopLayouts = progress.topLayouts;
				}
				if (progress.solverSvgTemplate) {
					solverSvgTemplate = progress.solverSvgTemplate;
				}
				if (typeof progress.feasibleSolutionsFound === 'number') {
					bruteforceRunFeasibleCount = progress.feasibleSolutionsFound;
				}
			};

			if (mode === 'bruteforce') {
				solverMaxRuntimeMs = typeof maxRuntimeMs === 'number' ? maxRuntimeMs : null;
				startSolverLiveTimer(runStartedAtMs);
				const bruteForceResult = await runBruteforceSolver(solverInput, progressHandler, {
					signal: solverAbortController.signal,
					roundOutputAngles: solverRoundOutputAngles,
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
				solverTimeLimited = bruteForceResult.stopReason === 'time_limit';
				solverNoFeasible = bruteForceResult.stopReason === 'no_feasible_solution';
				if (bruteForceResult.feasibleSolutionsFound > 0) {
					solverApplied = false;
				}
			} else {
				startSolverLiveTimer(runStartedAtMs);
				const forceDirectedResult = await runSolver(solverInput, progressHandler, {
					signal: solverAbortController.signal,
					initializeRandomly: solverInitializeRandomly,
					randomSeed: solverInitializeRandomly ? randomSeed : undefined,
					roundOutputAngles: solverRoundOutputAngles,
					tuning: {
						overlapMagnitudeWeight: solverTuning.overlapMagnitudeWeight,
						overlapMagnitudePower: solverTuning.overlapMagnitudePower,
						maxOverlapForceMagnitude: solverTuning.maxOverlapForceMagnitude,
						timeStepDt: solverTuning.timeStepDt,
						restoringForceWeight: solverTuning.restoringForceWeight,
						maxRestoringForce: solverTuning.maxRestoringForce,
						uniqueForceWeight: solverTuning.uniqueForceWeight,
						minUniqueAngleSeparation: solverTuning.minUniqueAngleSeparation,
						maxUniqueForce: solverTuning.maxUniqueForce
					}
				});

				ddStore.applyLayerRotations(forceDirectedResult.layout);
				solverApplied = true;
			}
		} catch (error) {
			if (
				error instanceof SolverCancelledError ||
				error instanceof BruteforceSolverCancelledError
			) {
				if (solverActiveMode === 'bruteforce') {
					bruteforceRunStopReason = 'stopped';
					bruteforceRunFeasibleCount = Math.max(
						bruteforceRunFeasibleCount,
						solverTopLayouts.length
					);
					solverProgressPhase = 'Stopped';
					solverProgressMessage = `${formatProgressCountLabel(solverActiveMode, solverTotalIterations || '?')} - optimisation stopped.`;
				} else {
					solverCancelled = true;
					solverProgressPhase = 'Cancelled';
					solverProgressMessage = `${formatProgressCountLabel(solverActiveMode, solverTotalIterations || '?')} - optimisation cancelled.`;
				}
			} else {
				solverProgressPhase = 'Error';
				solverProgressMessage = 'Optimization failed. Please try again.';
				console.error('[solver] Frontend solver call failed:', error);
			}
		} finally {
			clearSolverLiveTimer();
			solverElapsedMs = Date.now() - runStartedAtMs;

			if (solverApplied) {
				solverProgress = 100;
				solverProgressPhase = solverTimeLimited ? 'Time Limit' : 'Complete';
				solverProgressMessage = solverTimeLimited
					? `${formatProgressCountLabel(solverActiveMode, solverTotalIterations || solverIteration)} - time limit reached, best feasible layout applied.`
					: `${formatProgressCountLabel(solverActiveMode, solverTotalIterations || solverIteration)} - layout applied.`;
			}

			if (solverNoFeasible) {
				solverProgress = 100;
				solverProgressPhase = 'No Feasible Layout';
				solverProgressMessage = `${formatProgressCountLabel(solverActiveMode, solverTotalIterations || solverIteration || '?')} - no feasible non-overlapping layout found.`;
			}

			if (solverCancelled && solverProgress === 0) {
				solverProgressMessage = 'Optimization cancelled.';
			}

			solverPending = false;
			solverAbortController = null;
			scheduleOverlayHide();
			if (mode === 'bruteforce' && bruteforceRunStopReason !== null) {
				bruteforceRunSummary = {
					stopReason: bruteforceRunStopReason,
					feasibleSolutionsFound: bruteforceRunFeasibleCount,
					combinationsSearched: solverIteration,
					totalCombinations: solverTotalIterations,
					elapsedMs: solverElapsedMs,
					layoutApplied: solverApplied
				};
				if (bruteforceUserStopped) {
					const remainingMs = Math.max(0, (solverMaxRuntimeMs ?? 0) - solverElapsedMs);
					bruteforceExtendRuntimeSInput = String(Math.round(remainingMs / 1000));
				} else {
					bruteforceExtendRuntimeSInput = solverMaxRuntimeSInput;
				}
				bruteforceResultDialogOpen = true;
			}
		}
	}

	function reset() {
		solverPending = false;
		solverProgress = 0;
		solverProgressPhase = 'Idle';
		solverProgressMessage = '';
		solverIteration = 0;
		solverTotalIterations = 0;
		solverAbortController = null;
		solverOverlayVisible = false;
		clearOverlayHideTimer();
		clearSolverLiveTimer();
		solverRunDialogOpen = false;
		solverInitializeRandomly = false;
		solverRoundOutputAngles = true;
		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverRandomSeedInput = RANDOM_SEED_DEFAULT;
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
		solverMode = 'force-directed';
		solverActiveMode = 'force-directed';
		solverElapsedMs = 0;
		solverMaxRuntimeMs = null;
		bruteforceResultDialogOpen = false;
		bruteforceRunSummary = null;
		bruteforceExtendRuntimeSInput = '60';
		bruteforceResumeContext = null;
		solverTopLayouts = [];
		solverSvgTemplate = null;
		solverResultSelectedIndex = 0;
		bruteforceUserStopped = false;
		solverSelectedGroupIds = [];
		solverTuning = { ...solverTuningDefaults };
	}

	return {
		get solverPending() {
			return solverPending;
		},
		get solverProgress() {
			return solverProgress;
		},
		get solverProgressPhase() {
			return solverProgressPhase;
		},
		get solverProgressMessage() {
			return solverProgressMessage;
		},
		get solverIteration() {
			return solverIteration;
		},
		get solverTotalIterations() {
			return solverTotalIterations;
		},
		get solverOverlayVisible() {
			return solverOverlayVisible;
		},
		get solverRunDialogOpen() {
			return solverRunDialogOpen;
		},
		get solverInitializeRandomly() {
			return solverInitializeRandomly;
		},
		set solverInitializeRandomly(v: boolean) {
			solverInitializeRandomly = v;
		},
		get solverRoundOutputAngles() {
			return solverRoundOutputAngles;
		},
		set solverRoundOutputAngles(v: boolean) {
			solverRoundOutputAngles = v;
		},
		get solverGapMmInput() {
			return solverGapMmInput;
		},
		set solverGapMmInput(v: string) {
			solverGapMmInput = v;
		},
		get solverRandomSeedInput() {
			return solverRandomSeedInput;
		},
		set solverRandomSeedInput(v: string) {
			solverRandomSeedInput = v;
		},
		get solverMaxRuntimeSInput() {
			return solverMaxRuntimeSInput;
		},
		set solverMaxRuntimeSInput(v: string) {
			solverMaxRuntimeSInput = v;
		},
		get solverMode() {
			return solverMode;
		},
		get solverActiveMode() {
			return solverActiveMode;
		},
		get solverElapsedMs() {
			return solverElapsedMs;
		},
		get solverMaxRuntimeMs() {
			return solverMaxRuntimeMs;
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
		get solverTopLayouts() {
			return solverTopLayouts;
		},
		get solverSvgTemplate() {
			return solverSvgTemplate;
		},
		get solverResultSelectedIndex() {
			return solverResultSelectedIndex;
		},
		set solverResultSelectedIndex(v: number) {
			solverResultSelectedIndex = v;
		},
		get solverTuning() {
			return solverTuning;
		},
		get solverSelectedGroupIds() {
			return solverSelectedGroupIds;
		},
		set solverSelectedGroupIds(v: string[]) {
			solverSelectedGroupIds = v;
		},
		get solverThumbnailSvgs() {
			return solverThumbnailSvgs;
		},

		fitSvg,
		formatDurationMs,
		resetSolverTuning,
		handleCloseBruteforceResultDialog,
		handleContinueBruteforce,
		handleStopSolver,
		handleOpenSolverDialog,
		handleCloseSolverDialog,
		handleConfirmSolverDialogRun,
		handleApplyBruteforceLayout,
		handleRunSolver,
		reset
	};
}

export const solverStore = createSolverStore();
