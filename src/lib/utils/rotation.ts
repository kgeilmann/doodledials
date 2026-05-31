export function getAngleFromCenter(cx: number, cy: number, x: number, y: number): number {
	const dx = x - cx;
	const dy = y - cy;
	return Math.atan2(dy, dx) * (180 / Math.PI);
}
