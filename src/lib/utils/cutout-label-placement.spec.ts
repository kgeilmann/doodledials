import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Obb, Segment } from './label-geometry';
import { solveCutoutLabelPlacements } from './cutout-label-placement';
import { detectCutoutLabelOverlapPixels } from './overlap-detection';

vi.mock('./overlap-detection', () => ({
	detectCutoutLabelOverlapPixels: vi.fn(async () => 0)
}));

type SolveInput = Parameters<typeof solveCutoutLabelPlacements>[0];

const baseInput: SolveInput = {
	combinedSvg:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g id="layer-1" /><g id="layer-2" /><g id="layer-3" /></svg>',
	maxRadiusPx: 8,
	ringStepPx: 2,
	angleStepDeg: 45,
	layers: [
		{ id: 'layer-1', index: 1, rotation: 0, visible: true, labelPlacementMode: 'auto' },
		{ id: 'layer-2', index: 2, rotation: 0, visible: true, labelPlacementMode: 'auto' },
		{ id: 'layer-3', index: 3, rotation: 0, visible: true, labelPlacementMode: 'auto' }
	],
	pathAnchors: {
		'layer-1': { x: 20, y: 20 },
		'layer-2': { x: 80, y: 20 },
		'layer-3': { x: 140, y: 20 }
	},
	labelSizeByLayerId: {
		'layer-1': { width: 8, height: 4 },
		'layer-2': { width: 8, height: 4 },
		'layer-3': { width: 8, height: 4 }
	},
	markLines: [],
	markLabelObbs: [],
	alreadyPlacedLabelObbs: [],
	labelPaddingPx: 0.5,
	markLineClearancePx: 1,
	visibleLayerIds: ['layer-1', 'layer-2', 'layer-3']
};

function createAxisAlignedObb(cx: number, cy: number, width: number, height: number): Obb {
	const halfWidth = width / 2;
	const halfHeight = height / 2;

	return {
		center: { x: cx, y: cy },
		halfWidth,
		halfHeight,
		axes: [
			{ x: 1, y: 0 },
			{ x: 0, y: 1 }
		],
		corners: [
			{ x: cx - halfWidth, y: cy - halfHeight },
			{ x: cx + halfWidth, y: cy - halfHeight },
			{ x: cx + halfWidth, y: cy + halfHeight },
			{ x: cx - halfWidth, y: cy + halfHeight }
		]
	};
}

describe('solveCutoutLabelPlacements', () => {
	beforeEach(() => {
		vi.mocked(detectCutoutLabelOverlapPixels).mockClear();
		vi.mocked(detectCutoutLabelOverlapPixels).mockResolvedValue(0);
	});

	it('places auto labels in deterministic layer order', async () => {
		const result = await solveCutoutLabelPlacements(baseInput);

		expect(Object.keys(result.byLayerId)).toEqual(['layer-1', 'layer-2', 'layer-3']);
		expect(result.byLayerId['layer-1'].status).toEqual({ status: 'placed' });
		expect(result.byLayerId['layer-2'].status).toEqual({ status: 'placed' });
		expect(result.byLayerId['layer-3'].status).toEqual({ status: 'placed' });
	});

	it('uses ring-based candidates and finds the next ring when center candidate is blocked', async () => {
		const markLines: Segment[] = [{ x1: 19, y1: 19, x2: 21, y2: 21 }];

		const result = await solveCutoutLabelPlacements({
			...baseInput,
			layers: [baseInput.layers[0]],
			pathAnchors: { 'layer-1': { x: 20, y: 20 } },
			labelSizeByLayerId: { 'layer-1': { width: 2, height: 2 } },
			markLines,
			maxRadiusPx: 4,
			markLineClearancePx: 0.1
		});

		const offsetX = result.byLayerId['layer-1'].offsetX;
		const offsetY = result.byLayerId['layer-1'].offsetY;
		expect(Math.hypot(offsetX, offsetY)).toBeCloseTo(2);
		expect(result.byLayerId['layer-1'].status).toEqual({ status: 'placed' });
	});

	it('short-circuits before raster check when candidate fails an earlier check', async () => {
		const result = await solveCutoutLabelPlacements({
			...baseInput,
			layers: [baseInput.layers[0]],
			pathAnchors: { 'layer-1': { x: 20, y: 20 } },
			maxRadiusPx: 0,
			alreadyPlacedLabelObbs: [createAxisAlignedObb(20, 20, 10, 6)]
		});

		expect(result.byLayerId['layer-1'].status).toEqual({
			status: 'error',
			reason: 'no-valid-position-within-radius'
		});
		expect(vi.mocked(detectCutoutLabelOverlapPixels)).not.toHaveBeenCalled();
	});

	it('returns error when no candidate exists within max radius', async () => {
		vi.mocked(detectCutoutLabelOverlapPixels).mockResolvedValue(1);

		const result = await solveCutoutLabelPlacements({
			...baseInput,
			layers: [baseInput.layers[0]],
			pathAnchors: { 'layer-1': { x: 100, y: 100 } },
			maxRadiusPx: 2,
			markLines: [],
			markLabelObbs: [],
			alreadyPlacedLabelObbs: []
		});

		expect(result.byLayerId['layer-1'].status).toEqual({
			status: 'error',
			reason: 'no-valid-position-within-radius'
		});
	});
});
