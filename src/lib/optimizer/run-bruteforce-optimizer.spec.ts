import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const {
	createOptimizerSvgTemplateMock,
	combineOptimizerSvgTemplateMock,
	detectPairOverlapPixelsMock
} = vi.hoisted(() => ({
	createOptimizerSvgTemplateMock: vi.fn(
		(_content: SVGContent, _config: DialConfig, layerIds: string[]) => ({
			rawTemplate: 'template',
			layerIds
		})
	),
	combineOptimizerSvgTemplateMock: vi.fn(
		(
			_template: { rawTemplate: string; layerIds: string[] },
			rotationsByLayerId: Record<string, number>
		) => JSON.stringify(rotationsByLayerId)
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
	createOptimizerSvgTemplate: createOptimizerSvgTemplateMock,
	combineOptimizerSvgTemplate: combineOptimizerSvgTemplateMock
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
	addToTopLayouts,
	calculateAssignedMinGapUpperBound,
	layoutDistance,
	runBruteforceOptimizer,
	seededShuffle
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
			scale: 1,
			centerHoleDiameter: 2
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

describe('layoutDistance', () => {
	it('returns 0 for identical layouts', () => {
		const a = { layerA: 0, layerB: 90, layerC: 180 };
		expect(layoutDistance(a, a)).toBe(0);
	});

	it('returns 1 when all layers are in different bins', () => {
		const a = { layerA: 0, layerB: 30 };
		const b = { layerA: 180, layerB: 210 };
		expect(layoutDistance(a, b)).toBe(1);
	});

	it('returns 0.25 when 3/4 layers share bins', () => {
		const a = { layerA: 0, layerB: 90, layerC: 180, layerD: 270 };
		const b = { layerA: 5, layerB: 180, layerC: 185, layerD: 270 };
		expect(layoutDistance(a, b)).toBeCloseTo(0.25);
	});

	it('handles single-layer layouts', () => {
		const a = { layerA: 0 };
		const b = { layerA: 15 };
		expect(layoutDistance(a, b)).toBe(0);
	});

	it('is symmetric', () => {
		const a = { layerA: 10, layerB: 100 };
		const b = { layerA: 50, layerB: 200 };
		expect(layoutDistance(a, b)).toBe(layoutDistance(b, a));
	});

	it('normalizes angles before binning', () => {
		const a = { layerA: 0 };
		const b = { layerA: 360 };
		expect(layoutDistance(a, b)).toBe(0);
	});
});

describe('seededShuffle', () => {
	it('returns all elements', () => {
		const input = [1, 2, 3, 4, 5];
		const result = seededShuffle(input, 42);
		expect(result.sort()).toEqual(input.sort());
	});

	it('is deterministic for same seed', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(seededShuffle(input, 12345)).toEqual(seededShuffle(input, 12345));
	});

	it('produces different order for different seeds', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(seededShuffle(input, 12345)).not.toEqual(seededShuffle(input, 67890));
	});

	it('does not mutate the input array', () => {
		const input = [1, 2, 3, 4, 5];
		const copy = [...input];
		seededShuffle(input, 42);
		expect(input).toEqual(copy);
	});
});

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

	test('emits progress messages containing Solutions found', async () => {
		const progressMessages: string[] = [];

		await runBruteforceOptimizer(
			buildInput(twoLayers()),
			(progress) => {
				progressMessages.push(progress.message);
			},
			{ maxRuntimeMs: 1 }
		);

		expect(progressMessages.some((message) => message.includes('Solutions found'))).toBe(true);
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

	test('produces different results with different search seeds', async () => {
		const input = buildInput(threeLayers());
		const first = await runBruteforceOptimizer(input, undefined, {
			roundOutputAngles: false,
			maxRuntimeMs: 50
		});
		const second = await runBruteforceOptimizer(input, undefined, {
			roundOutputAngles: false,
			maxRuntimeMs: 50,
			searchSeed: 99999
		});
		expect(JSON.stringify(first.layout)).not.toEqual(JSON.stringify(second.layout));
	});

	test('returns a feasible layout with unique angles across all layers', async () => {
		const result = await runBruteforceOptimizer(buildInput(threeLayers()), undefined, {
			roundOutputAngles: false
		});

		const layoutAngles = Object.values(result.layout);
		expect(new Set(layoutAngles).size).toBe(layoutAngles.length);
	});

	test('creates optimizer svg template once and combines via template replacement', async () => {
		await runBruteforceOptimizer(buildInput(twoLayers()));

		expect(createOptimizerSvgTemplateMock).toHaveBeenCalledTimes(1);
		expect(combineOptimizerSvgTemplateMock).toHaveBeenCalled();
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

describe('addToTopLayouts', () => {
	it('adds a layout when under the limit', () => {
		const layouts: Record<string, number>[] = [];
		const candidate = { a: 0, b: 90, c: 180 };
		const result = addToTopLayouts(candidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(1);
		expect(layouts[0]).toEqual(candidate);
	});

	it('adds up to MAX_TOP_LAYOUTS layouts', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			const candidate = { a: 0, b: i * 30, c: (i * 30 + 120) % 360 };
			expect(addToTopLayouts(candidate, layouts)).toBe(true);
		}
		expect(layouts).toHaveLength(12);
	});

	it('replaces the worst layout by quality when candidate is better', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		const betterCandidate = { a: 0, b: 15, c: 195 }; // min gap 45
		const result = addToTopLayouts(betterCandidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(betterCandidate);
	});

	it('replaces a redundant layout when candidate is novel and quality is close', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		const novelCandidate = { a: 0, b: 179, c: 299 };
		const result = addToTopLayouts(novelCandidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(novelCandidate);
	});

	it('uses Phase 2 diversity path when quality is tied and candidate is more novel', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: 0, c: 120 });
		}
		const candidate = { a: 0, b: 0, c: 110 };
		const result = addToTopLayouts(candidate, layouts);
		expect(result).toBe(true);
		expect(layouts).toHaveLength(12);
		expect(layouts).toContainEqual(candidate);
	});

	it('does nothing when candidate is worse than all in a full list', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30 + 10, c: (i * 30 + 130) % 360 });
		}
		const snapshot = layouts.map((l) => ({ ...l }));
		const worseCandidate = { a: 0, b: 0, c: 0 };
		const result = addToTopLayouts(worseCandidate, layouts);
		expect(result).toBe(false);
		expect(layouts).toEqual(snapshot);
	});

	it('never exceeds MAX_TOP_LAYOUTS', () => {
		const layouts: Record<string, number>[] = [];
		for (let i = 0; i < 12; i++) {
			layouts.push({ a: 0, b: i * 30, c: (i * 30 + 120) % 360 });
		}
		addToTopLayouts({ a: 0, b: 45, c: 165 }, layouts);
		addToTopLayouts({ a: 0, b: 90, c: 210 }, layouts);
		expect(layouts.length).toBe(12);
	});

	it('does not mutate the input candidate', () => {
		const layouts: Record<string, number>[] = [];
		const candidate = { a: 0, b: 90, c: 180 };
		addToTopLayouts(candidate, layouts);
		layouts[0].b = 999;
		expect(candidate.b).toBe(90);
	});
});
