import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SolverLayer } from '../layout-solver-types';
import type { SVGContent } from '../../types/doodledial';
import { calculateForces } from '../layout-solver-forces';
import { detectOverlaps, detectCutoutGaps } from '../overlap-detection';

describe('calculateForces', () => {
	let mockLayers: SolverLayer[];
	let mockSvgContent: SVGContent;

	beforeEach(() => {
		mockLayers = [
			{
				id: 'layer1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 0,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: 'layer2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 90,
				boundingBox: { x1: 150, y1: 0, x2: 250, y2: 100 },
				center: { x: 200, y: 50 },
				velocity: 0
			}
		];

		mockSvgContent = {
			raw: '<svg></svg>',
			filename: 'test.svg'
		};

		// Mock the overlap detection functions
		vi.mock('../overlap-detection');
	});

	it('should return zero forces for less than 2 layers', async () => {
		const result = await calculateForces([mockLayers[0]], mockSvgContent);
		expect(result.forces).toEqual([0]);
		expect(result.totalForce).toBe(0);
	});

	it('should calculate forces when there are overlaps', async () => {
		// Mock overlap detection to return overlaps
		vi.mocked(detectOverlaps).mockResolvedValue(
			new Map([
				['layer1', new Map([['layer2', 1]])],
				['layer2', new Map([['layer1', 1]])]
			])
		);

		// Mock gap detection to return no gaps
		vi.mocked(detectCutoutGaps).mockResolvedValue(new Map());

		const result = await calculateForces(mockLayers, mockSvgContent);

		// Expect forces to be applied
		expect(result.forces[0]).toBeGreaterThan(0); // layer1 should get positive force
		expect(result.forces[1]).toBeLessThan(0); // layer2 should get negative force

		// Total force should be sum of absolute values
		expect(result.totalForce).toBe(Math.abs(result.forces[0]) + Math.abs(result.forces[1]));
	});

	it('should calculate forces when there are gap violations', async () => {
		// Mock overlap detection to return no overlaps
		vi.mocked(detectOverlaps).mockResolvedValue(new Map());

		// Mock gap detection to return gaps (layers too close)
		vi.mocked(detectCutoutGaps).mockResolvedValue(
			new Map([
				['layer1', new Set(['layer2'])],
				['layer2', new Set(['layer1'])]
			]) as Map<string, Set<string>>
		);

		const result = await calculateForces(mockLayers, mockSvgContent);

		// Expect forces to be applied for gap violations
		expect(result.forces[0]).toBeGreaterThan(0); // layer1 should get positive force
		expect(result.forces[1]).toBeLessThan(0); // layer2 should get negative force

		// Total force should be sum of absolute values
		expect(result.totalForce).toBe(Math.abs(result.forces[0]) + Math.abs(result.forces[1]));
	});

	it('should calculate angular separation forces when layers are too close angularly', async () => {
		// Set layers to have similar rotations (less than 2 degrees apart)
		mockLayers[0].rotation = 0;
		mockLayers[1].rotation = 1; // Only 1 degree apart

		// Mock overlap and gap detection to return nothing
		vi.mocked(detectOverlaps).mockResolvedValue(new Map());
		vi.mocked(detectCutoutGaps).mockResolvedValue(new Map());

		const result = await calculateForces(mockLayers, mockSvgContent);

		// Expect forces to be applied for angular separation
		// The exact values depend on the force calculation, but there should be some force
		expect(result.totalForce).toBeGreaterThan(0);
	});

	it('should apply weak attractive force for distant layers', async () => {
		// Position layers far apart
		mockLayers[0].center = { x: 0, y: 0 };
		mockLayers[1].center = { x: 200, y: 200 }; // Far apart

		// Mock overlap and gap detection to return nothing
		vi.mocked(detectOverlaps).mockResolvedValue(new Map());
		vi.mocked(detectCutoutGaps).mockResolvedValue(new Map());

		const result = await calculateForces(mockLayers, mockSvgContent);

		expect(result.totalForce).toBeGreaterThan(0);
		// The exact behavior depends on the distance threshold
	});
});
