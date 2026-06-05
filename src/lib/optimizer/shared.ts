import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';

export interface OptimizerInput {
	diameter: number;
	config: DialConfig;
	layers: Layer[];
	svgContent: SVGContent;
}
