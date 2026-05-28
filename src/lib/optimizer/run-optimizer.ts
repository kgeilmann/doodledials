import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { combineDoodledial } from '$lib/utils/doodledial';
import { detectOverlaps } from '$lib/utils/overlap-detection';

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
}

export interface OptimizerOptions {
	signal?: AbortSignal;
}

export class OptimizerCancelledError extends Error {
	constructor(message = 'Optimizer cancelled') {
		super(message);
		this.name = 'OptimizerCancelledError';
	}
}

type OptimizerStopReason = 'convergence' | 'max_iteration_count';

const CONVERGENCE_THRESHOLD = 0.001;
const MAX_ITERATIONS = 500;
const MIN_OVERLAP_PIXELS = 2;
const OVERLAP_TEST_STEP = 1;
const OVERLAP_DIRECTION_SEARCH_STEPS = [1, 2, 4, 8];
const TIME_STEP_DT = 0.5;
const RESTORING_FORCE_WEIGHT = 0.02;
const MAX_RESTORING_FORCE = 2;
const UNIQUE_FORCE_WEIGHT = 0.02;
const MIN_UNIQUE_ANGLE_SEPARATION = 5;
const MAX_UNIQUE_FORCE = 2;

export interface CircularGap {
	fromLayerId: string;
	toLayerId: string;
	gap: number;
}

export interface CircularGapAnalysis {
	orderedLayerIds: string[];
	idealGap: number;
	gaps: CircularGap[];
}

export type LayerForceMap = Record<string, number>;

function createZeroForceMap(layerIds: string[]): LayerForceMap {
	return Object.fromEntries(layerIds.map((layerId) => [layerId, 0]));
}

function sumForceMap(forces: LayerForceMap, layerIds: string[]): number {
	return layerIds.reduce((sum, layerId) => sum + (forces[layerId] ?? 0), 0);
}

function shortestSignedAngleDifference(fromAngle: number, toAngle: number): number {
	let difference = normalizeAngle(toAngle - fromAngle);
	if (difference > 180) {
		difference -= 360;
	}
	return difference;
}

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function getIterationCount(layerCount: number): number {
	return Math.min(MAX_ITERATIONS, Math.max(12, layerCount * 6));
}

export function analyzeCircularGaps(
	state: Record<string, number>,
	layerIds: string[]
): CircularGapAnalysis {
	if (layerIds.length === 0) {
		return {
			orderedLayerIds: [],
			idealGap: 0,
			gaps: []
		};
	}

	if (layerIds.length === 1) {
		const [layerId] = layerIds;
		return {
			orderedLayerIds: [layerId],
			idealGap: 360,
			gaps: [
				{
					fromLayerId: layerId,
					toLayerId: layerId,
					gap: 360
				}
			]
		};
	}

	const ordered = layerIds
		.map((layerId) => ({
			layerId,
			angle: normalizeAngle(state[layerId] ?? 0)
		}))
		.sort((a, b) => {
			if (a.angle === b.angle) {
				return a.layerId.localeCompare(b.layerId);
			}
			return a.angle - b.angle;
		});

	const gaps: CircularGap[] = [];
	for (let i = 0; i < ordered.length; i++) {
		const current = ordered[i];
		const next = ordered[(i + 1) % ordered.length];
		const gap = normalizeAngle(next.angle - current.angle);
		gaps.push({
			fromLayerId: current.layerId,
			toLayerId: next.layerId,
			gap
		});
	}

	return {
		orderedLayerIds: ordered.map((entry) => entry.layerId),
		idealGap: 360 / ordered.length,
		gaps
	};
}

export function calculateRestoringContributions(
	state: Record<string, number>,
	layerIds: string[]
): LayerForceMap {
	const contributions: LayerForceMap = createZeroForceMap(layerIds);

	if (layerIds.length < 2) {
		return contributions;
	}

	const gapAnalysis = analyzeCircularGaps(state, layerIds);

	for (const gap of gapAnalysis.gaps) {
		const deviation = gapAnalysis.idealGap - gap.gap;
		contributions[gap.fromLayerId] -= deviation;
		contributions[gap.toLayerId] += deviation;
	}

	return contributions;
}

function clampRestoringForce(force: number): number {
	return Math.max(-MAX_RESTORING_FORCE, Math.min(MAX_RESTORING_FORCE, force));
}

export function calculateRestoringForceMap(
	restoringContributions: LayerForceMap,
	layerIds: string[]
): LayerForceMap {
	if (layerIds.length === 0) {
		return {};
	}

	const clamped: LayerForceMap = Object.fromEntries(
		layerIds.map((layerId) => [layerId, clampRestoringForce(restoringContributions[layerId] ?? 0)])
	);

	const total = layerIds.reduce((sum, layerId) => sum + clamped[layerId], 0);
	const mean = total / layerIds.length;

	return Object.fromEntries(layerIds.map((layerId) => [layerId, clamped[layerId] - mean]));
}

export function calculateUniqueContributions(
	state: Record<string, number>,
	layerIds: string[]
): LayerForceMap {
	const contributions: LayerForceMap = createZeroForceMap(layerIds);

	if (layerIds.length < 2) {
		return contributions;
	}

	for (let i = 0; i < layerIds.length; i++) {
		const layerIdA = layerIds[i];
		const angleA = normalizeAngle(state[layerIdA] ?? 0);

		for (let j = i + 1; j < layerIds.length; j++) {
			const layerIdB = layerIds[j];
			const angleB = normalizeAngle(state[layerIdB] ?? 0);
			const difference = shortestSignedAngleDifference(angleA, angleB);
			const distance = Math.abs(difference);

			if (distance >= MIN_UNIQUE_ANGLE_SEPARATION) {
				continue;
			}

			const violation = MIN_UNIQUE_ANGLE_SEPARATION - distance;
			const direction = difference === 0 ? 1 : Math.sign(difference);

			contributions[layerIdA] -= direction * violation;
			contributions[layerIdB] += direction * violation;
		}
	}

	return contributions;
}

function clampUniqueForce(force: number): number {
	return Math.max(-MAX_UNIQUE_FORCE, Math.min(MAX_UNIQUE_FORCE, force));
}

export function calculateUniqueForceMap(
	uniqueContributions: LayerForceMap,
	layerIds: string[]
): LayerForceMap {
	if (layerIds.length === 0) {
		return {};
	}

	const clamped: LayerForceMap = Object.fromEntries(
		layerIds.map((layerId) => [layerId, clampUniqueForce(uniqueContributions[layerId] ?? 0)])
	);

	const total = layerIds.reduce((sum, layerId) => sum + clamped[layerId], 0);
	const mean = total / layerIds.length;

	return Object.fromEntries(layerIds.map((layerId) => [layerId, clamped[layerId] - mean]));
}

function initializeLayout(layers: Layer[]): Record<string, number> {
	return Object.fromEntries(layers.map((layer) => [layer.id, normalizeAngle(layer.rotation)]));
}

function buildRotatedLayers(layers: Layer[], state: Record<string, number>): Layer[] {
	return layers.map((layer) => ({
		...layer,
		rotation: normalizeAngle(state[layer.id] ?? layer.rotation)
	}));
}

async function detectLayoutOverlaps(
	input: OptimizerInput,
	state: Record<string, number>
): Promise<Map<string, Map<string, number>>> {
	const layers = buildRotatedLayers(input.layers, state);
	const combinedSvg = combineDoodledial(
		input.svgContent,
		{ ...input.config, diameter: input.diameter },
		layers
	);

	return detectOverlaps(layers, combinedSvg);
}

function getOverlapCount(
	overlaps: Map<string, Map<string, number>>,
	layerId: string,
	otherLayerId: string
): number {
	return overlaps.get(layerId)?.get(otherLayerId) ?? 0;
}

async function calculateOverlapForce(
	input: OptimizerInput,
	state: Record<string, number>,
	currentOverlaps: Map<string, Map<string, number>>,
	layerId: string
): Promise<number> {
	const overlappingLayerIds = input.layers
		.filter((layer) => layer.id !== layerId)
		.map((layer) => layer.id)
		.filter(
			(otherLayerId) =>
				getOverlapCount(currentOverlaps, layerId, otherLayerId) >= MIN_OVERLAP_PIXELS
		);

	if (overlappingLayerIds.length === 0) {
		return 0;
	}

	let bestDirection: -1 | 0 | 1 = 0;
	let bestStep = OVERLAP_TEST_STEP;
	let bestDecrease = 0;

	for (const step of OVERLAP_DIRECTION_SEARCH_STEPS) {
		const positiveState = {
			...state,
			[layerId]: normalizeAngle(state[layerId] + step)
		};
		const negativeState = {
			...state,
			[layerId]: normalizeAngle(state[layerId] - step)
		};

		const [positiveOverlaps, negativeOverlaps] = await Promise.all([
			detectLayoutOverlaps(input, positiveState),
			detectLayoutOverlaps(input, negativeState)
		]);

		let positiveTotalDecrease = 0;
		let negativeTotalDecrease = 0;

		for (const otherLayerId of overlappingLayerIds) {
			const currentOverlap = getOverlapCount(currentOverlaps, layerId, otherLayerId);
			const positiveOverlap = getOverlapCount(positiveOverlaps, layerId, otherLayerId);
			const negativeOverlap = getOverlapCount(negativeOverlaps, layerId, otherLayerId);
			positiveTotalDecrease += Math.max(0, currentOverlap - positiveOverlap);
			negativeTotalDecrease += Math.max(0, currentOverlap - negativeOverlap);
		}

		if (positiveTotalDecrease >= negativeTotalDecrease && positiveTotalDecrease > bestDecrease) {
			bestDecrease = positiveTotalDecrease;
			bestDirection = 1;
			bestStep = step;
		} else if (
			negativeTotalDecrease > positiveTotalDecrease &&
			negativeTotalDecrease > bestDecrease
		) {
			bestDecrease = negativeTotalDecrease;
			bestDirection = -1;
			bestStep = step;
		}
	}

	if (bestDirection === 0) {
		return getExplorationDirection(layerId) * OVERLAP_TEST_STEP;
	}

	return bestDirection * bestStep;
}

function calculateRestoringForce(layerId: string, restoringForceMap: LayerForceMap): number {
	return restoringForceMap[layerId] ?? 0;
}

function calculateUniqueForce(layerId: string, uniqueForceMap: LayerForceMap): number {
	return uniqueForceMap[layerId] ?? 0;
}

function integrateAngle(currentAngle: number, totalForce: number, timeStepDt: number): number {
	return normalizeAngle(currentAngle + totalForce * timeStepDt);
}

function shouldConverge(avgForceMagnitude: number, threshold: number): boolean {
	return avgForceMagnitude < threshold;
}

function getExplorationDirection(layerId: string): -1 | 1 {
	let hash = 0;
	for (let i = 0; i < layerId.length; i++) {
		hash = (hash << 5) - hash + layerId.charCodeAt(i);
		hash |= 0;
	}

	return Math.abs(hash) % 2 === 0 ? 1 : -1;
}

function throwIfCancelled(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new OptimizerCancelledError();
	}
}

export async function runOptimizer(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void,
	options?: OptimizerOptions
): Promise<OptimizerResult> {
	console.log('[optimizer] Frontend optimizer called:', input);
	throwIfCancelled(options?.signal);

	const layerIds = input.layers.map((layer) => layer.id);
	const simulatedIterations = getIterationCount(layerIds.length);

	let state = initializeLayout(input.layers);
	let stopReason: OptimizerStopReason = 'max_iteration_count';
	let completedIterations = 0;
	let lastAverageForceMagnitude = 0;

	for (let iteration = 1; iteration <= simulatedIterations; iteration++) {
		throwIfCancelled(options?.signal);
		const layoutBefore = { ...state };
		const currentOverlaps = await detectLayoutOverlaps(input, state);
		const restoringContributions = calculateRestoringContributions(state, layerIds);
		const restoringForceMap = calculateRestoringForceMap(restoringContributions, layerIds);
		const uniqueContributions = calculateUniqueContributions(state, layerIds);
		const uniqueForceMap = calculateUniqueForceMap(uniqueContributions, layerIds);
		const restoringRawSum = sumForceMap(restoringContributions, layerIds);
		const restoringNormalizedSum = sumForceMap(restoringForceMap, layerIds);
		const uniqueRawSum = sumForceMap(uniqueContributions, layerIds);
		const uniqueNormalizedSum = sumForceMap(uniqueForceMap, layerIds);
		throwIfCancelled(options?.signal);
		let totalForceMagnitude = 0;
		const nextState = { ...state };
		const layerForces: Record<string, number> = {};

		for (const layerId of layerIds) {
			throwIfCancelled(options?.signal);
			const overlapForce = await calculateOverlapForce(input, state, currentOverlaps, layerId);
			throwIfCancelled(options?.signal);
			const restoringForce = calculateRestoringForce(layerId, restoringForceMap);
			const uniqueForce = calculateUniqueForce(layerId, uniqueForceMap);
			const totalForce =
				overlapForce + RESTORING_FORCE_WEIGHT * restoringForce + UNIQUE_FORCE_WEIGHT * uniqueForce;
			layerForces[layerId] = totalForce;
			nextState[layerId] = integrateAngle(state[layerId], totalForce, TIME_STEP_DT);
			totalForceMagnitude += Math.abs(totalForce);
		}

		const averageForceMagnitude = layerIds.length > 0 ? totalForceMagnitude / layerIds.length : 0;
		lastAverageForceMagnitude = averageForceMagnitude;
		completedIterations = iteration;
		onProgress?.({
			percent: Math.round((iteration / simulatedIterations) * 100),
			message: `Iterations ${iteration}/${simulatedIterations}`,
			iteration,
			totalIterations: simulatedIterations
		});

		console.log('[optimizer] Frontend optimizer iteration:', {
			iteration,
			averageForceMagnitude,
			restoringRawSum,
			restoringNormalizedSum,
			uniqueRawSum,
			uniqueNormalizedSum,
			forces: layerForces,
			layoutBefore,
			layoutAfter: nextState
		});

		state = nextState;

		if (shouldConverge(averageForceMagnitude, CONVERGENCE_THRESHOLD)) {
			stopReason = 'convergence';
			break;
		}
	}

	console.log('[optimizer] Frontend optimizer stopped:', {
		reason: stopReason,
		iterations: completedIterations,
		maxIterations: simulatedIterations,
		averageForceMagnitude: lastAverageForceMagnitude
	});

	const layout = state;
	return { layout };
}
