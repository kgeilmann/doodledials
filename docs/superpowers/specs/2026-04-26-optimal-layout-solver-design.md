# Optimal Layout Solver Design

## Overview

This document describes the design for an optimal layout solver for doodledials that arranges SVG layers to minimize overlap while respecting constraints on gaps, rotation uniqueness, and minimum angular separation.

## Problem Statement

Given a set of SVG layers loaded into a doodledial, the solver must:

1. Ensure 0 overlap between any pair of layers
2. Ensure no gaps below 2mm between layers
3. Ensure each layer has a unique rotation angle
4. Ensure any two layers are at least 2 degrees apart in rotation
5. Only adjust rotation values (no x/y translation allowed)

## Approach: Force-Directed with Rotation-Only Constraints

We'll use a force-directed approach adapted for rotation-only adjustments:

- Treat each layer as an object that exerts forces on other layers
- Forces are calculated based on overlap and gap violations
- Layers "repel" each other when too close (overlap or gap < 2mm)
- Layers experience torque based on rotational forces
- System evolves toward equilibrium where forces balance
- Additional constraints enforced through penalty functions

## Detailed Design

### Data Structures

```typescript
interface SolverLayer {
	id: string;
	name: string;
	index: number;
	visible: boolean;
	rotation: number; // in degrees
	labelOffsetX?: number;
	labelOffsetY?: number;
	// Calculated properties
	boundingBox: { x1: number; y1: number; x2: number; y2: number };
	center: { x: number; y: number };
}

interface SolverState {
	layers: SolverLayer[];
	dialConfig: DialConfig;
	svgContent: SVGContent;
	iteration: number;
	totalForce: number;
	converged: boolean;
}
```

### Force Calculation

For each pair of layers (i, j):

1. Calculate overlap amount using existing overlap detection
2. Calculate gap distance (positive = gap, negative = overlap)
3. Compute repulsive force:
   - If overlap > 0: force proportional to overlap magnitude
   - If 0 < gap < 2mm: force proportional to (2mm - gap)
   - If gap >= 2mm: no force from gap/overlap
4. Add angular separation constraint:
   - If |rotation_i - rotation_j| < 2°: add rotational force to increase separation
5. Force direction:
   - Positive force increases layer j's rotation relative to layer i
   - Negative force decreases layer j's rotation relative to layer i

### Algorithm

1. Initialize solver state from current layers and dial config
2. While not converged and iteration < maxIterations:
   a. Reset forces on all layers
   b. For each pair of layers:
   i. Calculate overlap/gap using renderLayersToBitmaps
   ii. Compute forces and torques
   iii. Apply forces to update rotation velocities
   c. Apply damping to velocities (velocity _= 0.9)
   d. Update rotations: rotation += velocity _ timestep
   e. Enforce constraints:
   i. Keep rotations in [0, 360) range
   ii. Apply penalty for duplicate rotations
   e. Check convergence:
   i. Total force < threshold
   ii. No overlap violations
   iii. All gaps >= 2mm
   iv. All rotations unique and separated by >= 2°
   f. Increment iteration
3. Return final layer rotations

### Parameters

- Timestep: 0.1 degrees per unit force per iteration
- Damping factor: 0.9 per iteration
- Force scaling:
  - Overlap force: overlap_amount \* 10 degrees/mm²
  - Gap force: (2mm - gap) \* 5 degrees/mm (when gap < 2mm)
  - Angular force: (2° - |Δrotation|) \* 2 degrees/degree (when |Δrotation| < 2°)
- Max iterations: 1000
- Convergence threshold: total force < 0.01 degrees

### Integration Points

- New file: `src/lib/utils/layout-solver.ts`
- Exported function: `solveOptimalLayout(layers: Layer[], config: DialConfig, svgContent: SVGContent): Promise<Layer[]>`
- Will be called from UI when user requests "optimize layout"
- Progress reporting via callback for long-running solves

### Error Handling

- Returns original layers if solver fails to converge
- Throws error if SVG rendering fails
- Validates input layers have unique IDs

### Performance Considerations

- Uses existing overlap detection which renders to bitmaps
- Caches bitmap renders when layers unchanged between iterations
- Limits to max 1000 iterations
- Web Worker consideration for UI responsiveness (future enhancement)

### Testing Strategy

1. Unit tests for force calculations
2. Integration tests with known layer configurations
3. Visual verification using existing test fixtures
4. Edge cases: single layer, many layers, impossible configurations
