// Import the types we need from existing files
import type { Layer } from '../types/doodledial';
import type { DialConfig, SVGContent } from '../types/doodledial';

export interface SolverLayer {
	id: string;
	name: string;
	index: number;
	visible: boolean;
	rotation: number; // in degrees
	labelOffsetX?: number;
	labelOffsetY?: number;
	// Calculated properties for .cutout paths only
	boundingBox: { x1: number; y1: number; x2: number; y2: number };
	center: { x: number; y: number };
	velocity: number; // rotation velocity
}

export interface SolverState {
	layers: SolverLayer[];
	dialConfig: DialConfig;
	svgContent: SVGContent;
	iteration: number;
	totalForce: number;
	converged: boolean;
}

export type { Layer };
