export interface OptimizerInput {
	layerCount: number;
	diameter: number;
	layerIds: string[];
}

export interface OptimizerProgress {
	percent: number;
	phase: 'initialize_layout' | 'calculate_forces' | 'update_angles' | 'check_convergence';
	message: string;
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

	const progressPlan: OptimizerProgress[] = [
		{
			percent: 10,
			phase: 'initialize_layout',
			message: 'Seeding random initial angles...'
		},
		{
			percent: 45,
			phase: 'calculate_forces',
			message: 'Simulating force components...'
		},
		{
			percent: 75,
			phase: 'update_angles',
			message: 'Applying integration step to candidate angles...'
		},
		{
			percent: 100,
			phase: 'check_convergence',
			message: 'Finalizing random layout output.'
		}
	];

	for (const progress of progressPlan) {
		onProgress?.(progress);
		await sleep(SIMULATED_PHASE_DELAY_MS);
	}

	const randomLayout = createRandomLayout(input.layerIds);

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
					'Will compute overlap, restoring, and unique directional shifts for each path each iteration.',
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
					'Will stop iterations when average total force magnitude drops below threshold.',
				outputs: {
					maxIterations: constants.maxIterations,
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
