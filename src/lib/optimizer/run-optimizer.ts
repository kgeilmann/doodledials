export interface OptimizerInput {
	layerCount: number;
	diameter: number;
	layerIds: string[];
}

export interface OptimizerProgress {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
}

export interface OptimizerResult {
	randomLayout: Record<string, number>;
}

function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

function createRandomLayout(layerIds: string[]): Record<string, number> {
	const randomLayout: Record<string, number> = {};
	const minSeparation = layerIds.length > 0 ? 360 / layerIds.length : 0;

	layerIds.forEach((layerId, index) => {
		const jitter = (Math.random() - 0.5) * Math.min(25, minSeparation * 0.4);
		randomLayout[layerId] = normalizeAngle(index * minSeparation + jitter);
	});

	return randomLayout;
}

function getSimulatedIterationCount(layerCount: number): number {
	return Math.min(36, Math.max(12, layerCount * 6));
}

function initializeLayout(layerIds: string[]): Record<string, number> {
	return createRandomLayout(layerIds);
}

function calculateOverlapForce(): number {
	return (Math.random() - 0.5) * 8;
}

function calculateRestoringForce(): number {
	return (Math.random() - 0.5) * 3;
}

function calculateUniqueForce(): number {
	return (Math.random() - 0.5) * 2;
}

function integrateAngle(
	currentAngle: number,
	totalForce: number,
	timeStepDt: number,
	damping = 0.9
): number {
	return normalizeAngle(currentAngle + totalForce * timeStepDt * damping);
}

function shouldConverge(avgForceMagnitude: number, threshold: number): boolean {
	return avgForceMagnitude < threshold;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runOptimizer(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void
): Promise<OptimizerResult> {
	console.log('[optimizer] Frontend optimizer called:', input);

	const simulatedIterations = getSimulatedIterationCount(input.layerCount);

	const state = initializeLayout(input.layerIds);

	for (let iteration = 1; iteration <= simulatedIterations; iteration++) {
		let totalForceMagnitude = 0;
		for (const layerId of input.layerIds) {
			const overlapForce = calculateOverlapForce();
			const restoringForce = calculateRestoringForce();
			const uniqueForce = calculateUniqueForce();
			const totalForce = overlapForce + restoringForce + uniqueForce;
			state[layerId] = integrateAngle(state[layerId], totalForce, 0.5);
			totalForceMagnitude += Math.abs(totalForce);
		}
		const averageForceMagnitude =
			input.layerIds.length > 0 ? totalForceMagnitude / input.layerIds.length : 0;
		onProgress?.({
			percent: Math.round((iteration / simulatedIterations) * 100),
			message: `Iterations ${iteration}/${simulatedIterations}`,
			iteration,
			totalIterations: simulatedIterations
		});
			await sleep(50);
		if (iteration >= 6 && shouldConverge(averageForceMagnitude, 0.001)) {
			break;
		}
	}
	const randomLayout = state;
	return { randomLayout };
}
