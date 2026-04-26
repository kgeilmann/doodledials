import { describe, it, expect } from 'vitest';
import type { SolverLayer } from '../layout-solver-types';
import { applyConstraints } from '../layout-solver-constraints';

describe('Constraint Enforcement', () => {
	it('should normalize rotations to [0, 360)', () => {
		const layers: SolverLayer[] = [
			{
				id: '1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 450,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: -90,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			}
		];

		applyConstraints(layers);

		expect(layers[0].rotation).toBe(90); // 450 % 360 = 90
		expect(layers[1].rotation).toBe(270); // (-90 % 360 + 360) % 360 = 270
	});

	it('should ensure unique rotations', () => {
		const layers: SolverLayer[] = [
			{
				id: '1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 45,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 45, // Same as layer 1
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '3',
				name: 'Layer 3',
				index: 2,
				visible: true,
				rotation: 135,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			}
		];

		applyConstraints(layers);

		// All rotations should be unique
		const rotations = layers.map((layer) => layer.rotation);
		const uniqueRotations = new Set(rotations);
		expect(uniqueRotations.size).toBe(rotations.length);
	});

	it('should ensure minimum 2-degree separation', () => {
		const layers: SolverLayer[] = [
			{
				id: '1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 0,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 1, // Too close to layer 1 (only 1 degree apart)
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '3',
				name: 'Layer 3',
				index: 2,
				visible: true,
				rotation: 90,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			}
		];

		applyConstraints(layers);

		// Check that all pairs have at least 2 degrees separation
		for (let i = 0; i < layers.length; i++) {
			for (let j = i + 1; j < layers.length; j++) {
				const diff = Math.abs(layers[i].rotation - layers[j].rotation);
				const circularDiff = Math.min(diff, 360 - diff);
				expect(circularDiff).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it('should handle edge cases with wraparound', () => {
		const layers: SolverLayer[] = [
			{
				id: '1',
				name: 'Layer 1',
				index: 0,
				visible: true,
				rotation: 359,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '2',
				name: 'Layer 2',
				index: 1,
				visible: true,
				rotation: 0, // Should be 2 degrees away from 359 (wraparound)
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			},
			{
				id: '3',
				name: 'Layer 3',
				index: 2,
				visible: true,
				rotation: 180,
				boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
				center: { x: 50, y: 50 },
				velocity: 0
			}
		];

		applyConstraints(layers);

		// Check separation between layer 1 (359) and layer 2 (should be adjusted from 0)
		const diff1 = Math.abs(layers[0].rotation - layers[1].rotation);
		const circularDiff1 = Math.min(diff1, 360 - diff1);
		expect(circularDiff1).toBeGreaterThanOrEqual(2);
	});
});
