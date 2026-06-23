export type CenterStyle = 'hole' | 'crosshair' | 'none';

export type LabelPlacementMode = 'auto' | 'manual';

export type LabelPlacementStatus =
	| { status: 'placed' }
	| { status: 'error'; reason: 'no-valid-position-within-radius' };

export interface LayerGroup {
	id: string;
	name: string;
	color: string;
}

export interface Layer {
	id: string;
	name: string;
	index: number;
	groupId: string;
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
	centerStyle: CenterStyle;
	solverGapMm?: number;
	cutoutLabelFontSize: number;
	titleFontFamily: string;
}

export interface SVGContent {
	raw: string;
	filename: string;
}

export const DEFAULT_DIAL_CONFIG = {
	diameter: 100,
	minDiameter: 50,
	maxDiameter: 200,
	borderWidth: 2,
	padding: 0.05,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	sizeToFit: false,
	centerHoleDiameter: 0.1,
	centerStyle: 'hole',
	solverGapMm: 2,
	cutoutLabelFontSize: 10,
	titleFontFamily: 'sans-serif'
} as const satisfies DialConfig;
