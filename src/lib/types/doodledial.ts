export interface Layer {
	id: string;
	name: string;
	visible: boolean;
	svgElementId: string;
	rotation: number;
}

export interface DialConfig {
	diameter: number;
	minDiameter: number;
	maxDiameter: number;
	defaultDiameter: number;
	borderWidth: number;
	padding: number;
}

export interface SVGContent {
	raw: string;
	filename: string;
}

export interface DoodledialState {
	config: DialConfig;
	svgContent: SVGContent | null;
	combinedSvg: string | null;
	isLoading: boolean;
	error: string | null;
	layers: Layer[];
	highlightedLayer: string | null;
}

export const DEFAULT_DIAL_CONFIG: DialConfig = {
	diameter: 100,
	minDiameter: 50,
	maxDiameter: 200,
	defaultDiameter: 100,
	borderWidth: 2,
	padding: 0.05
};
