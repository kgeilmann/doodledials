export interface Layer {
	id: string;
	name: string;
	index: number;
	visible: boolean;
	rotation: number;
	labelOffsetX?: number;
	labelOffsetY?: number;
}

export interface DialConfig {
	diameter: number;
	minDiameter: number;
	maxDiameter: number;
	borderWidth: number;
	padding: number;
	offsetX: number;
	offsetY: number;
	scale: number;
}

export interface SVGContent {
	raw: string;
	filename: string;
}

export const DEFAULT_DIAL_CONFIG: DialConfig = {
	diameter: 200,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1
};
