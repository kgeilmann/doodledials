function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function calculateCircularVariance(angles: number[]): number {
	if (angles.length < 2) return 0;

	const anglesRad = angles.map((a) => toRadians(a));
	const vectors = anglesRad.map((a) => ({ x: Math.cos(a), y: Math.sin(a) }));

	const xBar = vectors.reduce((sum, v) => sum + v.x, 0) / angles.length;
	const yBar = vectors.reduce((sum, v) => sum + v.y, 0) / angles.length;

	const R = Math.sqrt(xBar * xBar + yBar * yBar);
	return 1 - R;
}

export function calculateScore(angles: number[]): number {
	const variance = calculateCircularVariance(angles);
	return 1 - variance;
}
