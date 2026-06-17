import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import type { OptimizerSvgTemplate } from '$lib/utils/doodledial';

export interface OptimizerInput {
	diameter: number;
	config: DialConfig;
	layers: Layer[];
	svgContent: SVGContent;
	groups?: { id: string; color: string }[];
	hiddenLayerIds?: string[];
}

export interface OptimizerProgress {
	percent: number;
	message: string;
	iteration: number;
	totalIterations: number;
	feasibleSolutionsFound?: number;
	topLayouts?: Record<string, number>[];
	optimizerSvgTemplate?: OptimizerSvgTemplate;
}
