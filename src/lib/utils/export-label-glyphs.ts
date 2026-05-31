import * as THREE from 'three';

export interface LabelGlyphLayout {
	width: number;
	height: number;
	strokeWidth?: number;
	digitGap?: number;
}

type Point = {
	x: number;
	y: number;
};

type SegmentName = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

interface SegmentDefinition {
	start: Point;
	end: Point;
}

const BASE_DIGIT_WIDTH = 10;
const BASE_DIGIT_HEIGHT = 18;

const DIGIT_SEGMENTS: Record<number, SegmentName[]> = {
	0: ['a', 'b', 'c', 'd', 'e', 'f'],
	1: ['b', 'c'],
	2: ['a', 'b', 'g', 'e', 'd'],
	3: ['a', 'b', 'g', 'c', 'd'],
	4: ['f', 'g', 'b', 'c'],
	5: ['a', 'f', 'g', 'c', 'd'],
	6: ['a', 'f', 'g', 'e', 'c', 'd'],
	7: ['a', 'b', 'c'],
	8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
	9: ['a', 'b', 'c', 'd', 'f', 'g']
};

const DIGIT_SEGMENT_DEFINITIONS: Record<SegmentName, SegmentDefinition> = {
	a: { start: { x: 1, y: 1 }, end: { x: 9, y: 1 } },
	b: { start: { x: 9, y: 1.5 }, end: { x: 9, y: 8.5 } },
	c: { start: { x: 9, y: 9.5 }, end: { x: 9, y: 16.5 } },
	d: { start: { x: 1, y: 17 }, end: { x: 9, y: 17 } },
	e: { start: { x: 1, y: 9.5 }, end: { x: 1, y: 16.5 } },
	f: { start: { x: 1, y: 1.5 }, end: { x: 1, y: 8.5 } },
	g: { start: { x: 1, y: 9 }, end: { x: 9, y: 9 } }
};

function normalizeLabel(label: string): string {
	const digits = label.replace(/\D+/g, '');
	return digits.length > 0 ? digits : '0';
}

function getLabelLayout(
	label: string,
	layout: LabelGlyphLayout
): {
	label: string;
	count: number;
	digitWidth: number;
	digitHeight: number;
	digitGap: number;
	strokeWidth: number;
} {
	const normalized = normalizeLabel(label);
	const count = normalized.length;
	const digitGap = layout.digitGap ?? Math.max(layout.width * 0.12, 1);
	const digitWidth = count > 0 ? (layout.width - digitGap * (count - 1)) / count : layout.width;
	const digitHeight = layout.height;
	const strokeWidth = layout.strokeWidth ?? Math.max(layout.height * 0.14, 0.6);

	return {
		label: normalized,
		count,
		digitWidth,
		digitHeight,
		digitGap,
		strokeWidth
	};
}

function scalePoint(
	point: Point,
	scaleX: number,
	scaleY: number,
	offsetX: number,
	offsetY: number
): Point {
	return {
		x: point.x * scaleX + offsetX,
		y: point.y * scaleY + offsetY
	};
}

function segmentPointsToLinePath(start: Point, end: Point): string {
	return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

function segmentPointsToPolygon(start: Point, end: Point, thickness: number): THREE.Vector2[] {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy);
	if (length === 0) {
		return [];
	}

	const unitX = dx / length;
	const unitY = dy / length;
	const normalX = -unitY;
	const normalY = unitX;
	const halfThickness = thickness / 2;

	return [
		new THREE.Vector2(start.x + normalX * halfThickness, start.y + normalY * halfThickness),
		new THREE.Vector2(end.x + normalX * halfThickness, end.y + normalY * halfThickness),
		new THREE.Vector2(end.x - normalX * halfThickness, end.y - normalY * halfThickness),
		new THREE.Vector2(start.x - normalX * halfThickness, start.y - normalY * halfThickness)
	];
}

function buildDigitGeometry(
	digit: number,
	layout: Required<LabelGlyphLayout>,
	index: number
): {
	pathSegments: string[];
	polygons: THREE.Vector2[][];
} {
	const segments = DIGIT_SEGMENTS[digit] ?? DIGIT_SEGMENTS[0];
	const segmentThickness = Math.max(layout.strokeWidth, 0.6);
	const scaleX = layout.width / BASE_DIGIT_WIDTH;
	const scaleY = layout.height / BASE_DIGIT_HEIGHT;
	const digitOriginX = index * (layout.width + layout.digitGap);

	const pathSegments: string[] = [];
	const polygons: THREE.Vector2[][] = [];

	for (const segmentName of segments) {
		const definition = DIGIT_SEGMENT_DEFINITIONS[segmentName];
		const start = scalePoint(definition.start, scaleX, scaleY, digitOriginX, 0);
		const end = scalePoint(definition.end, scaleX, scaleY, digitOriginX, 0);
		pathSegments.push(segmentPointsToLinePath(start, end));
		polygons.push(segmentPointsToPolygon(start, end, segmentThickness));
	}

	return { pathSegments, polygons };
}

export function labelToSvgStrokePath(label: string, layout: LabelGlyphLayout): string {
	const normalized = normalizeLabel(label);
	const preparedLayout = getLabelLayout(normalized, layout);
	const pathSegments: string[] = [];

	for (let index = 0; index < preparedLayout.count; index += 1) {
		const digit = Number.parseInt(preparedLayout.label[index] ?? '0', 10);
		const digitGeometry = buildDigitGeometry(
			digit,
			{
				width: preparedLayout.digitWidth,
				height: preparedLayout.digitHeight,
				strokeWidth: preparedLayout.strokeWidth,
				digitGap: preparedLayout.digitGap
			},
			index
		);
		pathSegments.push(...digitGeometry.pathSegments);
	}

	return pathSegments.join(' ');
}

export function labelToThreeShapes(label: string, layout: LabelGlyphLayout): THREE.Shape[] {
	const normalized = normalizeLabel(label);
	const preparedLayout = getLabelLayout(normalized, layout);
	const shapes: THREE.Shape[] = [];

	for (let index = 0; index < preparedLayout.count; index += 1) {
		const digit = Number.parseInt(preparedLayout.label[index] ?? '0', 10);
		const digitGeometry = buildDigitGeometry(
			digit,
			{
				width: preparedLayout.digitWidth,
				height: preparedLayout.digitHeight,
				strokeWidth: preparedLayout.strokeWidth,
				digitGap: preparedLayout.digitGap
			},
			index
		);

		for (const polygon of digitGeometry.polygons) {
			if (polygon.length < 3) {
				continue;
			}

			const shape = new THREE.Shape();
			shape.moveTo(polygon[0].x, polygon[0].y);
			for (let polygonIndex = 1; polygonIndex < polygon.length; polygonIndex += 1) {
				shape.lineTo(polygon[polygonIndex].x, polygon[polygonIndex].y);
			}
			shape.closePath();
			shapes.push(shape);
		}
	}

	return shapes;
}

export function estimateLabelStrokeWidth(height: number): number {
	return Math.max(height * 0.14, 0.6);
}

export function getLabelBounds(layout: LabelGlyphLayout): { width: number; height: number } {
	const count = Math.max(1, normalizeLabel('0').length);
	const digitGap = layout.digitGap ?? Math.max(layout.width * 0.12, 1);
	const width = layout.width;
	const height = layout.height;

	return {
		width: width * count + digitGap * (count - 1),
		height
	};
}
