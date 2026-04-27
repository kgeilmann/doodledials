import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Layer } from '../../types/doodledial';
import type { SVGContent } from '../../types/doodledial';
import type { DialConfig } from '../../types/doodledial';
import { solveOptimalLayout } from '../layout-solver';
import { calculateForces } from '../layout-solver-forces';

// Mock the dependencies we need to control
vi.mock('../layout-solver-forces', () => ({
	calculateForces: vi.fn()
}));

describe('solveOptimalLayout', () => {
	let mockLayers: Layer[];
	let mockConfig: DialConfig;
	let mockSvgContent: SVGContent;

	beforeEach(() => {
		mockLayers = [
			{
				id: 'layer1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 0,
				labelOffsetX: 0,
				labelOffsetY: 0
			},
			{
				id: 'layer2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 90,
				labelOffsetX: 0,
				labelOffsetY: 0
			}
		];

		mockConfig = {
			diameter: 200,
			minDiameter: 50,
			maxDiameter: 200,
			borderWidth: 2,
			padding: 0.05,
			offsetX: 0,
			offsetY: 0,
			scale: 1
		};

		mockSvgContent = {
			raw: '<svg></svg>',
			filename: 'test.svg'
		};

		// Reset mocks
		vi.resetAllMocks();
		// Default mock for calculateForces: return zero forces
		vi.mocked(calculateForces).mockResolvedValue({ forces: [0, 0], totalForce: 0 });
	});

	it('should return empty array for no layers', async () => {
		const result = await solveOptimalLayout([], mockConfig, mockSvgContent);
		expect(result).toEqual([]);
	});

	it('should return normalized single layer', async () => {
		const singleLayer = [{ ...mockLayers[0], rotation: 370 }]; // 370 should become 10
		// For single layer, calculateForces will be called with one layer
		vi.mocked(calculateForces).mockResolvedValue({ forces: [0], totalForce: 0 });
		const result = await solveOptimalLayout(singleLayer, mockConfig, mockSvgContent);
		expect(result.length).toBe(1);
		expect(result[0].rotation).toBe(10); // 370 % 360 = 10
	});

	it('should call calculateForces in solver loop', async () => {
		// Mock calculateForces to return different values on consecutive calls
		vi.mocked(calculateForces)
			.mockResolvedValueOnce({ forces: [0.1, -0.1], totalForce: 0.2 }) // First call
			.mockResolvedValueOnce({ forces: [0, 0], totalForce: 0 }); // Second call (converged)

		await solveOptimalLayout(mockLayers, mockConfig, mockSvgContent);

		expect(vi.mocked(calculateForces)).toHaveBeenCalledTimes(2);
	});

	it('should return layers with updated rotations', async () => {
		// Mock calculateForces to return some forces that will cause convergence in one iteration
		vi.mocked(calculateForces).mockResolvedValue({ forces: [0.5, -0.5], totalForce: 0.005 }); // Below threshold

		const result = await solveOptimalLayout(mockLayers, mockConfig, mockSvgContent);

		expect(result.length).toBe(2);
		// Calculate expected values:
		// Initial rotation + (force * timestep) * damping factor
		// For layer 0: 0 + (0.5 * 0.1) * 0.9 = 0 + 0.05 * 0.9 = 0.045
		// For layer 1: 90 + (-0.5 * 0.1) * 0.9 = 90 - 0.05 * 0.9 = 90 - 0.045 = 89.955
		expect(result[0].rotation).toBeCloseTo(0.045, 5);
		expect(result[1].rotation).toBeCloseTo(89.955, 5);
	});
});
