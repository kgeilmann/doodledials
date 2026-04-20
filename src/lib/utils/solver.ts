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

const MIN_ANGLE_DIFF = 2;

export function hasUniqueAngles(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	const unique = new Set(angles.map((a) => Math.round(a)));
	return unique.size === angles.length;
}

export function hasMinAngleDifference(rotations: Map<string, number>): boolean {
	const angles = Array.from(rotations.values());
	for (let i = 0; i < angles.length; i++) {
		for (let j = i + 1; j < angles.length; j++) {
			const diff = Math.abs(angles[i] - angles[j]);
			const minDiff = Math.min(diff, 360 - diff);
			if (minDiff < MIN_ANGLE_DIFF) {
				return false;
			}
		}
	}
	return true;
}

export function satisfiesAngleConstraints(rotations: Map<string, number>): boolean {
	return hasUniqueAngles(rotations) && hasMinAngleDifference(rotations);
}
