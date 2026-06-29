import {
	BruteforceSolverCancelledError,
	runBruteforceSolver,
	type BruteforceSolverStopReason,
	type BruteforceResumeContext
} from '$lib/solver/run-bruteforce-solver';
import { combineSolverSvgTemplate, type SolverSvgTemplate } from '$lib/utils/doodledial';
import type { DialConfig, Layer, LayerGroup, SVGContent } from '$lib/types/doodledial';
import { doodledialStore as defaultDoodledialStore } from '$lib/stores/doodledial.svelte';
import { globalConfig as defaultGlobalConfig } from '$lib/stores/global-config.svelte';

const OVERLAY_HIDE_DELAY_MS = 1200;
const LIVE_TIMER_INTERVAL_MS = 100;

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
	groups: LayerGroup[];
	applyLayerRotations(rotations: Record<string, number>): void;
	setSolverGapMm(gapMm: number): void;
}

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
	let solverRoundOutputAngles = $state(true);
	let solverGapMmInput = $state(String(globalConfig.solverGapDefault));
	let solverMaxRuntimeSInput = $state(String(globalConfig.bruteforceTimeLimit));
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
	let solverMultiGroupQueue: string[] = $state([]);
	let solverMultiGroupStarted = $state(false);
	let solverCurrentGroupId = $state<string | null>(null);
	let solverMultiGroupCompletedIds: string[] = $state([]);

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

	function formatProgressCountLabel(total: number | string): string {
		return `Combinations ${solverIteration}/${total}`;
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

			if (typeof solverMaxRuntimeMs === 'number' && solverMaxRuntimeMs > 0) {
				const runtimePercent = Math.min(99, Math.round((elapsedMs / solverMaxRuntimeMs) * 100));
				solverProgress = Math.max(solverProgress, runtimePercent);
			}
		};

		tick();
		solverLiveTimer = setInterval(tick, LIVE_TIMER_INTERVAL_MS);
	}

	function resetSolverTuning() {
		solverRoundOutputAngles = true;
		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
	}

	function handleCloseBruteforceResultDialog() {
		bruteforceResultDialogOpen = false;
		if (solverMultiGroupQueue.length > 0) {
			solverMultiGroupCompletedIds = [...solverMultiGroupCompletedIds, solverCurrentGroupId!];
			solverOverlayVisible = true;
			void handleRunSolver();
		}
	}

	function handleContinueBruteforce() {
		bruteforceResultDialogOpen = false;
		solverMaxRuntimeSInput = bruteforceExtendRuntimeSInput;
		void handleRunSolver(bruteforceResumeContext);
	}

	function handleStopSolver() {
		bruteforceUserStopped = true;
		solverAbortController?.abort();
	}

	function handleOpenSolverDialog() {
		if (!ddStore.svgContent || solverPending) {
			return;
		}

		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
		// Pre-populate from groups that have at least one visible layer
		const visibleGroupIds = ddStore.groups
			.filter((g) => ddStore.layers.some((l) => l.groupId === g.id && l.visible))
			.map((g) => g.id);
		solverSelectedGroupIds = visibleGroupIds;
		solverMultiGroupStarted = false;
		solverRunDialogOpen = true;
	}

	function handleCloseSolverDialog() {
		solverRunDialogOpen = false;
	}

	async function handleConfirmSolverDialogRun() {
		solverRunDialogOpen = false;
		bruteforceResumeContext = null;
		solverMultiGroupCompletedIds = [];
		solverCurrentGroupId = null;
		await handleRunSolver();
	}

	function handleApplyBruteforceLayout() {
		const selectedLayout = solverTopLayouts[solverResultSelectedIndex];
		if (selectedLayout) {
			ddStore.applyLayerRotations(selectedLayout);
		}
		bruteforceResultDialogOpen = false;

		// If more groups to solve, start next one
		if (solverMultiGroupQueue.length > 0) {
			solverProgressMessage = `Solving next group...`;
			solverMultiGroupCompletedIds = [...solverMultiGroupCompletedIds, solverCurrentGroupId!];
			solverOverlayVisible = true;
			void handleRunSolver();
		}
	}

	async function handleRunSolver(resumeContext: BruteforceResumeContext | null = null) {
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
		solverOverlayVisible = true;
		solverTopLayouts = [];
		solverSvgTemplate = null;
		bruteforceUserStopped = false;
		clearOverlayHideTimer();
		clearSolverLiveTimer();
		solverAbortController = new AbortController();
		const runStartedAtMs = Date.now();

		let solverApplied = false;
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

			const allVisibleLayers = ddStore.layers.filter((l) => l.visible);
			const allHiddenLayerIds = ddStore.layers.filter((l) => !l.visible).map((l) => l.id);

			// Determine which groups to solve
			const groupsToSolve =
				solverSelectedGroupIds.length > 0
					? solverSelectedGroupIds
					: ddStore.groups
							.filter((g) => ddStore.layers.some((l) => l.groupId === g.id && l.visible))
							.map((g) => g.id);

			// Helper to build solver input for a specific group (or all groups together)
			function buildSolverInputForGroups(groupIds: string[]) {
				const layers =
					groupIds.length > 0
						? allVisibleLayers.filter((l) => groupIds.includes(l.groupId))
						: allVisibleLayers;
				const hiddenLayerIds = [
					...allVisibleLayers.filter((l) => !groupIds.includes(l.groupId)).map((l) => l.id),
					...allHiddenLayerIds
				];
				return {
					diameter: ddStore.config.diameter,
					config: ddStore.config,
					layers,
					svgContent: ddStore.svgContent!,
					groups: ddStore.groups,
					hiddenLayerIds
				};
			}
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

			// Determine which group to solve this run
			const targetGroupId =
				solverMultiGroupQueue.length > 0 ? solverMultiGroupQueue[0] : groupsToSolve[0];
			if (solverMultiGroupQueue.length > 0) {
				solverMultiGroupQueue = solverMultiGroupQueue.slice(1);
			}

			// Initialize queue for remaining groups on first call only
			if (!solverMultiGroupStarted && groupsToSolve.length > 1) {
				solverMultiGroupQueue = groupsToSolve.slice(1);
				solverMultiGroupStarted = true;
			}

			solverCurrentGroupId = targetGroupId;

			solverMaxRuntimeMs = typeof maxRuntimeMs === 'number' ? maxRuntimeMs : null;
			startSolverLiveTimer(runStartedAtMs);

			const singleGroupInput = buildSolverInputForGroups([targetGroupId]);

			const bruteForceResult = await runBruteforceSolver(singleGroupInput, progressHandler, {
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
		} catch (error) {
			if (error instanceof BruteforceSolverCancelledError) {
				bruteforceRunStopReason = 'stopped';
				bruteforceRunFeasibleCount = Math.max(bruteforceRunFeasibleCount, solverTopLayouts.length);
				solverProgressPhase = 'Stopped';
				solverProgressMessage = `${formatProgressCountLabel(solverTotalIterations || '?')} - optimisation stopped.`;
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
					? `${formatProgressCountLabel(solverTotalIterations || solverIteration)} - time limit reached, best feasible layout applied.`
					: `${formatProgressCountLabel(solverTotalIterations || solverIteration)} - layout applied.`;
			}

			if (solverNoFeasible) {
				solverProgress = 100;
				solverProgressPhase = 'No Feasible Layout';
				solverProgressMessage = `${formatProgressCountLabel(solverTotalIterations || solverIteration || '?')} - no feasible non-overlapping layout found.`;
			}

			solverPending = false;
			solverAbortController = null;
			scheduleOverlayHide();
			if (bruteforceRunStopReason !== null) {
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
		solverRoundOutputAngles = true;
		solverGapMmInput = String(globalConfig.solverGapDefault);
		solverMaxRuntimeSInput = String(globalConfig.bruteforceTimeLimit);
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
		solverMultiGroupQueue = [];
		solverMultiGroupStarted = false;
		solverCurrentGroupId = null;
		solverMultiGroupCompletedIds = [];
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
		get solverMaxRuntimeSInput() {
			return solverMaxRuntimeSInput;
		},
		set solverMaxRuntimeSInput(v: string) {
			solverMaxRuntimeSInput = v;
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
		get solverSelectedGroupIds() {
			return solverSelectedGroupIds;
		},
		set solverSelectedGroupIds(v: string[]) {
			solverSelectedGroupIds = v;
		},
		get solverMultiGroupQueue() {
			return solverMultiGroupQueue;
		},
		get solverCurrentGroupId() {
			return solverCurrentGroupId;
		},
		get solverMultiGroupCompletedIds() {
			return solverMultiGroupCompletedIds;
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
