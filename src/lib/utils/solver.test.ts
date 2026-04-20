import { describe, it, expect } from 'vitest';
import { calculateCircularVariance, calculateScore } from './solver';

describe('calculateCircularVariance', () => {
	it('returns 0 for identical angles', () => {
		const variance = calculateCircularVariance([0, 0, 0]);
		expect(variance).toBe(0);
	});

	it('returns lower variance for clustered angles', () => {
		const clustered = calculateCircularVariance([0, 1, 2]);
		const spread = calculateCircularVariance([0, 120, 240]);
		expect(clustered).toBeLessThan(spread);
	});
});

describe('calculateScore', () => {
	it('returns higher score for clustered angles', () => {
		const clustered = calculateScore([0, 0, 0]);
		const spread = calculateScore([0, 120, 240]);
		expect(clustered).toBeGreaterThan(spread);
	});
});
