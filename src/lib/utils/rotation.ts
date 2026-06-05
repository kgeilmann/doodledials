export function getAngleFromCenter(cx: number, cy: number, x: number, y: number): number {
	const dx = x - cx;
	const dy = y - cy;
	return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function normalizeAngle(angle: number): number {
	return ((angle % 360) + 360) % 360;
}

export function roundLayoutAngles(layout: Record<string, number>): Record<string, number> {
	return Object.fromEntries(
		Object.entries(layout).map(([layerId, angle]) => [
			layerId,
			Math.round(normalizeAngle(angle)) % 360
		])
	);
}
