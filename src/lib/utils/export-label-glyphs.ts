import * as THREE from 'three';
import { FontLoader, type FontData } from 'three/examples/jsm/loaders/FontLoader.js';
import helvetikerData from 'three/examples/fonts/helvetiker_regular.typeface.json';

const font = new FontLoader().parse(helvetikerData as FontData);

export interface LabelGlyphLayout {
	width: number;
	height: number;
}

const SHAPE_DIVISIONS = 16;

function getBounds(shapes: THREE.Shape[]): {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
} {
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;

	for (const shape of shapes) {
		for (const p of shape.getPoints(SHAPE_DIVISIONS)) {
			if (p.x < minX) minX = p.x;
			if (p.x > maxX) maxX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.y > maxY) maxY = p.y;
		}
		for (const hole of shape.holes) {
			for (const p of hole.getPoints(SHAPE_DIVISIONS)) {
				if (p.x < minX) minX = p.x;
				if (p.x > maxX) maxX = p.x;
				if (p.y < minY) minY = p.y;
				if (p.y > maxY) maxY = p.y;
			}
		}
	}

	return { minX, maxX, minY, maxY };
}

function transformPoints(
	points: THREE.Vector2[],
	minX: number,
	maxY: number,
	scale: number
): THREE.Vector2[] {
	const result: THREE.Vector2[] = [];
	for (const p of points) {
		result.push(new THREE.Vector2((p.x - minX) * scale, (maxY - p.y) * scale));
	}
	return result;
}

function pointsToShape(outer: THREE.Vector2[], holes: THREE.Vector2[][]): THREE.Shape {
	const shape = new THREE.Shape();
	shape.moveTo(outer[0].x, outer[0].y);
	for (let i = 1; i < outer.length; i++) {
		shape.lineTo(outer[i].x, outer[i].y);
	}
	shape.closePath();

	for (const holePts of holes) {
		if (holePts.length < 3) continue;
		const path = new THREE.Path();
		path.moveTo(holePts[0].x, holePts[0].y);
		for (let i = 1; i < holePts.length; i++) {
			path.lineTo(holePts[i].x, holePts[i].y);
		}
		path.closePath();
		shape.holes.push(path);
	}

	return shape;
}

function shapesToSvgPath(shapes: THREE.Shape[], minX: number, maxY: number, scale: number): string {
	let pathData = '';
	for (const shape of shapes) {
		const outer = transformPoints(shape.getPoints(SHAPE_DIVISIONS), minX, maxY, scale);
		if (outer.length < 2) continue;

		pathData += `M ${outer[0].x} ${outer[0].y}`;
		for (let i = 1; i < outer.length; i++) {
			pathData += ` L ${outer[i].x} ${outer[i].y}`;
		}
		pathData += ' Z ';

		for (const hole of shape.holes) {
			const hPts = transformPoints(hole.getPoints(SHAPE_DIVISIONS), minX, maxY, scale);
			if (hPts.length < 2) continue;
			pathData += `M ${hPts[0].x} ${hPts[0].y}`;
			for (let i = 1; i < hPts.length; i++) {
				pathData += ` L ${hPts[i].x} ${hPts[i].y}`;
			}
			pathData += ' Z ';
		}
	}
	return pathData.trim();
}

export function labelToSvgStrokePath(label: string, layout: LabelGlyphLayout): string {
	if (!label) return '';

	const shapes = font.generateShapes(label, 100);
	if (shapes.length === 0) return '';

	const { minX, maxX, minY, maxY } = getBounds(shapes);
	const fontWidth = maxX - minX;
	const fontHeight = maxY - minY;

	if (fontWidth <= 0 || fontHeight <= 0) return '';

	const scale = Math.min(layout.width / fontWidth, layout.height / fontHeight);
	return shapesToSvgPath(shapes, minX, maxY, scale);
}

export function labelToThreeShapes(label: string, layout: LabelGlyphLayout): THREE.Shape[] {
	if (!label) return [];

	const generated = font.generateShapes(label, 100);
	if (generated.length === 0) return [];

	const { minX, maxX, minY, maxY } = getBounds(generated);
	const fontWidth = maxX - minX;
	const fontHeight = maxY - minY;

	if (fontWidth <= 0 || fontHeight <= 0) return [];

	const scale = Math.min(layout.width / fontWidth, layout.height / fontHeight);

	const result: THREE.Shape[] = [];
	for (const shape of generated) {
		const outer = transformPoints(shape.getPoints(SHAPE_DIVISIONS), minX, maxY, scale);
		const holes = shape.holes.map((hole) =>
			transformPoints(hole.getPoints(SHAPE_DIVISIONS), minX, maxY, scale)
		);

		try {
			result.push(pointsToShape(outer, holes));
		} catch {
			// skip degenerate shapes
		}
	}

	return result;
}

export function estimateLabelStrokeWidth(height: number): number {
	return Math.max(height * 0.14, 0.6);
}

export function getLabelBounds(layout: LabelGlyphLayout): { width: number; height: number } {
	return { width: layout.width, height: layout.height };
}
