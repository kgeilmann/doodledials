import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const { createOptimizerSvgTemplateMock, combineOptimizerSvgTemplateMock, detectOverlapsMock } =
	vi.hoisted(() => ({
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
		detectOverlapsMock: vi.fn(
			async (
				_layers: Layer[],
				combinedSvg: string,
				options?: { pairCacheMode?: 'relative'; cache?: unknown }
			) => {
				void options;
				const rotations = JSON.parse(combinedSvg) as Record<string, number>;
				const [firstLayerId, secondLayerId] = Object.keys(rotations);
				const overlaps = new Map<string, Map<string, number>>();

				if (firstLayerId && secondLayerId && rotations[firstLayerId] <= rotations[secondLayerId]) {
					overlaps.set(firstLayerId, new Map([[secondLayerId, 10]]));
					overlaps.set(secondLayerId, new Map([[firstLayerId, 10]]));
				}

				return overlaps;
			}
		)
	}));

vi.mock('$lib/utils/doodledial', () => ({
	createOptimizerSvgTemplate: createOptimizerSvgTemplateMock,
	combineOptimizerSvgTemplate: combineOptimizerSvgTemplateMock
}));

vi.mock('$lib/utils/overlap-detection', () => ({
	detectOverlaps: detectOverlapsMock,
	createOverlapDetectionCache: () => ({
		bitmapByLayerAngle: new Map(),
		overlapByRelativePairAngles: new Map()
	})
}));

import {
	type OptimizerIterationSnapshot,
	OptimizerCancelledError,
	analyzeCircularGaps,
	calculateOverlapMagnitudeFromSharedPixels,
	calculateRestoringContributions,
	calculateRestoringForceMap,
	calculateUniqueContributions,
	calculateUniqueForceMap,
	runOptimizer
} from './run-optimizer';

describe('calculateOverlapMagnitudeFromSharedPixels', () => {
	test('returns zero below minimum overlap threshold', () => {
		expect(calculateOverlapMagnitudeFromSharedPixels(0)).toBe(0);
		expect(calculateOverlapMagnitudeFromSharedPixels(1)).toBe(0);
	});

	test('returns larger magnitude for larger overlap counts', () => {
		const small = calculateOverlapMagnitudeFromSharedPixels(2);
		const medium = calculateOverlapMagnitudeFromSharedPixels(10);
		const large = calculateOverlapMagnitudeFromSharedPixels(25);

		expect(small).toBeGreaterThan(0);
		expect(medium).toBeGreaterThan(small);
		expect(large).toBeGreaterThan(medium);
	});
});

describe('analyzeCircularGaps', () => {
	test('sorts by normalized angle and computes circular gaps including wrap-around', () => {
		const state = {
			layerA: 300,
			layerB: 20,
			layerC: 140
		};

		const analysis = analyzeCircularGaps(state, ['layerA', 'layerB', 'layerC']);

		expect(analysis.orderedLayerIds).toEqual(['layerB', 'layerC', 'layerA']);
		expect(analysis.idealGap).toBeCloseTo(120, 6);
		expect(analysis.gaps).toEqual([
			{ fromLayerId: 'layerB', toLayerId: 'layerC', gap: 120 },
			{ fromLayerId: 'layerC', toLayerId: 'layerA', gap: 160 },
			{ fromLayerId: 'layerA', toLayerId: 'layerB', gap: 80 }
		]);
	});

	test('returns a full-circle gap for a single layer', () => {
		const analysis = analyzeCircularGaps({ solo: 77 }, ['solo']);

		expect(analysis.orderedLayerIds).toEqual(['solo']);
		expect(analysis.idealGap).toBe(360);
		expect(analysis.gaps).toEqual([{ fromLayerId: 'solo', toLayerId: 'solo', gap: 360 }]);
	});
});

describe('calculateRestoringContributions', () => {
	test('returns finite numeric contributions for every layer id', () => {
		const state = {
			layerA: 300,
			layerB: 20,
			layerC: 140
		};

		const contributions = calculateRestoringContributions(state, ['layerA', 'layerB', 'layerC']);

		expect(Object.keys(contributions).sort()).toEqual(['layerA', 'layerB', 'layerC']);
		expect(Number.isFinite(contributions.layerA)).toBe(true);
		expect(Number.isFinite(contributions.layerB)).toBe(true);
		expect(Number.isFinite(contributions.layerC)).toBe(true);

		const total = contributions.layerA + contributions.layerB + contributions.layerC;
		expect(total).toBeCloseTo(0, 8);
	});

	test('returns zeroed map when there are fewer than two layers', () => {
		expect(calculateRestoringContributions({ solo: 123 }, ['solo'])).toEqual({ solo: 0 });
		expect(calculateRestoringContributions({}, [])).toEqual({});
	});
});

describe('calculateRestoringForceMap', () => {
	test('returns a zero-sum restoring map after clamp normalization', () => {
		const layerIds = ['layerA', 'layerB', 'layerC'];
		const restoringContributions = {
			layerA: 10,
			layerB: -1,
			layerC: -8
		};

		const forceMap = calculateRestoringForceMap(restoringContributions, layerIds);
		const total = layerIds.reduce((sum, layerId) => sum + forceMap[layerId], 0);

		expect(Number.isFinite(forceMap.layerA)).toBe(true);
		expect(Number.isFinite(forceMap.layerB)).toBe(true);
		expect(Number.isFinite(forceMap.layerC)).toBe(true);
		expect(total).toBeCloseTo(0, 8);
	});

	test('returns empty map for empty layer ids', () => {
		expect(calculateRestoringForceMap({}, [])).toEqual({});
	});
});

describe('calculateUniqueContributions', () => {
	test('returns zero contributions when all layers satisfy minimum separation', () => {
		const result = calculateUniqueContributions({ layerA: 0, layerB: 120, layerC: 240 }, [
			'layerA',
			'layerB',
			'layerC'
		]);

		expect(result).toEqual({ layerA: 0, layerB: 0, layerC: 0 });
	});

	test('applies opposite repulsive pushes when a pair is too close', () => {
		const result = calculateUniqueContributions({ layerA: 0, layerB: 2, layerC: 200 }, [
			'layerA',
			'layerB',
			'layerC'
		]);

		expect(result.layerA).toBeLessThan(0);
		expect(result.layerB).toBeGreaterThan(0);
		expect(result.layerC).toBe(0);
		expect(result.layerA + result.layerB + result.layerC).toBeCloseTo(0, 8);
	});
});

describe('calculateUniqueForceMap', () => {
	test('returns a zero-sum unique map after clamp normalization', () => {
		const layerIds = ['layerA', 'layerB', 'layerC'];
		const uniqueContributions = {
			layerA: 12,
			layerB: -12,
			layerC: 0
		};

		const forceMap = calculateUniqueForceMap(uniqueContributions, layerIds);
		const total = layerIds.reduce((sum, layerId) => sum + forceMap[layerId], 0);

		expect(Math.abs(forceMap.layerA)).toBeLessThanOrEqual(2);
		expect(Math.abs(forceMap.layerB)).toBeLessThanOrEqual(2);
		expect(Math.abs(forceMap.layerC)).toBeLessThanOrEqual(2);
		expect(total).toBeCloseTo(0, 8);
	});

	test('returns empty map for empty layer ids', () => {
		expect(calculateUniqueForceMap({}, [])).toEqual({});
	});
});

describe('runOptimizer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('rerenders updated svg snapshots and moves layers', async () => {
		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true }
		];

		const result = await runOptimizer({
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			},
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		});

		expect(createOptimizerSvgTemplateMock).toHaveBeenCalled();
		expect(combineOptimizerSvgTemplateMock).toHaveBeenCalled();
		expect(detectOverlapsMock).toHaveBeenCalled();

		const svgSnapshots = detectOverlapsMock.mock.calls.map(([, svg]) => svg);
		expect(svgSnapshots[0]).toBe('{"layerA":0,"layerB":0}');
		expect(new Set(svgSnapshots).size).toBeGreaterThan(1);

		expect(Number.isFinite(result.layout.layerA)).toBe(true);
		expect(Number.isFinite(result.layout.layerB)).toBe(true);
	});

	test('creates optimizer svg template once and combines via template replacement', async () => {
		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true }
		];

		await runOptimizer({
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			},
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		});

		expect(createOptimizerSvgTemplateMock).toHaveBeenCalledTimes(1);
		expect(combineOptimizerSvgTemplateMock).toHaveBeenCalled();
	});

	test('applies a deterministic exploration nudge when overlap probes cannot reduce pixels', async () => {
		detectOverlapsMock.mockImplementation(async () => {
			const overlaps = new Map<string, Map<string, number>>();
			overlaps.set('layerB', new Map([['layerC', 10]]));
			overlaps.set('layerC', new Map([['layerB', 10]]));
			return overlaps;
		});

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 0, visible: true }
		];

		try {
			const result = await runOptimizer({
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
					sizeToFit: true,
					centerHoleDiameter: 2,
					centerMarkType: 'hole',
					pathLabelFontSize: 10,
					titleFontFamily: 'sans-serif'
				},
				layers,
				svgContent: {
					raw: '<svg viewBox="0 0 200 200"></svg>',
					filename: 'fixture.svg'
				}
			});

			expect(Number.isFinite(result.layout.layerA)).toBe(true);
			expect(result.layout.layerB).not.toBe(0);
			expect(result.layout.layerC).not.toBe(0);
		} finally {
			detectOverlapsMock.mockImplementation(async (_layers: Layer[], combinedSvg: string) => {
				const rotations = JSON.parse(combinedSvg) as Record<string, number>;
				const [firstLayerId, secondLayerId] = Object.keys(rotations);
				const overlaps = new Map<string, Map<string, number>>();

				if (firstLayerId && secondLayerId && rotations[firstLayerId] <= rotations[secondLayerId]) {
					overlaps.set(firstLayerId, new Map([[secondLayerId, 10]]));
					overlaps.set(secondLayerId, new Map([[firstLayerId, 10]]));
				}

				return overlaps;
			});
		}
	});

	test('throws cancellation error when abort signal is already cancelled', async () => {
		const controller = new AbortController();
		controller.abort();

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true }
		];

		await expect(
			runOptimizer(
				{
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
						sizeToFit: true,
						centerHoleDiameter: 2,
						centerMarkType: 'hole',
						pathLabelFontSize: 10,
						titleFontFamily: 'sans-serif'
					} as const,
					layers,
					svgContent: {
						raw: '<svg viewBox="0 0 200 200"></svg>',
						filename: 'fixture.svg'
					}
				},
				undefined,
				{ signal: controller.signal }
			)
		).rejects.toBeInstanceOf(OptimizerCancelledError);
	});

	test('uses deterministic random initialization when seed is provided', async () => {
		detectOverlapsMock.mockImplementation(async () => new Map());

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 120, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 240, visible: true }
		];

		const input = {
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			} as const,
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		};

		try {
			const first = await runOptimizer(input, undefined, {
				initializeRandomly: true,
				randomSeed: 42,
				roundOutputAngles: false
			});
			const second = await runOptimizer(input, undefined, {
				initializeRandomly: true,
				randomSeed: 42,
				roundOutputAngles: false
			});

			expect(second.layout).toEqual(first.layout);
		} finally {
			detectOverlapsMock.mockImplementation(async (_layers: Layer[], combinedSvg: string) => {
				const rotations = JSON.parse(combinedSvg) as Record<string, number>;
				const [firstLayerId, secondLayerId] = Object.keys(rotations);
				const overlaps = new Map<string, Map<string, number>>();

				if (firstLayerId && secondLayerId && rotations[firstLayerId] <= rotations[secondLayerId]) {
					overlaps.set(firstLayerId, new Map([[secondLayerId, 10]]));
					overlaps.set(secondLayerId, new Map([[firstLayerId, 10]]));
				}

				return overlaps;
			});
		}
	});

	test('returns integer angles by default', async () => {
		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0.4, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0.6, visible: true }
		];

		const result = await runOptimizer({
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			},
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		});

		for (const angle of Object.values(result.layout)) {
			expect(Number.isInteger(angle)).toBe(true);
			expect(angle).toBeGreaterThanOrEqual(0);
			expect(angle).toBeLessThan(360);
		}
	});

	test('reduces worst circular gap deviation when no overlaps are present', async () => {
		detectOverlapsMock.mockImplementation(async () => new Map());

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 10, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 240, visible: true }
		];

		const input = {
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			} as const,
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		};

		const initialState = Object.fromEntries(layers.map((layer) => [layer.id, layer.rotation]));
		const initialAnalysis = analyzeCircularGaps(
			initialState as Record<string, number>,
			layers.map((layer) => layer.id)
		);
		const initialWorstDeviation = Math.max(
			...initialAnalysis.gaps.map((gap) => Math.abs(gap.gap - initialAnalysis.idealGap))
		);

		const result = await runOptimizer(input, undefined, { roundOutputAngles: false });

		const finalAnalysis = analyzeCircularGaps(
			result.layout,
			layers.map((layer) => layer.id)
		);
		const finalWorstDeviation = Math.max(
			...finalAnalysis.gaps.map((gap) => Math.abs(gap.gap - finalAnalysis.idealGap))
		);

		expect(finalWorstDeviation).toBeLessThan(initialWorstDeviation);
	});

	test('increases minimum circular gap when layers start too close and no overlaps are present', async () => {
		detectOverlapsMock.mockImplementation(async () => new Map());

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 1, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 220, visible: true }
		];

		const input = {
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
				sizeToFit: true,
				centerHoleDiameter: 2,
				centerMarkType: 'hole',
				pathLabelFontSize: 10,
				titleFontFamily: 'sans-serif'
			} as const,
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		};

		const initialState = Object.fromEntries(layers.map((layer) => [layer.id, layer.rotation]));
		const initialAnalysis = analyzeCircularGaps(
			initialState as Record<string, number>,
			layers.map((layer) => layer.id)
		);
		const initialMinGap = Math.min(...initialAnalysis.gaps.map((gap) => gap.gap));

		const result = await runOptimizer(input, undefined, { roundOutputAngles: false });

		const finalAnalysis = analyzeCircularGaps(
			result.layout,
			layers.map((layer) => layer.id)
		);
		const finalMinGap = Math.min(...finalAnalysis.gaps.map((gap) => gap.gap));

		expect(finalMinGap).toBeGreaterThan(initialMinGap);
	});

	test('scenario matrix: no-overlap clustered layout keeps overlap at zero and improves min gap', async () => {
		detectOverlapsMock.mockImplementation(async () => new Map());

		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 1, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 240, visible: true }
		];

		const snapshots: OptimizerIterationSnapshot[] = [];
		const result = await runOptimizer(
			{
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
					sizeToFit: true,
					centerHoleDiameter: 2,
					centerMarkType: 'hole',
					pathLabelFontSize: 10,
					titleFontFamily: 'sans-serif'
				},
				layers,
				svgContent: {
					raw: '<svg viewBox="0 0 200 200"></svg>',
					filename: 'fixture.svg'
				}
			},
			undefined,
			{
				roundOutputAngles: false,
				onIterationSnapshot: (snapshot) => snapshots.push(snapshot)
			}
		);

		const first = snapshots[0];
		const last = snapshots[snapshots.length - 1];
		expect(first.overlapAggregate).toBe(0);
		expect(last.overlapAggregate).toBe(0);
		expect(last.minimumGap).toBeGreaterThanOrEqual(first.minimumGap);

		const earlyAvg =
			snapshots
				.slice(0, Math.max(1, Math.floor(snapshots.length / 3)))
				.reduce((sum, s) => sum + s.averageForceMagnitude, 0) /
			Math.max(1, Math.floor(snapshots.length / 3));
		const lateSlice = snapshots.slice(-Math.max(1, Math.floor(snapshots.length / 3)));
		const lateAvg =
			lateSlice.reduce((sum, s) => sum + s.averageForceMagnitude, 0) / lateSlice.length;
		expect(lateAvg).toBeLessThanOrEqual(earlyAvg * 1.15);

		const finalAnalysis = analyzeCircularGaps(
			result.layout,
			layers.map((layer) => layer.id)
		);
		expect(Math.min(...finalAnalysis.gaps.map((gap) => gap.gap))).toBeGreaterThan(1);
	});

	test('scenario matrix: overlap-heavy layout does not worsen overlap aggregate by end', async () => {
		const layers: Layer[] = [
			{ id: 'layerA', index: 0, name: 'Layer A', rotation: 0, visible: true },
			{ id: 'layerB', index: 1, name: 'Layer B', rotation: 0, visible: true },
			{ id: 'layerC', index: 2, name: 'Layer C', rotation: 0, visible: true }
		];

		const snapshots: OptimizerIterationSnapshot[] = [];
		await runOptimizer(
			{
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
					sizeToFit: true,
					centerHoleDiameter: 2,
					centerMarkType: 'hole',
					pathLabelFontSize: 10,
					titleFontFamily: 'sans-serif'
				},
				layers,
				svgContent: {
					raw: '<svg viewBox="0 0 200 200"></svg>',
					filename: 'fixture.svg'
				}
			},
			undefined,
			{
				roundOutputAngles: false,
				onIterationSnapshot: (snapshot) => snapshots.push(snapshot)
			}
		);

		const first = snapshots[0];
		const last = snapshots[snapshots.length - 1];
		expect(last.overlapAggregate).toBeLessThanOrEqual(first.overlapAggregate);

		const earlyAvg =
			snapshots
				.slice(0, Math.max(1, Math.floor(snapshots.length / 3)))
				.reduce((sum, s) => sum + s.averageForceMagnitude, 0) /
			Math.max(1, Math.floor(snapshots.length / 3));
		const lateSlice = snapshots.slice(-Math.max(1, Math.floor(snapshots.length / 3)));
		const lateAvg =
			lateSlice.reduce((sum, s) => sum + s.averageForceMagnitude, 0) / lateSlice.length;
		expect(lateAvg).toBeLessThanOrEqual(earlyAvg * 1.2);
	});
});
