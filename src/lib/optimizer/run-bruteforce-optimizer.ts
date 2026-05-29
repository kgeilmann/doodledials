import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineOptimizerSvgTemplate, createOptimizerSvgTemplate } from '$lib/utils/doodledial';
import { createOverlapDetectionCache, detectPairOverlapPixels } from '$lib/utils/overlap-detection';

export interface OptimizerInput {
	diameter: number;
	config: DialConfig;
	layers: Layer[];
	svgContent: SVGContent;
}

export interface OptimizerProgress {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
}

export interface OptimizerResult {
	layout: Record<string, number>;
	stopReason: BruteforceOptimizerStopReason;
	feasibleSolutionsFound: number;
}

export type BruteforceOptimizerStopReason =
	| 'exact_complete'
	| 'cancelled'
	| 'time_limit'
	| 'no_feasible_solution';

export interface BruteforceOptimizerSearchSnapshot {
	nodesVisited: number;
	depth: number;
	feasibleSolutionsFound: number;
	stopReason?: BruteforceOptimizerStopReason;
}

export interface BruteforceOptimizerOptions {
	signal?: AbortSignal;
	roundOutputAngles?: boolean;
	maxRuntimeMs?: number;
	anchorLayerId?: string;
	onSearchSnapshot?: (snapshot: BruteforceOptimizerSearchSnapshot) => void;
}

export class BruteforceOptimizerCancelledError extends Error {
	constructor(message = 'Bruteforce optimizer cancelled') {
		super(message);
		this.name = 'BruteforceOptimizerCancelledError';
	}
}

const MIN_OVERLAP_PIXELS = 2;

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function roundLayoutAngles(layout: Record<string, number>): Record<string, number> {
	return Object.fromEntries(
		Object.entries(layout).map(([layerId, angle]) => [
			layerId,
			Math.round(normalizeAngle(angle)) % 360
		])
	);
}

function throwIfCancelled(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new BruteforceOptimizerCancelledError();
	}
}

function serializeLayout(layout: Record<string, number>): string {
	return Object.entries(layout)
		.sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
		.map(([layerId, angle]) => `${layerId}:${normalizeAngle(angle)}`)
		.join('|');
}

function analyzeCircularGaps(layout: Record<string, number>): {
	minGap: number;
	variance: number;
	deviationSum: number;
} {
	const entries = Object.entries(layout)
		.map(([layerId, angle]) => ({
			layerId,
			angle: normalizeAngle(angle)
		}))
		.sort((left, right) => {
			if (left.angle === right.angle) {
				return left.layerId.localeCompare(right.layerId);
			}
			return left.angle - right.angle;
		});

	if (entries.length <= 1) {
		return { minGap: 360, variance: 0, deviationSum: 0 };
	}

	const gaps: number[] = [];
	for (let index = 0; index < entries.length; index++) {
		const current = entries[index];
		const next = entries[(index + 1) % entries.length];
		gaps.push(normalizeAngle(next.angle - current.angle));
	}

	const idealGap = 360 / entries.length;
	const minGap = Math.min(...gaps);
	const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
	const variance = gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length;
	const deviationSum = gaps.reduce((sum, gap) => sum + Math.abs(gap - idealGap), 0);

	return { minGap, variance, deviationSum };
}

export function calculateAssignedMinGapUpperBound(assignedAngles: number[]): number {
	if (assignedAngles.length <= 1) {
		return Number.POSITIVE_INFINITY;
	}

	const normalizedAngles = assignedAngles
		.map((angle) => normalizeAngle(angle))
		.sort((left, right) => left - right);

	let minimumGap = Number.POSITIVE_INFINITY;
	for (let index = 0; index < normalizedAngles.length; index++) {
		const currentAngle = normalizedAngles[index];
		const nextAngle = normalizedAngles[(index + 1) % normalizedAngles.length];
		const gap = normalizeAngle(nextAngle - currentAngle);
		minimumGap = Math.min(minimumGap, gap);
	}

	return minimumGap;
}

export function calculateTighterMinGapUpperBound(
	assignedAngles: number[],
	remainingLayerCount: number
): number {
	if (remainingLayerCount <= 0) {
		return calculateAssignedMinGapUpperBound(assignedAngles);
	}

	if (assignedAngles.length <= 1) {
		return Math.floor(360 / (remainingLayerCount + assignedAngles.length));
	}

	const normalizedAngles = assignedAngles
		.map((angle) => normalizeAngle(angle))
		.sort((left, right) => left - right);
	const gaps: number[] = [];
	for (let index = 0; index < normalizedAngles.length; index++) {
		const currentAngle = normalizedAngles[index];
		const nextAngle = normalizedAngles[(index + 1) % normalizedAngles.length];
		gaps.push(normalizeAngle(nextAngle - currentAngle));
	}

	const canPlaceAtMinGap = (targetGap: number): boolean => {
		if (targetGap <= 0) {
			return true;
		}

		let capacity = 0;
		for (const gap of gaps) {
			capacity += Math.max(0, Math.floor(gap / targetGap) - 1);
			if (capacity >= remainingLayerCount) {
				return true;
			}
		}

		return capacity >= remainingLayerCount;
	};

	let lower = 1;
	let upper = 360;
	let best = 0;
	while (lower <= upper) {
		const middle = Math.floor((lower + upper) / 2);
		if (canPlaceAtMinGap(middle)) {
			best = middle;
			lower = middle + 1;
		} else {
			upper = middle - 1;
		}
	}

	return best;
}

function isBetterLayout(
	candidate: Record<string, number>,
	incumbent: Record<string, number> | null
): boolean {
	if (!incumbent) {
		return true;
	}

	const candidateScore = analyzeCircularGaps(candidate);
	const incumbentScore = analyzeCircularGaps(incumbent);

	if (candidateScore.minGap !== incumbentScore.minGap) {
		return candidateScore.minGap > incumbentScore.minGap;
	}

	if (candidateScore.variance !== incumbentScore.variance) {
		return candidateScore.variance < incumbentScore.variance;
	}

	if (candidateScore.deviationSum !== incumbentScore.deviationSum) {
		return candidateScore.deviationSum < incumbentScore.deviationSum;
	}

	return serializeLayout(candidate) < serializeLayout(incumbent);
}

function computeTotalIterations(remainingLayerCount: number): number {
	if (remainingLayerCount <= 0) {
		return 1;
	}

	let permutationsAtDepth = 1;
	let total = 0;
	for (let depth = 1; depth <= remainingLayerCount; depth++) {
		permutationsAtDepth *= 360 - depth;
		total += permutationsAtDepth;
		if (!Number.isFinite(total) || total >= Number.MAX_SAFE_INTEGER) {
			return Number.MAX_SAFE_INTEGER;
		}
	}

	return Math.max(1, Math.floor(total));
}

function buildDefaultLayout(
	layers: Layer[],
	anchorLayerId: string | undefined,
	allLayerIds: string[]
): Record<string, number> {
	const byId = new Map(layers.map((layer) => [layer.id, layer]));
	const layout = Object.fromEntries(
		allLayerIds.map((layerId) => [layerId, normalizeAngle(byId.get(layerId)?.rotation ?? 0)])
	);

	if (anchorLayerId) {
		layout[anchorLayerId] = 0;
	}

	return layout;
}

function buildPairFeasibilityMemoKey(
	firstLayerId: string,
	firstAngle: number,
	secondLayerId: string,
	secondAngle: number
): string {
	const normalizedFirstAngle = normalizeAngle(firstAngle);
	const normalizedSecondAngle = normalizeAngle(secondAngle);
	if (firstLayerId < secondLayerId) {
		return `${firstLayerId}:${normalizedFirstAngle}|${secondLayerId}:${normalizedSecondAngle}`;
	}

	return `${secondLayerId}:${normalizedSecondAngle}|${firstLayerId}:${normalizedFirstAngle}`;
}

export async function runBruteforceOptimizer(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void,
	options?: BruteforceOptimizerOptions
): Promise<OptimizerResult> {
	const emitTerminalProgressAndSnapshot = (
		feasibleSolutionsFound: number,
		stopReason: BruteforceOptimizerStopReason
	): void => {
		onProgress?.({
			percent: 100,
			message: 'Combinations 0/0',
			iteration: 0,
			totalIterations: 0
		});
		options?.onSearchSnapshot?.({
			nodesVisited: 0,
			depth: 0,
			feasibleSolutionsFound,
			stopReason
		});
	};

	const startedAtMs = Date.now();
	console.log('[optimizer] Frontend brute-force optimizer called:', input);
	throwIfCancelled(options?.signal);

	const layerIds = input.layers.map((layer) => layer.id);
	if (layerIds.length === 0) {
		emitTerminalProgressAndSnapshot(1, 'exact_complete');
		return { layout: {}, stopReason: 'exact_complete', feasibleSolutionsFound: 1 };
	}

	if (layerIds.length > 360) {
		emitTerminalProgressAndSnapshot(0, 'no_feasible_solution');
		const fallbackLayout = buildDefaultLayout(input.layers, layerIds[0], layerIds);
		const fallback =
			(options?.roundOutputAngles ?? true) ? roundLayoutAngles(fallbackLayout) : fallbackLayout;
		return {
			layout: fallback,
			stopReason: 'no_feasible_solution',
			feasibleSolutionsFound: 0
		};
	}

	const maxRuntimeMs = options?.maxRuntimeMs;
	const shouldRoundOutputAngles = options?.roundOutputAngles ?? true;
	const requestedAnchorLayerId = options?.anchorLayerId;
	const anchorLayerId =
		(requestedAnchorLayerId && layerIds.includes(requestedAnchorLayerId)
			? requestedAnchorLayerId
			: layerIds[0]) ?? layerIds[0];
	const remainingLayerIds = layerIds.filter((layerId) => layerId !== anchorLayerId).sort();
	const totalIterations = computeTotalIterations(remainingLayerIds.length);

	const overlapCache = createOverlapDetectionCache();
	const optimizerSvgTemplate = createOptimizerSvgTemplate(
		input.svgContent,
		{
			...input.config,
			diameter: input.diameter
		},
		input.layers.map((layer) => layer.id)
	);
	const optimizerRotationsByLayerId = Object.fromEntries(
		input.layers.map((layer) => [layer.id, 0])
	) as Record<string, number>;
	const pairFeasibilityMemo = new Map<string, boolean>();
	const layerById = new Map(input.layers.map((layer) => [layer.id, layer]));
	const assigned = new Map<string, number>();
	const usedAngles = new Array<boolean>(360).fill(false);
	const domainByLayer = new Map<string, Uint8Array>();
	const domainCountByLayer = new Map<string, number>();
	assigned.set(anchorLayerId, 0);
	usedAngles[0] = true;

	let nodesVisited = 0;
	let feasibleSolutionsFound = 0;
	let bestLayout: Record<string, number> | null = null;
	let stopReason: BruteforceOptimizerStopReason | undefined;

	const isTimedOut = (): boolean => {
		if (typeof maxRuntimeMs !== 'number' || maxRuntimeMs < 0) {
			return false;
		}
		return Date.now() - startedAtMs >= maxRuntimeMs;
	};

	const reportProgress = (): void => {
		const percent =
			typeof maxRuntimeMs === 'number' && maxRuntimeMs > 0
				? Math.min(99, Math.round(((Date.now() - startedAtMs) / maxRuntimeMs) * 100))
				: Math.min(99, Math.round((nodesVisited / totalIterations) * 100));

		onProgress?.({
			percent,
			message: `Combinations ${nodesVisited}/${totalIterations}`,
			iteration: nodesVisited,
			totalIterations
		});
	};

	reportProgress();

	const isPairFeasible = async (
		firstLayerId: string,
		firstAngle: number,
		secondLayerId: string,
		secondAngle: number
	): Promise<boolean> => {
		const memoKey = buildPairFeasibilityMemoKey(
			firstLayerId,
			firstAngle,
			secondLayerId,
			secondAngle
		);
		const cached = pairFeasibilityMemo.get(memoKey);
		if (typeof cached === 'boolean') {
			return cached;
		}

		const firstLayer = layerById.get(firstLayerId);
		const secondLayer = layerById.get(secondLayerId);
		if (!firstLayer || !secondLayer) {
			pairFeasibilityMemo.set(memoKey, false);
			return false;
		}

		const pairLayers: [Layer, Layer] = [
			{
				...firstLayer,
				rotation: normalizeAngle(firstAngle)
			},
			{
				...secondLayer,
				rotation: normalizeAngle(secondAngle)
			}
		];

		optimizerRotationsByLayerId[firstLayerId] = pairLayers[0].rotation;
		optimizerRotationsByLayerId[secondLayerId] = pairLayers[1].rotation;
		const combinedSvg = combineOptimizerSvgTemplate(
			optimizerSvgTemplate,
			optimizerRotationsByLayerId
		);
		const overlapPixels = await detectPairOverlapPixels({
			firstLayer: pairLayers[0],
			secondLayer: pairLayers[1],
			combinedSvg,
			cache: overlapCache,
			pairCacheMode: 'relative'
		});

		const feasible = overlapPixels < MIN_OVERLAP_PIXELS;
		pairFeasibilityMemo.set(memoKey, feasible);
		return feasible;
	};

	const initializeDomains = async (): Promise<boolean> => {
		for (const layerId of remainingLayerIds) {
			const domain = new Uint8Array(360);
			let count = 0;
			for (let angle = 0; angle < 360; angle++) {
				if (usedAngles[angle]) {
					continue;
				}

				if (await isPairFeasible(layerId, angle, anchorLayerId, 0)) {
					domain[angle] = 1;
					count += 1;
				}
			}

			domainByLayer.set(layerId, domain);
			domainCountByLayer.set(layerId, count);
			if (count === 0) {
				return false;
			}
		}

		return true;
	};

	const selectLayerByMrv = (
		unassignedLayerIds: string[]
	): { layerId: string; feasibleAngles: number[] } | null => {
		let bestLayerId: string | null = null;
		let bestCount = Number.POSITIVE_INFINITY;

		for (const layerId of unassignedLayerIds) {
			const domainCount = domainCountByLayer.get(layerId) ?? 0;
			if (domainCount === 0) {
				return null;
			}

			if (
				domainCount < bestCount ||
				(domainCount === bestCount && (!bestLayerId || layerId < bestLayerId))
			) {
				bestLayerId = layerId;
				bestCount = domainCount;
			}
		}

		if (!bestLayerId) {
			return null;
		}

		const domain = domainByLayer.get(bestLayerId);
		if (!domain) {
			return null;
		}

		const feasibleAngles: number[] = [];
		for (let angle = 0; angle < 360; angle++) {
			if (domain[angle]) {
				feasibleAngles.push(angle);
			}
		}

		return {
			layerId: bestLayerId,
			feasibleAngles
		};
	};

	type DomainTrailEntry = { layerId: string; angle: number };

	const applyAssignmentConstraints = async (
		assignedLayerId: string,
		assignedAngle: number,
		affectedLayerIds: string[]
	): Promise<{ valid: boolean; trail: DomainTrailEntry[] }> => {
		const trail: DomainTrailEntry[] = [];

		for (const layerId of affectedLayerIds) {
			const domain = domainByLayer.get(layerId);
			if (!domain) {
				continue;
			}

			if (domain[assignedAngle]) {
				domain[assignedAngle] = 0;
				domainCountByLayer.set(layerId, (domainCountByLayer.get(layerId) ?? 0) - 1);
				trail.push({ layerId, angle: assignedAngle });
			}

			for (let angle = 0; angle < 360; angle++) {
				if (!domain[angle]) {
					continue;
				}

				if (!(await isPairFeasible(layerId, angle, assignedLayerId, assignedAngle))) {
					domain[angle] = 0;
					domainCountByLayer.set(layerId, (domainCountByLayer.get(layerId) ?? 0) - 1);
					trail.push({ layerId, angle });
				}
			}

			if ((domainCountByLayer.get(layerId) ?? 0) === 0) {
				return { valid: false, trail };
			}
		}

		return { valid: true, trail };
	};

	const rollbackDomainChanges = (trail: DomainTrailEntry[]): void => {
		for (let index = trail.length - 1; index >= 0; index--) {
			const { layerId, angle } = trail[index];
			const domain = domainByLayer.get(layerId);
			if (!domain || domain[angle]) {
				continue;
			}

			domain[angle] = 1;
			domainCountByLayer.set(layerId, (domainCountByLayer.get(layerId) ?? 0) + 1);
		}
	};

	const domainsInitialized = await initializeDomains();
	if (!domainsInitialized) {
		stopReason = 'no_feasible_solution';
	}

	const search = async (depth: number, unassignedLayerIds: string[]): Promise<void> => {
		throwIfCancelled(options?.signal);

		if (isTimedOut()) {
			stopReason = 'time_limit';
			return;
		}

		if (bestLayout) {
			const assignedMinGapUpperBound = calculateTighterMinGapUpperBound(
				[...assigned.values()],
				unassignedLayerIds.length
			);
			const incumbentMinGap = analyzeCircularGaps(bestLayout).minGap;
			if (assignedMinGapUpperBound < incumbentMinGap) {
				return;
			}
		}

		if (depth >= remainingLayerIds.length) {
			feasibleSolutionsFound += 1;
			const candidate = Object.fromEntries(
				layerIds.map((layerId) => [layerId, assigned.get(layerId) ?? 0])
			);
			if (isBetterLayout(candidate, bestLayout)) {
				bestLayout = candidate;
			}
			return;
		}

		const mrvSelection = selectLayerByMrv(unassignedLayerIds);
		if (!mrvSelection) {
			return;
		}

		const { layerId, feasibleAngles } = mrvSelection;
		const nextUnassignedLayerIds = unassignedLayerIds.filter(
			(unassignedLayerId) => unassignedLayerId !== layerId
		);

		for (const angle of feasibleAngles) {
			throwIfCancelled(options?.signal);
			nodesVisited += 1;
			reportProgress();

			assigned.set(layerId, angle);
			usedAngles[angle] = true;
			const { valid, trail } = await applyAssignmentConstraints(
				layerId,
				angle,
				nextUnassignedLayerIds
			);

			if (valid) {
				await search(depth + 1, nextUnassignedLayerIds);
			}

			rollbackDomainChanges(trail);
			usedAngles[angle] = false;

			assigned.delete(layerId);

			if (stopReason === 'time_limit') {
				return;
			}
		}
	};

	try {
		if (!stopReason) {
			await search(0, remainingLayerIds);
		}
	} catch (error) {
		if (error instanceof BruteforceOptimizerCancelledError) {
			stopReason = 'cancelled';
			options?.onSearchSnapshot?.({
				nodesVisited,
				depth: 0,
				feasibleSolutionsFound,
				stopReason
			});
			throw error;
		}
		throw error;
	}

	if (!stopReason) {
		stopReason = feasibleSolutionsFound > 0 ? 'exact_complete' : 'no_feasible_solution';
	}

	options?.onSearchSnapshot?.({
		nodesVisited,
		depth: remainingLayerIds.length,
		feasibleSolutionsFound,
		stopReason
	});

	console.log('[optimizer] Frontend brute-force optimizer stopped:', {
		reason: stopReason,
		nodesVisited,
		feasibleSolutionsFound,
		elapsedMs: Date.now() - startedAtMs
	});

	const selectedLayout = bestLayout ?? buildDefaultLayout(input.layers, anchorLayerId, layerIds);
	const layout = shouldRoundOutputAngles ? roundLayoutAngles(selectedLayout) : selectedLayout;

	return {
		layout,
		stopReason,
		feasibleSolutionsFound
	};
}
