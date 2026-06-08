import { SVG, G, Path, Text, type Svg } from '@svgdotjs/svg.js';
import { svgPathProperties } from 'svg-path-properties';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { MM_TO_PX } from './constants';
import { labelToThreeShapes } from './export-label-glyphs';

export interface StlExportOptions {
	discThicknessMm?: number;
	markThicknessMm?: number;
	sampleStepPx?: number;
	discTitle?: string;
	discTitleX?: number;
	discTitleY?: number;
	discTitleFontSize?: number;
	raised?: boolean;
}

interface TransformOptions {
	cx: number;
	cy: number;
	scale: number;
	offsetXPx: number;
	offsetYPx: number;
	rotationDeg: number;
}

interface MmPoint {
	x: number;
	y: number;
}

function rotateAround(point: MmPoint, cx: number, cy: number, rotationDeg: number): MmPoint {
	if (rotationDeg === 0) {
		return point;
	}

	const angle = (rotationDeg * Math.PI) / 180;
	const dx = point.x - cx;
	const dy = point.y - cy;

	return {
		x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
		y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
	};
}

function transformPoint(point: MmPoint, options: TransformOptions): MmPoint {
	const scaled = {
		x: options.cx + (point.x - options.cx) * options.scale,
		y: options.cy + (point.y - options.cy) * options.scale
	};
	const translated = {
		x: scaled.x + options.offsetXPx,
		y: scaled.y + options.offsetYPx
	};
	return rotateAround(translated, options.cx, options.cy, options.rotationDeg);
}

function pxToMm(point: MmPoint, cx: number, cy: number, scale: number): THREE.Vector2 {
	return new THREE.Vector2((point.x - cx) * scale, (cy - point.y) * scale);
}

function toClosedPolygon(points: THREE.Vector2[]): THREE.Vector2[] {
	if (points.length < 3) {
		return [];
	}

	const result = points.slice();
	const firstPoint = result[0];
	const lastPoint = result[result.length - 1];
	if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y) {
		result.push(firstPoint.clone());
	}
	return result;
}

interface ElementTransform {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
}

function parseElementTransform(transformStr: string | undefined): ElementTransform | null {
	if (!transformStr) return null;

	const match = transformStr.match(/matrix\(([^)]+)\)/);
	if (!match) return null;

	const values = match[1].split(/[ ,]+/).map((v) => Number.parseFloat(v));
	if (values.length < 6) {
		return null;
	}

	return { a: values[0], b: values[1], c: values[2], d: values[3], e: values[4], f: values[5] };
}

function pathDataToPolygon(
	pathData: string,
	options: TransformOptions,
	sampleStepPx: number,
	viewboxToMmScale: number,
	elementTransform?: ElementTransform | null
): THREE.Vector2[] {
	const properties = new svgPathProperties(pathData);
	const length = properties.getTotalLength();
	if (length <= 0) {
		return [];
	}

	const stepCount = Math.max(12, Math.ceil(length / sampleStepPx));
	const points: THREE.Vector2[] = [];

	for (let index = 0; index <= stepCount; index += 1) {
		const sampleLength = (length * index) / stepCount;
		const point = properties.getPointAtLength(sampleLength);

		// Apply the SVG element's own transform first (normalization from parseSvgPaths)
		let pathPoint: MmPoint = { x: point.x, y: point.y };
		if (elementTransform) {
			pathPoint = {
				x: elementTransform.a * point.x + elementTransform.c * point.y + elementTransform.e,
				y: elementTransform.b * point.x + elementTransform.d * point.y + elementTransform.f
			};
		}

		const transformed = transformPoint(pathPoint, options);
		points.push(pxToMm(transformed, options.cx, options.cy, viewboxToMmScale));
	}

	return toClosedPolygon(points);
}

function lineToPolygon(
	start: MmPoint,
	end: MmPoint,
	widthMm: number,
	options: TransformOptions,
	viewboxToMmScale: number
): THREE.Vector2[] {
	const transformedStart = transformPoint(start, options);
	const transformedEnd = transformPoint(end, options);
	const startMm = pxToMm(transformedStart, options.cx, options.cy, viewboxToMmScale);
	const endMm = pxToMm(transformedEnd, options.cx, options.cy, viewboxToMmScale);

	const dx = endMm.x - startMm.x;
	const dy = endMm.y - startMm.y;
	const length = Math.hypot(dx, dy);
	if (length <= 0) {
		return [];
	}

	const unitX = dx / length;
	const unitY = dy / length;
	const normalX = -unitY;
	const normalY = unitX;
	const halfWidth = widthMm / 2;

	return [
		new THREE.Vector2(startMm.x + normalX * halfWidth, startMm.y + normalY * halfWidth),
		new THREE.Vector2(endMm.x + normalX * halfWidth, endMm.y + normalY * halfWidth),
		new THREE.Vector2(endMm.x - normalX * halfWidth, endMm.y - normalY * halfWidth),
		new THREE.Vector2(startMm.x - normalX * halfWidth, startMm.y - normalY * halfWidth)
	];
}

function pathPolygonToShape(points: THREE.Vector2[]): THREE.Shape | null {
	if (points.length < 3) {
		return null;
	}

	const uniquePoints = points.slice();
	const firstPoint = uniquePoints[0];
	const lastPoint = uniquePoints[uniquePoints.length - 1];
	if (firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y) {
		uniquePoints.pop();
	}

	if (uniquePoints.length < 3) {
		return null;
	}

	const shape = new THREE.Shape();
	shape.moveTo(uniquePoints[0].x, uniquePoints[0].y);
	for (let index = 1; index < uniquePoints.length; index += 1) {
		shape.lineTo(uniquePoints[index].x, uniquePoints[index].y);
	}
	shape.closePath();
	return shape;
}

function pointsToPath(points: THREE.Vector2[]): THREE.Path | null {
	const shape = pathPolygonToShape(points);
	if (!shape) {
		return null;
	}

	const path = new THREE.Path();
	path.moveTo(points[0].x, points[0].y);
	for (let index = 1; index < points.length; index += 1) {
		path.lineTo(points[index].x, points[index].y);
	}
	path.closePath();
	return path;
}

function collectLayerElements(doc: Svg, layer: Layer): G | null {
	return (doc.findOne(`#${layer.id}`) as G | null) ?? null;
}

function getLineAttribute(element: Path | Text, attributeName: 'x1' | 'y1' | 'x2' | 'y2'): number {
	const value = element.attr(attributeName);
	return typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));
}

function createDiscShape(
	radiusMm: number,
	holePolygons: THREE.Vector2[][],
	circularHolesMm: number[] = []
): THREE.Shape {
	const shape = new THREE.Shape();
	shape.absarc(0, 0, radiusMm, 0, Math.PI * 2, false);

	for (const holePolygon of holePolygons) {
		if (holePolygon.length < 3) {
			continue;
		}

		const hole = pointsToPath(holePolygon);
		if (hole) {
			shape.holes.push(hole);
		}
	}

	for (const holeRadius of circularHolesMm) {
		if (holeRadius > 0) {
			const hole = new THREE.Path();
			hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
			shape.holes.push(hole);
		}
	}

	return shape;
}

function extrudeShape(
	shape: THREE.Shape,
	depthMm: number,
	zOffsetMm: number,
	curveSegments = 64
): THREE.Mesh {
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: depthMm,
		steps: 1,
		bevelEnabled: false,
		curveSegments
	});
	geometry.translate(0, 0, zOffsetMm);
	return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
}

function labelShapesToExtrudedMeshes(
	shapes: THREE.Shape[],
	mapPoint: (point: THREE.Vector2) => THREE.Vector2,
	depthMm: number,
	zOffsetMm: number
): THREE.Mesh[] {
	const meshes: THREE.Mesh[] = [];
	for (const shape of shapes) {
		const points = shape.getPoints().map(mapPoint);
		const transformedShape = pathPolygonToShape(points);
		if (!transformedShape) continue;
		meshes.push(extrudeShape(transformedShape, depthMm, zOffsetMm));
	}
	return meshes;
}

function clampToDisc(points: THREE.Vector2[], maxRadiusMm: number): THREE.Vector2[] {
	const maxR = Math.max(maxRadiusMm, 0);
	return points.map((p) => {
		const dist = Math.hypot(p.x, p.y);
		if (dist > maxR && dist > 0) {
			const scale = maxR / dist;
			return new THREE.Vector2(p.x * scale, p.y * scale);
		}
		return p;
	});
}

function polygonToHolePath(points: THREE.Vector2[], maxRadiusMm?: number): THREE.Path | null {
	if (points.length < 3) return null;

	let pts = points.slice();
	if (maxRadiusMm !== undefined) {
		pts = clampToDisc(pts, maxRadiusMm);
	}
	const first = pts[0];
	const last = pts[pts.length - 1];
	if (first.x === last.x && first.y === last.y) {
		pts.pop();
	}
	if (pts.length < 3) return null;

	if (!THREE.ShapeUtils.isClockWise(pts)) {
		pts.reverse();
	}

	const path = new THREE.Path();
	path.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i++) {
		path.lineTo(pts[i].x, pts[i].y);
	}
	path.closePath();
	return path;
}

function labelShapesToHolePaths(
	shapes: THREE.Shape[],
	mapPoint: (point: THREE.Vector2) => THREE.Vector2,
	maxRadiusMm?: number
): THREE.Path[] {
	const paths: THREE.Path[] = [];
	for (const shape of shapes) {
		const points = shape.getPoints().map(mapPoint);
		const holePath = polygonToHolePath(points, maxRadiusMm);
		if (holePath) paths.push(holePath);
	}
	return paths;
}

export function exportStl(
	content: SVGContent,
	config: DialConfig,
	layers?: Layer[],
	options?: StlExportOptions
): string {
	const discThicknessMm = options?.discThicknessMm ?? 3;
	const markThicknessMm = options?.markThicknessMm ?? 0.5;
	const sampleStepPx = options?.sampleStepPx ?? 2;
	const raised = options?.raised ?? true;

	const doc = SVG(content.raw) as Svg;
	const viewbox = doc.viewbox();
	const cx = viewbox.cx;
	const cy = viewbox.cy;

	const discCircle = doc.findOne('#disc');
	const discCircleRadius = discCircle ? Number(discCircle.attr('r')) : 0;
	const discRadiusMm = config.diameter / 2;
	const viewboxToMmScale = discCircleRadius > 0 ? discRadiusMm / discCircleRadius : 1 / MM_TO_PX;

	const offsetViewboxX = config.offsetX / viewboxToMmScale;
	const offsetViewboxY = config.offsetY / viewboxToMmScale;
	const centerHoleRadiusMm = config.centerHoleDiameter / 2;

	const holePolygons: THREE.Vector2[][] = [];
	const topMeshes: THREE.Mesh[] = [];
	const recessPaths: THREE.Path[] = [];

	const activeLayers = layers ?? [];
	for (const layer of activeLayers) {
		const layerGroup = collectLayerElements(doc, layer);
		if (!layerGroup) {
			continue;
		}

		const rotationOnlyTransform: TransformOptions = {
			cx,
			cy,
			scale: 1,
			offsetXPx: 0,
			offsetYPx: 0,
			rotationDeg: layer.rotation
		};

		const cutoutTransform: TransformOptions = {
			cx,
			cy,
			scale: config.scale,
			offsetXPx: offsetViewboxX,
			offsetYPx: offsetViewboxY,
			rotationDeg: layer.rotation
		};

		layerGroup.find('.cutout').forEach((cutout) => {
			const d = cutout.attr('d');
			if (typeof d !== 'string' || d.length === 0) {
				return;
			}

			const transformRaw = cutout.attr('transform');
			const elemTransform = parseElementTransform(
				typeof transformRaw === 'string' ? transformRaw : undefined
			);

			const polygon = pathDataToPolygon(
				d,
				cutoutTransform,
				sampleStepPx,
				viewboxToMmScale,
				elemTransform
			);
			if (polygon.length >= 3) {
				holePolygons.push(polygon);
			}
		});

		layerGroup.find('.mark-line').forEach((markLine) => {
			const x1 = getLineAttribute(markLine as Path, 'x1');
			const y1 = getLineAttribute(markLine as Path, 'y1');
			const x2 = getLineAttribute(markLine as Path, 'x2');
			const y2 = getLineAttribute(markLine as Path, 'y2');
			const strokeWidthPx = Number.parseFloat(String(markLine.attr('stroke-width') ?? '2')) || 2;
			const widthMm = Math.max(strokeWidthPx * viewboxToMmScale, 0.25);
			const polygon = lineToPolygon(
				{ x: x1, y: y1 },
				{ x: x2, y: y2 },
				widthMm,
				rotationOnlyTransform,
				viewboxToMmScale
			);
			if (raised) {
				const shape = pathPolygonToShape(polygon);
				if (shape) {
					topMeshes.push(extrudeShape(shape, markThicknessMm, discThicknessMm));
				}
			} else {
				const holePath = polygonToHolePath(polygon, discRadiusMm - 0.1);
				if (holePath) {
					recessPaths.push(holePath);
				}
			}
		});

		layerGroup.find('.layer-label').forEach((labelElement) => {
			const text = labelElement as Text;
			const label = text.text().trim();
			const bbox = text.bbox();
			const shapes = labelToThreeShapes(label, {
				width: Math.max(bbox.width, 1),
				height: Math.max(bbox.height, 1)
			});

			const mapPoint = (point: THREE.Vector2) => {
				const transformed = transformPoint(
					{ x: bbox.x + point.x, y: bbox.y + point.y },
					rotationOnlyTransform
				);
				return new THREE.Vector2(
					(transformed.x - cx) * viewboxToMmScale,
					(cy - transformed.y) * viewboxToMmScale
				);
			};

			if (raised) {
				topMeshes.push(
					...labelShapesToExtrudedMeshes(shapes, mapPoint, markThicknessMm, discThicknessMm)
				);
			} else {
				recessPaths.push(...labelShapesToHolePaths(shapes, mapPoint, discRadiusMm - 0.1));
			}
		});

		layerGroup.find('.path-label').forEach((labelElement) => {
			const text = labelElement as Text;
			const label = text.text().trim();
			const bbox = text.bbox();
			const shapes = labelToThreeShapes(label, {
				width: Math.max(bbox.width, 1),
				height: Math.max(bbox.height, 1)
			});

			const mapPoint = (point: THREE.Vector2) => {
				const transformed = transformPoint(
					{
						x: bbox.x + point.x + (layer.labelOffsetX ?? 0),
						y: bbox.y + point.y + (layer.labelOffsetY ?? 0)
					},
					cutoutTransform
				);
				return new THREE.Vector2(
					(transformed.x - cx) * viewboxToMmScale,
					(cy - transformed.y) * viewboxToMmScale
				);
			};

			if (raised) {
				topMeshes.push(
					...labelShapesToExtrudedMeshes(shapes, mapPoint, markThicknessMm, discThicknessMm)
				);
			} else {
				recessPaths.push(...labelShapesToHolePaths(shapes, mapPoint, discRadiusMm - 0.1));
			}
		});
	}

	if (options?.discTitle) {
		const titleShapes = labelToThreeShapes(options.discTitle, {
			width: options.discTitle.length * (options.discTitleFontSize ?? 12) * 0.6,
			height: (options.discTitleFontSize ?? 12) * 1.2
		});

		const titleCenterX = (options.discTitleX ?? 100) - cx;
		const titleCenterY = (options.discTitleY ?? 20) - cy;

		const mapPoint = (point: THREE.Vector2) =>
			new THREE.Vector2(
				(titleCenterX + point.x) * viewboxToMmScale,
				(-titleCenterY - point.y) * viewboxToMmScale
			);

		if (raised) {
			topMeshes.push(
				...labelShapesToExtrudedMeshes(titleShapes, mapPoint, markThicknessMm, discThicknessMm)
			);
		} else {
			recessPaths.push(...labelShapesToHolePaths(titleShapes, mapPoint, discRadiusMm - 0.1));
		}
	}

	const discShape = createDiscShape(
		discRadiusMm,
		holePolygons,
		centerHoleRadiusMm > 0 ? [centerHoleRadiusMm] : []
	);

	const scene = new THREE.Scene();

	if (raised) {
		const discMesh = extrudeShape(discShape, discThicknessMm, 0);
		scene.add(discMesh);
		for (const mesh of topMeshes) {
			scene.add(mesh);
		}
	} else {
		const bottomThickness = Math.max(discThicknessMm - markThicknessMm, 0);
		if (bottomThickness > 0) {
			const bottomShape = createDiscShape(
				discRadiusMm,
				holePolygons,
				centerHoleRadiusMm > 0 ? [centerHoleRadiusMm] : []
			);
			scene.add(extrudeShape(bottomShape, bottomThickness, 0));
		}

		const topShape = createDiscShape(
			discRadiusMm,
			holePolygons,
			centerHoleRadiusMm > 0 ? [centerHoleRadiusMm] : []
		);
		for (const path of recessPaths) {
			topShape.holes.push(path);
		}
		scene.add(extrudeShape(topShape, Math.min(markThicknessMm, discThicknessMm), bottomThickness));
	}

	const exporter = new STLExporter();
	const stl = exporter.parse(scene, { binary: false }) as string;
	return stl.replace(/^solid\s+[^\n]+/, 'solid doodledial');
}
