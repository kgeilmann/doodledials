import { describe, expect, it } from 'vitest';
import { createObb, obbDistanceToSegment, obbOverlapsObb } from './label-geometry';

describe('label geometry', () => {
	it('detects OBB overlap', () => {
		const a = createObb({ cx: 10, cy: 10, width: 8, height: 4, angleDeg: 20 });
		const b = createObb({ cx: 13, cy: 10, width: 8, height: 4, angleDeg: -15 });

		expect(obbOverlapsObb(a, b, 0.5)).toBe(true);
	});

	it('rejects non-overlapping OBBs', () => {
		const a = createObb({ cx: 10, cy: 10, width: 8, height: 4, angleDeg: 0 });
		const b = createObb({ cx: 40, cy: 40, width: 8, height: 4, angleDeg: 0 });

		expect(obbOverlapsObb(a, b, 0.5)).toBe(false);
	});

	it('detects clearance breach against mark segment', () => {
		const obb = createObb({ cx: 20, cy: 20, width: 10, height: 6, angleDeg: 30 });
		const dist = obbDistanceToSegment(obb, { x1: 18, y1: 15, x2: 18, y2: 30 });

		expect(dist).toBeLessThan(2);
	});
});
