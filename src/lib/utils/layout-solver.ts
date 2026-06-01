import type { SolverLayer } from './layout-solver-types';
import { calculateForces } from './layout-solver-forces';
import { applyConstraints } from './layout-solver-constraints';
import type { Layer } from '$lib/types/doodledial';
import type { DialConfig } from '$lib/types/doodledial';
import type { SVGContent } from '$lib/types/doodledial';

const MAX_ITERATIONS = 1000;
const CONVERGENCE_THRESHOLD = 0.01;
const DAMPING_FACTOR = 0.9;
const TIMESTEP = 0.1;

export async function solveOptimalLayout(
	layers: Layer[],
	config: DialConfig,
	svgContent: SVGContent
): Promise<Layer[]> {
	// Handle edge cases
	if (layers.length === 0) {
		return layers;
	}

	console.log(`[Layout Solver] Starting optimization for ${layers.length} layers`);

	// Convert to solver layers
	const solverLayers: SolverLayer[] = layers.map((layer) => ({
		...layer,
		velocity: 0,
		// For now, we'll use dummy bounding boxes and centers
		// In a full implementation, these would be calculated from .cutout paths
		boundingBox: { x1: 0, y1: 0, x2: 0, y2: 0 },
		center: { x: 0, y: 0 }
	}));

	// Main solver loop
	let lastTotalForce = 0;
	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
		// Calculate forces based on current layer positions/rotations
		const { forces, totalForce } = await calculateForces(solverLayers, svgContent);
		lastTotalForce = totalForce;

		// Update velocities with damping
		for (let i = 0; i < solverLayers.length; i++) {
			solverLayers[i].velocity = (solverLayers[i].velocity + forces[i] * TIMESTEP) * DAMPING_FACTOR;
		}

		// Apply velocity to rotations
		for (let i = 0; i < solverLayers.length; i++) {
			solverLayers[i].rotation += solverLayers[i].velocity;
		}

		// Apply constraints (normalization, uniqueness, minimum separation)
		applyConstraints(solverLayers);

		// Log progress every 50 iterations or when converged
		if (iteration % 50 === 0 || totalForce < CONVERGENCE_THRESHOLD) {
			console.log(
				`[Layout Solver] Iteration ${iteration}/${MAX_ITERATIONS}, Total Force: ${totalForce.toFixed(6)}`
			);
		}

		// Check for convergence AFTER applying forces and constraints
		if (totalForce < CONVERGENCE_THRESHOLD) {
			console.log(
				`[Layout Solver] Converged after ${iteration + 1} iterations with total force: ${totalForce.toFixed(6)}`
			);
			// Convert back to Layer format and return
			return solverLayers.map((solverLayer, index) => ({
				id: solverLayer.id,
				name: solverLayer.name,
				index: solverLayer.index,
				visible: solverLayer.visible,
				rotation: solverLayer.rotation,
				labelOffsetX: layers[index].labelOffsetX,
				labelOffsetY: layers[index].labelOffsetY
			}));
		}
	}

	// If we reach max iterations, apply constraints and return anyway
	console.log(
		`[Layout Solver] Reached maximum iterations (${MAX_ITERATIONS}) with final total force: ${lastTotalForce.toFixed(6)}`
	);
	applyConstraints(solverLayers);

	// Convert back to Layer format
	return solverLayers.map((solverLayer, index) => ({
		id: solverLayer.id,
		name: solverLayer.name,
		index: solverLayer.index,
		visible: solverLayer.visible,
		rotation: solverLayer.rotation,
		labelOffsetX: layers[index].labelOffsetX,
		labelOffsetY: layers[index].labelOffsetY
	}));
}
