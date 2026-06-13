export type LabelPlacementMode = 'auto' | 'manual';

export type LabelPlacementStatus =
	| { status: 'placed' }
	| { status: 'error'; reason: 'no-valid-position-within-radius' };

export interface Layer {
	id: string;
	name: string;
	index: number;
	visible: boolean;
	rotation: number;
	labelOffsetX?: number;
	labelOffsetY?: number;
	labelPlacementMode?: LabelPlacementMode;
	labelPlacementStatus?: LabelPlacementStatus;
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
	sizeToFit: boolean;
	centerHoleDiameter: number;
	optimizerGapMm?: number;
	pathLabelFontSize: number;
	titleFontFamily: string;
}

export interface SVGContent {
	raw: string;
	filename: string;
}

export const DEFAULT_DIAL_CONFIG = {
	diameter: 200,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	sizeToFit: true,
	centerHoleDiameter: 2,
	optimizerGapMm: 2,
	pathLabelFontSize: 10,
	titleFontFamily: 'sans-serif'
} as const satisfies DialConfig;
