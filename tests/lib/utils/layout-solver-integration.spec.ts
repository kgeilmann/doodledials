import { describe, it, expect } from 'vitest';
import { solveOptimalLayout } from '$lib/utils/layout-solver';
import type { Layer } from '$lib/types/doodledial';
import type { DialConfig } from '$lib/types/doodledial';
import type { SVGContent } from '$lib/types/doodledial';

describe('layout solver integration', () => {
	it('resolves simple overlap case', async () => {
		// Create test layers that would overlap if not rotated
		const layers: Layer[] = [
			{
				id: 'layer1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 0, // 0 degrees
				labelOffsetX: 0,
				labelOffsetY: 0
			},
			{
				id: 'layer2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 0, // Same rotation - would cause overlap
				labelOffsetX: 0,
				labelOffsetY: 0
			}
		];

		const config: DialConfig = {
			diameter: 200,
			minDiameter: 50,
			maxDiameter: 200,
			borderWidth: 2,
			padding: 0.05,
			offsetX: 0,
			offsetY: 0,
			scale: 1
		};

		const svgContent: SVGContent = {
			raw: '<svg></svg>',
			filename: 'test.svg'
		};

		// Solve the layout
		const result = await solveOptimalLayout(layers, config, svgContent);

		// Should return layers with different rotations to avoid overlap
		expect(result.length).toBe(2);
		expect(result[0].rotation).not.toBe(result[1].rotation);

		// Rotations should be normalized to [0, 360)
		expect(result[0].rotation).toBeGreaterThanOrEqual(0);
		expect(result[0].rotation).toBeLessThan(360);
		expect(result[1].rotation).toBeGreaterThanOrEqual(0);
		expect(result[1].rotation).toBeLessThan(360);
	});
});
