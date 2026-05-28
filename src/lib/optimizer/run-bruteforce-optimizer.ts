import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from '$lib/utils/doodledial';
import {
	createOverlapDetectionCache,
	detectOverlaps,
	type PairOverlapCacheMode
} from '$lib/utils/overlap-detection';

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
	overlapPairCacheMode?: PairOverlapCacheMode;
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

export async function runBruteforceOptimizer(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void,
	options?: BruteforceOptimizerOptions
): Promise<OptimizerResult> {
	const startedAtMs = Date.now();
	console.log('[optimizer] Frontend brute-force optimizer called:', input);
	throwIfCancelled(options?.signal);

	const layerIds = input.layers.map((layer) => layer.id);
	if (layerIds.length === 0) {
		onProgress?.({
			percent: 100,
			message: 'Iterations 0/0',
			iteration: 0,
			totalIterations: 0
		});
		options?.onSearchSnapshot?.({
			nodesVisited: 0,
			depth: 0,
			feasibleSolutionsFound: 1,
			stopReason: 'exact_complete'
		});
		return { layout: {}, stopReason: 'exact_complete', feasibleSolutionsFound: 1 };
	}

	if (layerIds.length > 360) {
		onProgress?.({
			percent: 100,
			message: 'Iterations 0/0',
			iteration: 0,
			totalIterations: 0
		});
		options?.onSearchSnapshot?.({
			nodesVisited: 0,
			depth: 0,
			feasibleSolutionsFound: 0,
			stopReason: 'no_feasible_solution'
		});
		const fallbackLayout = buildDefaultLayout(input.layers, layerIds[0], layerIds);
		const fallback =
			(options?.roundOutputAngles ?? true) ? roundLayoutAngles(fallbackLayout) : fallbackLayout;
		return {
			layout: fallback,
			stopReason: 'no_feasible_solution',
			feasibleSolutionsFound: 0
		};
	}

	const overlapPairCacheMode = options?.overlapPairCacheMode ?? 'absolute';
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
	const layerById = new Map(input.layers.map((layer) => [layer.id, layer]));
	const assigned = new Map<string, number>();
	const usedAngles = new Array<boolean>(360).fill(false);
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
			message: `Iterations ${nodesVisited}/${totalIterations}`,
			iteration: nodesVisited,
			totalIterations
		});
	};

	const isPairFeasible = async (
		firstLayerId: string,
		firstAngle: number,
		secondLayerId: string,
		secondAngle: number
	): Promise<boolean> => {
		const firstLayer = layerById.get(firstLayerId);
		const secondLayer = layerById.get(secondLayerId);
		if (!firstLayer || !secondLayer) {
			return false;
		}

		const pairLayers: Layer[] = [
			{
				...firstLayer,
				rotation: normalizeAngle(firstAngle)
			},
			{
				...secondLayer,
				rotation: normalizeAngle(secondAngle)
			}
		];

		const combinedSvg = combineDoodledial(
			input.svgContent,
			{ ...input.config, diameter: input.diameter },
			pairLayers
		);

		const overlaps = await detectOverlaps(pairLayers, combinedSvg, {
			cache: overlapCache,
			pairCacheMode: overlapPairCacheMode
		});

		return (overlaps.get(firstLayerId)?.get(secondLayerId) ?? 0) < MIN_OVERLAP_PIXELS;
	};

	const search = async (depth: number): Promise<void> => {
		throwIfCancelled(options?.signal);

		if (isTimedOut()) {
			stopReason = 'time_limit';
			return;
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

		const layerId = remainingLayerIds[depth];

		for (let angle = 0; angle < 360; angle++) {
			if (usedAngles[angle]) {
				continue;
			}

			throwIfCancelled(options?.signal);
			nodesVisited += 1;
			reportProgress();

			assigned.set(layerId, angle);
			let pairwiseValid = true;

			for (const [otherLayerId, otherAngle] of assigned.entries()) {
				if (otherLayerId === layerId) {
					continue;
				}

				if (!(await isPairFeasible(layerId, angle, otherLayerId, otherAngle))) {
					pairwiseValid = false;
					break;
				}
			}

			if (pairwiseValid) {
				usedAngles[angle] = true;
				await search(depth + 1);
				usedAngles[angle] = false;
			}

			assigned.delete(layerId);

			if (stopReason === 'time_limit') {
				return;
			}
		}
	};

	try {
		await search(0);
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
