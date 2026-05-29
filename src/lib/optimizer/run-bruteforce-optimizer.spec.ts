import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const { combineDoodledialMock, detectPairOverlapPixelsMock } = vi.hoisted(() => ({
	combineDoodledialMock: vi.fn(
		(
			_content: SVGContent,
			_config: DialConfig,
			layers: Layer[] = [],
			_highlightedLayerId?: string | null,
			_selectedLayerId?: string | null,
			_options?: { includePathLabels?: boolean }
		) => {
			void _highlightedLayerId;
			void _selectedLayerId;
			void _options;
			return JSON.stringify(Object.fromEntries(layers.map((layer) => [layer.id, layer.rotation])));
		}
	),
	detectPairOverlapPixelsMock: vi.fn(
		async ({
			firstLayer,
			secondLayer
		}: {
			firstLayer: Layer;
			secondLayer: Layer;
			pairCacheMode?: 'relative';
			cache?: unknown;
			combinedSvg: string;
		}): Promise<number> => (firstLayer.rotation === secondLayer.rotation ? 3 : 0)
	)
}));

vi.mock('$lib/utils/doodledial', () => ({
	combineDoodledial: combineDoodledialMock
}));

vi.mock('$lib/utils/overlap-detection', () => ({
	detectPairOverlapPixels: detectPairOverlapPixelsMock,
	createOverlapDetectionCache: () => ({
		bitmapByLayerAngle: new Map(),
		overlapByRelativePairAngles: new Map()
	})
}));

import {
	BruteforceOptimizerCancelledError,
	calculateAssignedMinGapUpperBound,
	runBruteforceOptimizer
} from './run-bruteforce-optimizer';

function buildInput(layers: Layer[]) {
	return {
		diameter: 200,
		config: {
			diameter: 200,
			minDiameter: 50,
			maxDiameter: 200,
			borderWidth: 2,
			padding: 0.05,
			offsetX: 0,
			offsetY: 0,
			scale: 1
		},
		layers,
		svgContent: {
			raw: '<svg viewBox="0 0 200 200"></svg>',
			filename: 'fixture.svg'
		}
	};
}

function twoLayers(): Layer[] {
	return [
		{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
		{ id: 'layerB', index: 1, name: 'Layer B', rotation: 45, visible: true }
	];
}

function threeLayers(): Layer[] {
	return [
		{ id: 'layerA', index: 0, name: 'Layer A', rotation: 10, visible: true },
		{ id: 'layerB', index: 1, name: 'Layer B', rotation: 120, visible: true },
		{ id: 'layerC', index: 2, name: 'Layer C', rotation: 240, visible: true }
	];
}

describe('runBruteforceOptimizer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		detectPairOverlapPixelsMock.mockImplementation(
			async ({ firstLayer, secondLayer }: { firstLayer: Layer; secondLayer: Layer }) =>
				firstLayer.rotation === secondLayer.rotation ? 3 : 0
		);
	});

	test('returns deterministic layout for the same input', async () => {
		const input = buildInput(twoLayers());

		const first = await runBruteforceOptimizer(input, undefined, { roundOutputAngles: false });
		const second = await runBruteforceOptimizer(input, undefined, { roundOutputAngles: false });

		expect(second.layout).toEqual(first.layout);
	});

	test('throws cancellation error when abort signal is already cancelled', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runBruteforceOptimizer(buildInput(twoLayers()), undefined, { signal: controller.signal })
		).rejects.toBeInstanceOf(BruteforceOptimizerCancelledError);
	});

	test('reports time_limit through search snapshot callback', async () => {
		const snapshots: Array<string | undefined> = [];

		const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
			maxRuntimeMs: 0,
			onSearchSnapshot: (snapshot) => snapshots.push(snapshot.stopReason)
		});

		expect(result.layout).toBeDefined();
		expect(snapshots).toContain('time_limit');
	});

	test('reports exact_complete through search snapshot callback on successful search', async () => {
		const snapshots: Array<string | undefined> = [];

		const result = await runBruteforceOptimizer(buildInput(twoLayers()), undefined, {
			onSearchSnapshot: (snapshot) => snapshots.push(snapshot.stopReason)
		});

		expect(result.layout).toBeDefined();
		expect(snapshots).toContain('exact_complete');
	});

	test('emits progress messages containing Combinations token', async () => {
		const progressMessages: string[] = [];

		await runBruteforceOptimizer(
			buildInput(twoLayers()),
			(progress) => {
				progressMessages.push(progress.message);
			},
			{ maxRuntimeMs: 1 }
		);

		expect(progressMessages.some((message) => message.includes('Combinations'))).toBe(true);
	});

	test('returns integer angles by default', async () => {
		const result = await runBruteforceOptimizer(buildInput(twoLayers()));

		for (const angle of Object.values(result.layout)) {
			expect(Number.isInteger(angle)).toBe(true);
			expect(angle).toBeGreaterThanOrEqual(0);
			expect(angle).toBeLessThan(360);
		}
	});

	test('keeps custom anchorLayerId fixed at zero in output layout', async () => {
		const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
			anchorLayerId: 'layerB',
			roundOutputAngles: false
		});

		expect(result.layout.layerB).toBe(0);
	});

	test('returns a feasible layout with unique angles across all layers', async () => {
		const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
			roundOutputAngles: false
		});

		const layoutAngles = Object.values(result.layout);
		expect(new Set(layoutAngles).size).toBe(layoutAngles.length);
	});

	test('uses relative overlap pair cache mode', async () => {
		await runBruteforceOptimizer(buildInput(twoLayers()));

		const firstCallOptions = detectPairOverlapPixelsMock.mock.calls[0]?.[0];
		expect(firstCallOptions).toBeDefined();
		expect(firstCallOptions?.pairCacheMode).toBe('relative');
		expect(firstCallOptions?.cache).toBeDefined();
	});

	test('disables path labels while combining overlap pairs', async () => {
		await runBruteforceOptimizer(buildInput(twoLayers()));

		const firstCombineCall = combineDoodledialMock.mock.calls[0];
		expect(firstCombineCall).toBeDefined();
		expect(firstCombineCall?.[5]).toEqual({ includePathLabels: false });
	});

	test('reports no_feasible_solution when threshold cannot be satisfied', async () => {
		detectPairOverlapPixelsMock.mockImplementation(async () => 5);

		const snapshots: Array<string | undefined> = [];
		const result = await runBruteforceOptimizer(buildInput(twoLayers()), undefined, {
			onSearchSnapshot: (snapshot) => snapshots.push(snapshot.stopReason)
		});

		expect(snapshots).toContain('no_feasible_solution');
		expect(result.layout.layerA).toBe(0);
	});
});

describe('calculateAssignedMinGapUpperBound', () => {
	test('returns infinity for zero or one assigned angle', () => {
		expect(calculateAssignedMinGapUpperBound([])).toBe(Number.POSITIVE_INFINITY);
		expect(calculateAssignedMinGapUpperBound([0])).toBe(Number.POSITIVE_INFINITY);
	});

	test('returns current minimum circular gap for assigned angles', () => {
		expect(calculateAssignedMinGapUpperBound([0, 120, 240])).toBe(120);
		expect(calculateAssignedMinGapUpperBound([0, 90, 200])).toBe(90);
		expect(calculateAssignedMinGapUpperBound([350, 10, 120])).toBe(20);
	});
});
