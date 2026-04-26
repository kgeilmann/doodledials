import { describe, it, expect } from 'vitest';
import type { SolverLayer, SolverState, Layer } from '../layout-solver-types';

describe('Solver Types', () => {
	it('should create a valid SolverLayer', () => {
		const layer: SolverLayer = {
			id: 'test-layer',
			name: 'Test Layer',
			index: 0,
			visible: true,
			rotation: 45,
			boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
			center: { x: 50, y: 50 },
			velocity: 0
		};

		expect(layer.id).toBe('test-layer');
		expect(layer.rotation).toBe(45);
		expect(layer.boundingBox.x2).toBe(100);
	});

	it('should create a valid SolverState', () => {
		const layer: SolverLayer = {
			id: 'test-layer',
			name: 'Test Layer',
			index: 0,
			visible: true,
			rotation: 45,
			boundingBox: { x1: 0, y1: 0, x2: 100, y2: 100 },
			center: { x: 50, y: 50 },
			velocity: 0
		};

		const state: SolverState = {
			layers: [layer],
			dialConfig: {
				diameter: 200,
				minDiameter: 50,
				maxDiameter: 200,
				borderWidth: 2,
				padding: 0.05,
				offsetX: 0,
				offsetY: 0,
				scale: 1
			},
			svgContent: {
				raw: '<svg></svg>',
				filename: 'test.svg'
			},
			iteration: 0,
			totalForce: 0,
			converged: false
		};

		expect(state.layers.length).toBe(1);
		expect(state.dialConfig.diameter).toBe(200);
		expect(state.iteration).toBe(0);
	});

	it('should import Layer type correctly', () => {
		// This test verifies that the Layer type is properly exported
		const layer: Layer = {
			id: 'test',
			name: 'Test',
			index: 0,
			visible: true,
			rotation: 0
		};

		expect(layer).toBeDefined();
	});
});
