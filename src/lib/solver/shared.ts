import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import type { SolverSvgTemplate } from '$lib/utils/doodledial';

export interface SolverInput {
	diameter: number;
	config: DialConfig;
	layers: Layer[];
	svgContent: SVGContent;
	groups?: { id: string; color: string }[];
	hiddenLayerIds?: string[];
}

export interface SolverProgress {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
	feasibleSolutionsFound?: number;
	topLayouts?: Record<string, number>[];
	solverSvgTemplate?: SolverSvgTemplate;
}
