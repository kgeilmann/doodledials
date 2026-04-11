export function getAngleFromCenter(cx: number, cy: number, x: number, y: number): number {
	const dx = x - cx;
	const dy = y - cy;
	return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function getAngleFromElement(
	element: HTMLElement,
	clientX: number,
	clientY: number
): number {
	const rect = element.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	return getAngleFromCenter(cx, cy, clientX, clientY);
}

export function normalizeAngleDelta(delta: number): number {
	if (delta > 180) delta -= 360;
	if (delta < -180) delta += 360;
	return delta;
}

export function calculateAngleDelta(
	startX: number,
	startY: number,
	currentX: number,
	currentY: number,
	centerX: number,
	centerY: number
): number {
	const startAngle = getAngleFromCenter(centerX, centerY, startX, startY);
	const currentAngle = getAngleFromCenter(centerX, centerY, currentX, currentY);
	return normalizeAngleDelta(currentAngle - startAngle);
}
