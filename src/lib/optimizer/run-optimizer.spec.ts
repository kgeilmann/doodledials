import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

const { combineDoodledialMock, detectOverlapsMock } = vi.hoisted(() => ({
	combineDoodledialMock: vi.fn((_content: SVGContent, _config: DialConfig, layers: Layer[] = []) =>
		JSON.stringify(Object.fromEntries(layers.map((layer) => [layer.id, layer.rotation])))
	),
	detectOverlapsMock: vi.fn(async (_layers: Layer[], combinedSvg: string) => {
		const rotations = JSON.parse(combinedSvg) as Record<string, number>;
		const [firstLayerId, secondLayerId] = Object.keys(rotations);
		const overlaps = new Map<string, Map<string, number>>();

		if (firstLayerId && secondLayerId && rotations[firstLayerId] <= rotations[secondLayerId]) {
			overlaps.set(firstLayerId, new Map([[secondLayerId, 10]]));
			overlaps.set(secondLayerId, new Map([[firstLayerId, 10]]));
		}

		return overlaps;
	})
}));

vi.mock('$lib/utils/doodledial', () => ({
	combineDoodledial: combineDoodledialMock
}));

vi.mock('$lib/utils/overlap-detection', () => ({
	detectOverlaps: detectOverlapsMock
}));

import { OptimizerCancelledError, runOptimizer } from './run-optimizer';

describe('runOptimizer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('rerenders updated svg snapshots and moves layers using overlap force only', async () => {
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
				scale: 1
			},
			layers,
			svgContent: {
				raw: '<svg viewBox="0 0 200 200"></svg>',
				filename: 'fixture.svg'
			}
		});

		expect(combineDoodledialMock).toHaveBeenCalled();
		expect(detectOverlapsMock).toHaveBeenCalled();

		const svgSnapshots = detectOverlapsMock.mock.calls.map(([, svg]) => svg);
		expect(svgSnapshots[0]).toBe('{"layerA":0,"layerB":0}');
		expect(new Set(svgSnapshots).size).toBeGreaterThan(1);

		expect(result.layout.layerA).toBeGreaterThan(0);
		expect(result.layout.layerB).toBe(0);
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
					scale: 1
				},
				layers,
				svgContent: {
					raw: '<svg viewBox="0 0 200 200"></svg>',
					filename: 'fixture.svg'
				}
			});

			expect(result.layout.layerA).toBe(0);
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
						scale: 1
					},
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
});
