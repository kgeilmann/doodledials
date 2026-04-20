import { describe, it, expect } from 'vitest';
import {
	calculateCircularVariance,
	calculateScore,
	hasUniqueAngles,
	hasMinAngleDifference,
	satisfiesAngleConstraints
} from './solver';

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

describe('hasUniqueAngles', () => {
	it('returns true for unique angles', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(hasUniqueAngles(rotations)).toBe(true);
	});

	it('returns false for duplicate angles', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 0],
			['layer-3', 180]
		]);
		expect(hasUniqueAngles(rotations)).toBe(false);
	});
});

describe('hasMinAngleDifference', () => {
	it('returns true when all pairs differ by at least 2 degrees', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(hasMinAngleDifference(rotations)).toBe(true);
	});

	it('returns false when any pair is within 2 degrees', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 1],
			['layer-3', 180]
		]);
		expect(hasMinAngleDifference(rotations)).toBe(false);
	});
});

describe('satisfiesAngleConstraints', () => {
	it('returns true for valid rotations', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 90],
			['layer-3', 180]
		]);
		expect(satisfiesAngleConstraints(rotations)).toBe(true);
	});

	it('returns false for duplicates', () => {
		const rotations = new Map([
			['layer-1', 0],
			['layer-2', 0],
			['layer-3', 180]
		]);
		expect(satisfiesAngleConstraints(rotations)).toBe(false);
	});
});
