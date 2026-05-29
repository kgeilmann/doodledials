export interface Point {
	x: number;
	y: number;
}

export interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Obb {
	center: Point;
	halfWidth: number;
	halfHeight: number;
	axes: [Point, Point];
	corners: [Point, Point, Point, Point];
}

export interface CreateObbInput {
	cx: number;
	cy: number;
	width: number;
	height: number;
	angleDeg: number;
}

const EPSILON = 1e-9;

function dot(a: Point, b: Point): number {
	return a.x * b.x + a.y * b.y;
}

function normalizeVector(v: Point): Point {
	const magnitude = Math.hypot(v.x, v.y);
	if (magnitude <= EPSILON) {
		return { x: 1, y: 0 };
	}

	return { x: v.x / magnitude, y: v.y / magnitude };
}

function projectPoints(points: readonly Point[], axis: Point): { min: number; max: number } {
	const unitAxis = normalizeVector(axis);
	let min = dot(points[0], unitAxis);
	let max = min;

	for (let index = 1; index < points.length; index++) {
		const value = dot(points[index], unitAxis);
		if (value < min) min = value;
		if (value > max) max = value;
	}

	return { min, max };
}

function distancePointToSegment(point: Point, start: Point, end: Point): number {
	const segmentDx = end.x - start.x;
	const segmentDy = end.y - start.y;
	const segmentLengthSquared = segmentDx * segmentDx + segmentDy * segmentDy;

	if (segmentLengthSquared <= EPSILON) {
		return Math.hypot(point.x - start.x, point.y - start.y);
	}

	const projectionRatio =
		((point.x - start.x) * segmentDx + (point.y - start.y) * segmentDy) / segmentLengthSquared;
	const clampedRatio = Math.max(0, Math.min(1, projectionRatio));
	const projectedX = start.x + clampedRatio * segmentDx;
	const projectedY = start.y + clampedRatio * segmentDy;

	return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function cross(origin: Point, a: Point, b: Point): number {
	return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function onSegment(point: Point, start: Point, end: Point): boolean {
	return (
		Math.min(start.x, end.x) - EPSILON <= point.x &&
		point.x <= Math.max(start.x, end.x) + EPSILON &&
		Math.min(start.y, end.y) - EPSILON <= point.y &&
		point.y <= Math.max(start.y, end.y) + EPSILON
	);
}

function segmentsIntersect(aStart: Point, aEnd: Point, bStart: Point, bEnd: Point): boolean {
	const c1 = cross(aStart, aEnd, bStart);
	const c2 = cross(aStart, aEnd, bEnd);
	const c3 = cross(bStart, bEnd, aStart);
	const c4 = cross(bStart, bEnd, aEnd);

	if (Math.abs(c1) <= EPSILON && onSegment(bStart, aStart, aEnd)) return true;
	if (Math.abs(c2) <= EPSILON && onSegment(bEnd, aStart, aEnd)) return true;
	if (Math.abs(c3) <= EPSILON && onSegment(aStart, bStart, bEnd)) return true;
	if (Math.abs(c4) <= EPSILON && onSegment(aEnd, bStart, bEnd)) return true;

	return c1 > EPSILON !== c2 > EPSILON && c3 > EPSILON !== c4 > EPSILON;
}

function pointInsideObb(obb: Obb, point: Point): boolean {
	const relative = { x: point.x - obb.center.x, y: point.y - obb.center.y };
	const axisX = normalizeVector(obb.axes[0]);
	const axisY = normalizeVector(obb.axes[1]);
	const localX = dot(relative, axisX);
	const localY = dot(relative, axisY);

	return (
		Math.abs(localX) <= obb.halfWidth + EPSILON && Math.abs(localY) <= obb.halfHeight + EPSILON
	);
}

export function createObb(input: CreateObbInput): Obb {
	const halfWidth = Math.abs(input.width) / 2;
	const halfHeight = Math.abs(input.height) / 2;
	const angleRad = (input.angleDeg * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);

	const axisX: Point = { x: cos, y: sin };
	const axisY: Point = { x: -sin, y: cos };
	const center: Point = { x: input.cx, y: input.cy };

	const localCorners: [Point, Point, Point, Point] = [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		{ x: halfWidth, y: halfHeight },
		{ x: -halfWidth, y: halfHeight }
	];

	const corners = localCorners.map((corner) => ({
		x: center.x + corner.x * axisX.x + corner.y * axisY.x,
		y: center.y + corner.x * axisX.y + corner.y * axisY.y
	})) as [Point, Point, Point, Point];

	return {
		center,
		halfWidth,
		halfHeight,
		axes: [axisX, axisY],
		corners
	};
}

export function obbOverlapsObb(a: Obb, b: Obb, padding = 0): boolean {
	const effectivePadding = Math.max(0, padding);
	const axes: Point[] = [a.axes[0], a.axes[1], b.axes[0], b.axes[1]];

	for (const axis of axes) {
		const aProjection = projectPoints(a.corners, axis);
		const bProjection = projectPoints(b.corners, axis);

		if (
			aProjection.max + effectivePadding < bProjection.min - effectivePadding - EPSILON ||
			bProjection.max + effectivePadding < aProjection.min - effectivePadding - EPSILON
		) {
			return false;
		}
	}

	return true;
}

export function obbDistanceToSegment(obb: Obb, segment: Segment): number {
	const segmentStart: Point = { x: segment.x1, y: segment.y1 };
	const segmentEnd: Point = { x: segment.x2, y: segment.y2 };

	if (pointInsideObb(obb, segmentStart) || pointInsideObb(obb, segmentEnd)) {
		return 0;
	}

	for (let index = 0; index < obb.corners.length; index++) {
		const edgeStart = obb.corners[index];
		const edgeEnd = obb.corners[(index + 1) % obb.corners.length];

		if (segmentsIntersect(segmentStart, segmentEnd, edgeStart, edgeEnd)) {
			return 0;
		}
	}

	let minimumDistance = Number.POSITIVE_INFINITY;

	for (let index = 0; index < obb.corners.length; index++) {
		const edgeStart = obb.corners[index];
		const edgeEnd = obb.corners[(index + 1) % obb.corners.length];
		minimumDistance = Math.min(
			minimumDistance,
			distancePointToSegment(segmentStart, edgeStart, edgeEnd),
			distancePointToSegment(segmentEnd, edgeStart, edgeEnd)
		);
	}

	for (const corner of obb.corners) {
		minimumDistance = Math.min(
			minimumDistance,
			distancePointToSegment(corner, segmentStart, segmentEnd)
		);
	}

	return minimumDistance;
}
