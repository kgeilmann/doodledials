import type { Layer } from '$lib/types/doodledial';
import {
	combineOptimizerSvgTemplate,
	createOptimizerSvgTemplate,
	type OptimizerSvgTemplate
} from '$lib/utils/doodledial';
import {
	createOverlapDetectionCache,
	detectOverlaps,
	type OverlapDetectionCache
} from '$lib/utils/overlap-detection';
import { normalizeAngle, roundLayoutAngles } from '$lib/utils/rotation';
import type { OptimizerInput, OptimizerProgress } from './shared';

export type { OptimizerInput, OptimizerProgress } from './shared';

export interface OptimizerResult {
	layout: Record<string, number>;
}

export interface OptimizerTuning {
	overlapMagnitudeWeight?: number;
	overlapMagnitudePower?: number;
	maxOverlapForceMagnitude?: number;
	overlapTestStep?: number;
	overlapDirectionSearchSteps?: number[];
	timeStepDt?: number;
	restoringForceWeight?: number;
	maxRestoringForce?: number;
	uniqueForceWeight?: number;
	minUniqueAngleSeparation?: number;
	maxUniqueForce?: number;
}

export interface OptimizerIterationSnapshot {
	iteration: number;
	averageForceMagnitude: number;
	overlapAggregate: number;
	minimumGap: number;
}

export interface OptimizerOptions {
	signal?: AbortSignal;
	initializeRandomly?: boolean;
	randomSeed?: number;
	roundOutputAngles?: boolean;
	tuning?: OptimizerTuning;
	onIterationSnapshot?: (snapshot: OptimizerIterationSnapshot) => void;
}

export class OptimizerCancelledError extends Error {
	constructor(message = 'Optimizer cancelled') {
		super(message);
		this.name = 'OptimizerCancelledError';
	}
}

const CONVERGENCE_THRESHOLD = 0.001;
const MAX_ITERATIONS = 500;
const MIN_OVERLAP_PIXELS = 2;
const OVERLAP_TEST_STEP = 1;
const OVERLAP_DIRECTION_SEARCH_STEPS = [1, 2, 4, 8];
const OVERLAP_MAGNITUDE_WEIGHT = 0.1;
const OVERLAP_MAGNITUDE_POWER = 1.2;
const MAX_OVERLAP_FORCE_MAGNITUDE = 8;
const TIME_STEP_DT = 0.5;
const RESTORING_FORCE_WEIGHT = 0.02;
const MAX_RESTORING_FORCE = 2;
const UNIQUE_FORCE_WEIGHT = 0.02;
const MIN_UNIQUE_ANGLE_SEPARATION = 5;
const MAX_UNIQUE_FORCE = 2;

interface ResolvedOptimizerTuning {
	overlapMagnitudeWeight: number;
	overlapMagnitudePower: number;
	maxOverlapForceMagnitude: number;
	overlapTestStep: number;
	overlapDirectionSearchSteps: number[];
	timeStepDt: number;
	restoringForceWeight: number;
	maxRestoringForce: number;
	uniqueForceWeight: number;
	minUniqueAngleSeparation: number;
	maxUniqueForce: number;
}

const DEFAULT_OPTIMIZER_TUNING: ResolvedOptimizerTuning = {
	overlapMagnitudeWeight: OVERLAP_MAGNITUDE_WEIGHT,
	overlapMagnitudePower: OVERLAP_MAGNITUDE_POWER,
	maxOverlapForceMagnitude: MAX_OVERLAP_FORCE_MAGNITUDE,
	overlapTestStep: OVERLAP_TEST_STEP,
	overlapDirectionSearchSteps: OVERLAP_DIRECTION_SEARCH_STEPS,
	timeStepDt: TIME_STEP_DT,
	restoringForceWeight: RESTORING_FORCE_WEIGHT,
	maxRestoringForce: MAX_RESTORING_FORCE,
	uniqueForceWeight: UNIQUE_FORCE_WEIGHT,
	minUniqueAngleSeparation: MIN_UNIQUE_ANGLE_SEPARATION,
	maxUniqueForce: MAX_UNIQUE_FORCE
};

function resolveOptimizerTuning(tuning?: OptimizerTuning): ResolvedOptimizerTuning {
	return { ...DEFAULT_OPTIMIZER_TUNING, ...tuning };
}

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

function shortestSignedAngleDifference(fromAngle: number, toAngle: number): number {
	let difference = normalizeAngle(toAngle - fromAngle);
	if (difference > 180) {
		difference -= 360;
	}
	return difference;
}

function getIterationCount(layerCount: number): number {
	return Math.min(MAX_ITERATIONS, Math.max(12, layerCount * 6));
}

function createSeededRandom(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function createRandomSource(seed?: number): () => number {
	return typeof seed === 'number' ? createSeededRandom(seed) : Math.random;
}

function initializeRandomLayout(layers: Layer[], seed?: number): Record<string, number> {
	if (layers.length === 0) {
		return {};
	}

	const random = createRandomSource(seed);
	const idealGap = 360 / layers.length;
	const jitterRange = idealGap * 0.2;
	const offset = random() * 360;

	const layoutEntries = layers.map((layer, index) => {
		const jitter = (random() - 0.5) * jitterRange;
		const angle = normalizeAngle(offset + index * idealGap + jitter);
		return [layer.id, angle] as const;
	});

	return Object.fromEntries(layoutEntries);
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

function clampForce(force: number, maxMagnitude: number): number {
	return Math.max(-maxMagnitude, Math.min(maxMagnitude, force));
}

function zeroMeanForceMap(forceMap: LayerForceMap, layerIds: string[]): LayerForceMap {
	if (layerIds.length === 0) {
		return {};
	}

	const total = layerIds.reduce((sum, layerId) => sum + forceMap[layerId], 0);
	const mean = total / layerIds.length;

	return Object.fromEntries(layerIds.map((layerId) => [layerId, forceMap[layerId] - mean]));
}

export function calculateRestoringForceMap(
	restoringContributions: LayerForceMap,
	layerIds: string[],
	tuning: ResolvedOptimizerTuning = DEFAULT_OPTIMIZER_TUNING
): LayerForceMap {
	const clamped: LayerForceMap = Object.fromEntries(
		layerIds.map((layerId) => [
			layerId,
			clampForce(restoringContributions[layerId] ?? 0, tuning.maxRestoringForce)
		])
	);

	return zeroMeanForceMap(clamped, layerIds);
}

export function calculateUniqueContributions(
	state: Record<string, number>,
	layerIds: string[],
	tuning: ResolvedOptimizerTuning = DEFAULT_OPTIMIZER_TUNING
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

			if (distance >= tuning.minUniqueAngleSeparation) {
				continue;
			}

			const violation = tuning.minUniqueAngleSeparation - distance;
			const direction = difference === 0 ? 1 : Math.sign(difference);

			contributions[layerIdA] -= direction * violation;
			contributions[layerIdB] += direction * violation;
		}
	}

	return contributions;
}

export function calculateUniqueForceMap(
	uniqueContributions: LayerForceMap,
	layerIds: string[],
	tuning: ResolvedOptimizerTuning = DEFAULT_OPTIMIZER_TUNING
): LayerForceMap {
	const clamped: LayerForceMap = Object.fromEntries(
		layerIds.map((layerId) => [
			layerId,
			clampForce(uniqueContributions[layerId] ?? 0, tuning.maxUniqueForce)
		])
	);

	return zeroMeanForceMap(clamped, layerIds);
}

function initializeLayout(layers: Layer[]): Record<string, number> {
	return Object.fromEntries(layers.map((layer) => [layer.id, normalizeAngle(layer.rotation)]));
}

function calculateOverlapAggregate(
	overlaps: Map<string, Map<string, number>>,
	layerIds: string[]
): number {
	let total = 0;

	for (let i = 0; i < layerIds.length; i++) {
		for (let j = i + 1; j < layerIds.length; j++) {
			total += getOverlapCount(overlaps, layerIds[i], layerIds[j]);
		}
	}

	return total;
}

function buildRotatedLayers(layers: Layer[], state: Record<string, number>): Layer[] {
	return layers.map((layer) => ({
		...layer,
		rotation: normalizeAngle(state[layer.id] ?? layer.rotation)
	}));
}

async function detectLayoutOverlaps(
	input: OptimizerInput,
	state: Record<string, number>,
	overlapCache: OverlapDetectionCache,
	optimizerSvgTemplate: OptimizerSvgTemplate
): Promise<Map<string, Map<string, number>>> {
	const layers = buildRotatedLayers(input.layers, state);
	const combinedSvg = combineOptimizerSvgTemplate(optimizerSvgTemplate, state);

	return detectOverlaps(layers, combinedSvg, {
		cache: overlapCache,
		cutoutStrokeWidthMm: input.config.optimizerGapMm ?? 2,
		dialDiameterMm: input.diameter
	});
}

function getOverlapCount(
	overlaps: Map<string, Map<string, number>>,
	layerId: string,
	otherLayerId: string
): number {
	return overlaps.get(layerId)?.get(otherLayerId) ?? 0;
}

export function calculateOverlapMagnitudeFromSharedPixels(
	sharedPixels: number,
	tuning: ResolvedOptimizerTuning = DEFAULT_OPTIMIZER_TUNING
): number {
	if (sharedPixels < MIN_OVERLAP_PIXELS) {
		return 0;
	}

	return (
		tuning.overlapMagnitudeWeight *
		Math.pow(Math.max(0, sharedPixels - 1), tuning.overlapMagnitudePower)
	);
}

function calculateOverlapMagnitude(
	currentOverlaps: Map<string, Map<string, number>>,
	layerId: string,
	overlappingLayerIds: string[],
	tuning: ResolvedOptimizerTuning
): number {
	const totalMagnitude = overlappingLayerIds.reduce((sum, otherLayerId) => {
		const overlap = getOverlapCount(currentOverlaps, layerId, otherLayerId);
		return sum + calculateOverlapMagnitudeFromSharedPixels(overlap, tuning);
	}, 0);

	return Math.min(tuning.maxOverlapForceMagnitude, totalMagnitude);
}

async function calculateOverlapForce(
	input: OptimizerInput,
	state: Record<string, number>,
	currentOverlaps: Map<string, Map<string, number>>,
	layerId: string,
	tuning: ResolvedOptimizerTuning,
	overlapCache: OverlapDetectionCache,
	optimizerSvgTemplate: OptimizerSvgTemplate
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

	const overlapMagnitude = calculateOverlapMagnitude(
		currentOverlaps,
		layerId,
		overlappingLayerIds,
		tuning
	);

	let bestDirection: -1 | 0 | 1 = 0;
	let bestStep = tuning.overlapTestStep;
	let bestDecrease = 0;

	for (const step of tuning.overlapDirectionSearchSteps) {
		const positiveState = {
			...state,
			[layerId]: normalizeAngle(state[layerId] + step)
		};
		const negativeState = {
			...state,
			[layerId]: normalizeAngle(state[layerId] - step)
		};

		const [positiveOverlaps, negativeOverlaps] = await Promise.all([
			detectLayoutOverlaps(input, positiveState, overlapCache, optimizerSvgTemplate),
			detectLayoutOverlaps(input, negativeState, overlapCache, optimizerSvgTemplate)
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
		return getExplorationDirection(layerId) * tuning.overlapTestStep * overlapMagnitude;
	}

	return bestDirection * bestStep * overlapMagnitude;
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
	throwIfCancelled(options?.signal);

	const layerIds = input.layers.map((layer) => layer.id);
	const simulatedIterations = getIterationCount(layerIds.length);
	const shouldInitializeRandomly = options?.initializeRandomly ?? false;
	const shouldRoundOutputAngles = options?.roundOutputAngles ?? true;
	const tuning = resolveOptimizerTuning(options?.tuning);
	const overlapCache = createOverlapDetectionCache();
	const optimizerSvgTemplate = createOptimizerSvgTemplate(
		input.svgContent,
		{
			...input.config,
			diameter: input.diameter
		},
		input.layers,
		input.groups
	);

	let state = shouldInitializeRandomly
		? initializeRandomLayout(input.layers, options?.randomSeed)
		: initializeLayout(input.layers);

	for (let iteration = 1; iteration <= simulatedIterations; iteration++) {
		throwIfCancelled(options?.signal);
		const currentOverlaps = await detectLayoutOverlaps(
			input,
			state,
			overlapCache,
			optimizerSvgTemplate
		);
		const restoringContributions = calculateRestoringContributions(state, layerIds);
		const restoringForceMap = calculateRestoringForceMap(restoringContributions, layerIds, tuning);
		const uniqueContributions = calculateUniqueContributions(state, layerIds, tuning);
		const uniqueForceMap = calculateUniqueForceMap(uniqueContributions, layerIds, tuning);
		const overlapAggregate = calculateOverlapAggregate(currentOverlaps, layerIds);
		throwIfCancelled(options?.signal);
		let totalForceMagnitude = 0;
		const nextState = { ...state };

		for (const layerId of layerIds) {
			throwIfCancelled(options?.signal);
			const overlapForce = await calculateOverlapForce(
				input,
				state,
				currentOverlaps,
				layerId,
				tuning,
				overlapCache,
				optimizerSvgTemplate
			);
			throwIfCancelled(options?.signal);
			const restoringForce = calculateRestoringForce(layerId, restoringForceMap);
			const uniqueForce = calculateUniqueForce(layerId, uniqueForceMap);
			const totalForce =
				overlapForce +
				tuning.restoringForceWeight * restoringForce +
				tuning.uniqueForceWeight * uniqueForce;
			nextState[layerId] = integrateAngle(state[layerId], totalForce, tuning.timeStepDt);
			totalForceMagnitude += Math.abs(totalForce);
		}

		const averageForceMagnitude = layerIds.length > 0 ? totalForceMagnitude / layerIds.length : 0;
		const nextGapAnalysis = analyzeCircularGaps(nextState, layerIds);
		const minimumGap =
			nextGapAnalysis.gaps.length > 0
				? Math.min(...nextGapAnalysis.gaps.map((gap) => gap.gap))
				: 360;
		options?.onIterationSnapshot?.({
			iteration,
			averageForceMagnitude,
			overlapAggregate,
			minimumGap
		});
		onProgress?.({
			percent: Math.round((iteration / simulatedIterations) * 100),
			message: `Iterations ${iteration}/${simulatedIterations}`,
			iteration,
			totalIterations: simulatedIterations
		});

		state = nextState;

		if (shouldConverge(averageForceMagnitude, CONVERGENCE_THRESHOLD)) {
			break;
		}
	}

	const layout = shouldRoundOutputAngles ? roundLayoutAngles(state) : state;
	return { layout };
}
