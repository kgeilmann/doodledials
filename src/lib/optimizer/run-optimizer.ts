export interface OptimizerInput {
	layerCount: number;
	diameter: number;
	layerIds: string[];
}

export interface OptimizerProgress {
	percent: number;
	phase: 'initialize_layout' | 'calculate_forces' | 'update_angles' | 'check_convergence';
	message: string;
	iteration: number;
	totalIterations: number;
}

export interface OptimizerConstantsSnapshot {
	minGapPixels: number;
	angleMinSeparation: number;
	maxIterations: number;
	timeStepDt: number;
	convergenceThreshold: number;
}

export interface OptimizerPhaseSummary {
	name: 'initialize_layout' | 'calculate_forces' | 'update_angles' | 'check_convergence';
	status: 'simulated';
	description: string;
	outputs: Record<string, unknown>;
}

export interface OptimizerResult {
	ok: true;
	message: string;
	version: 'optimizer-v1';
	input: OptimizerInput;
	constants: OptimizerConstantsSnapshot;
	phases: OptimizerPhaseSummary[];
	randomLayout: Record<string, number>;
	manualReviewChecklist: string[];
}

const SIMULATED_PHASE_DELAY_MS = 800;
const SIMULATED_ITERATION_DELAY_MS = 120;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function runOptimizerStub(
	input: OptimizerInput,
	onProgress?: (progress: OptimizerProgress) => void
): Promise<OptimizerResult> {
	console.log('[optimizer] Frontend optimizer called:', input);

	const constants: OptimizerConstantsSnapshot = {
		minGapPixels: 2,
		angleMinSeparation: 5,
		maxIterations: 1000,
		timeStepDt: 0.5,
		convergenceThreshold: 0.001
	};

	const simulatedIterations = getSimulatedIterationCount(input.layerCount);

	onProgress?.({
		percent: 0,
		phase: 'initialize_layout',
		message: 'Initializing random layout state...',
		iteration: 0,
		totalIterations: simulatedIterations
	});
	await sleep(SIMULATED_PHASE_DELAY_MS);

	const state = initializeLayout(input.layerIds);
	let iterationsRun = 0;

	for (let iteration = 1; iteration <= simulatedIterations; iteration++) {
		iterationsRun = iteration;
		let totalForceMagnitude = 0;

		for (const layerId of input.layerIds) {
			const overlapForce = calculateOverlapForce();
			const restoringForce = calculateRestoringForce();
			const uniqueForce = calculateUniqueForce();
			const totalForce = overlapForce + restoringForce + uniqueForce;

			state[layerId] = integrateAngle(state[layerId], totalForce, constants.timeStepDt);
			totalForceMagnitude += Math.abs(totalForce);
		}

		const averageForceMagnitude =
			input.layerIds.length > 0 ? totalForceMagnitude / input.layerIds.length : 0;

		onProgress?.({
			percent: Math.round((iteration / simulatedIterations) * 100),
			phase: 'update_angles',
			message: `Iterations ${iteration}/${simulatedIterations}`,
			iteration,
			totalIterations: simulatedIterations
		});

		await sleep(SIMULATED_ITERATION_DELAY_MS);

		if (iteration >= 6 && shouldConverge(averageForceMagnitude, constants.convergenceThreshold)) {
			break;
		}
	}

	onProgress?.({
		percent: 100,
		phase: 'check_convergence',
		message: `Finalized after ${iterationsRun} iterations.`,
		iteration: iterationsRun,
		totalIterations: simulatedIterations
	});

	const randomLayout = state;

	return {
		ok: true,
		message: 'Frontend optimizer run finished.',
		version: 'optimizer-v1',
		input,
		constants,
		phases: [
			{
				name: 'initialize_layout',
				status: 'simulated',
				description:
					'Will create initial unique random angles for each path and normalize to [0, 360).',
				outputs: {
					expectedStateShape: 'Array<{ pathId: string; angle: number }>',
					pathCount: input.layerCount
				}
			},
			{
				name: 'calculate_forces',
				status: 'simulated',
				description:
					'Computes overlap, restoring, and unique directional shifts per path via simulated helper functions.',
				outputs: {
					forceComponents: ['overlap', 'restoring', 'unique'],
					expectedStateShape:
						'Record<pathId, { overlap: number; restoring: number; unique: number }>'
				}
			},
			{
				name: 'update_angles',
				status: 'simulated',
				description:
					'Will integrate weighted total force using Euler step and normalize updated angles.',
				outputs: {
					updateFormula: 'newAngle = normalize(currentAngle + deltaThetaTotal * dt)',
					timeStepDt: constants.timeStepDt
				}
			},
			{
				name: 'check_convergence',
				status: 'simulated',
				description:
					'Stops iterations when simulated convergence criteria are met or iteration cap is reached.',
				outputs: {
					simulatedIterations,
					iterationsRun,
					convergenceThreshold: constants.convergenceThreshold
				}
			}
		],
		randomLayout,
		manualReviewChecklist: [
			'Confirm pathCount input matches visible optimizer scope.',
			'Validate directional sign conventions before enabling writes to layer rotations.',
			'Validate convergence criteria with real overlap measurements before auto-applying results.'
		]
	};
}
