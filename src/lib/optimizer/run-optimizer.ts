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

type OptimizerStopReason = 'convergence' | 'max_iteration_count';

const CONVERGENCE_THRESHOLD = 0.001;
const MAX_ITERATIONS = 536;
const MIN_OVERLAP_PIXELS = 2;
const OVERLAP_TEST_STEP = 1;
const TIME_STEP_DT = 0.5;

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function getIterationCount(layerCount: number): number {
	return Math.min(MAX_ITERATIONS, Math.max(12, layerCount * 6));
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

	const positiveState = {
		...state,
		[layerId]: normalizeAngle(state[layerId] + OVERLAP_TEST_STEP)
	};
	const negativeState = {
		...state,
		[layerId]: normalizeAngle(state[layerId] - OVERLAP_TEST_STEP)
	};

	const [positiveOverlaps, negativeOverlaps] = await Promise.all([
		detectLayoutOverlaps(input, positiveState),
		detectLayoutOverlaps(input, negativeState)
	]);

	let force = 0;

	for (const otherLayerId of overlappingLayerIds) {
		const currentOverlap = getOverlapCount(currentOverlaps, layerId, otherLayerId);
		const positiveOverlap = getOverlapCount(positiveOverlaps, layerId, otherLayerId);
		const negativeOverlap = getOverlapCount(negativeOverlaps, layerId, otherLayerId);
		const positiveDecrease = currentOverlap - positiveOverlap;
		const negativeDecrease = currentOverlap - negativeOverlap;

		if (positiveDecrease >= negativeDecrease && positiveDecrease > 0) {
			force += OVERLAP_TEST_STEP;
		} else if (negativeDecrease > positiveDecrease && negativeDecrease > 0) {
			force -= OVERLAP_TEST_STEP;
		}
	}

	return force;
}

function calculateRestoringForce(): number {
	return 0;
}

function calculateUniqueForce(): number {
	return 0;
}

function integrateAngle(currentAngle: number, totalForce: number, timeStepDt: number): number {
	return normalizeAngle(currentAngle + totalForce * timeStepDt);
}

function shouldConverge(avgForceMagnitude: number, threshold: number): boolean {
	return avgForceMagnitude < threshold;
}

export async function runOptimizer(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void
): Promise<OptimizerResult> {
	console.log('[optimizer] Frontend optimizer called:', input);

	const layerIds = input.layers.map((layer) => layer.id);
	const simulatedIterations = getIterationCount(layerIds.length);

	let state = initializeLayout(input.layers);
	let stopReason: OptimizerStopReason = 'max_iteration_count';
	let completedIterations = 0;
	let lastAverageForceMagnitude = 0;

	for (let iteration = 1; iteration <= simulatedIterations; iteration++) {
		const layoutBefore = { ...state };
		const currentOverlaps = await detectLayoutOverlaps(input, state);
		let totalForceMagnitude = 0;
		const nextState = { ...state };
		const layerForces: Record<string, number> = {};

		for (const layerId of layerIds) {
			const overlapForce = await calculateOverlapForce(input, state, currentOverlaps, layerId);
			const restoringForce = calculateRestoringForce();
			const uniqueForce = calculateUniqueForce();
			const totalForce = overlapForce + restoringForce + uniqueForce;
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
