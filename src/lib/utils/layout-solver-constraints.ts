import type { SolverLayer } from './layout-solver-types';

export function applyConstraints(layers: SolverLayer[]): void {
	// Normalize rotations to [0, 360)
	for (const layer of layers) {
		layer.rotation = ((layer.rotation % 360) + 360) % 360;
	}

	// Sort layers by rotation to make it easier to enforce constraints
	layers.sort((a, b) => a.rotation - b.rotation);

	// Ensure uniqueness and minimum separation
	const minSeparation = 2; // degrees

	for (let i = 0; i < layers.length; i++) {
		// Check against previous layers to ensure uniqueness and minimum separation
		for (let j = 0; j < i; j++) {
			let diff = Math.abs(layers[i].rotation - layers[j].rotation);
			// Handle circular nature (e.g., 359 and 1 degrees are 2 degrees apart)
			diff = Math.min(diff, 360 - diff);

			if (diff < minSeparation) {
				// Adjust the current layer to be at least minSeparation away
				// We'll move it away from the conflicting layer
				const direction = layers[i].rotation > layers[j].rotation ? 1 : -1;
				layers[i].rotation = layers[j].rotation + direction * minSeparation;

				// Renormalize after adjustment
				layers[i].rotation = ((layers[i].rotation % 360) + 360) % 360;

				// Reset inner loop to recheck against all previous layers
				// since our adjustment might have caused new conflicts
				j = -1;
			}
		}
	}

	// Final normalization pass
	for (const layer of layers) {
		layer.rotation = ((layer.rotation % 360) + 360) % 360;
	}
}
