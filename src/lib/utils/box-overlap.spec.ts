import { describe, it, expect } from 'vitest';

function boxesOverlap(
	a: { x: number; y: number; width: number; height: number },
	b: { x: number; y: number; width: number; height: number }
): boolean {
	return !(
		a.x + a.width <= b.x ||
		b.x + b.width <= a.x ||
		a.y + a.height <= b.y ||
		b.y + b.height <= a.y
	);
}

describe('boxesOverlap', () => {
	it('returns false for non-overlapping boxes (side by side)', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 })
		).toBe(false);
	});

	it('returns false for non-overlapping boxes (one above)', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 20, width: 10, height: 10 })
		).toBe(false);
	});

	it('returns true for overlapping boxes', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })
		).toBe(true);
	});

	it('returns false for touching edges (horizontal)', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })
		).toBe(false);
	});

	it('returns false for touching edges (vertical)', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 10, width: 10, height: 10 })
		).toBe(false);
	});

	it('returns true for one box inside another', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 20, height: 20 }, { x: 5, y: 5, width: 10, height: 10 })
		).toBe(true);
	});

	it('returns true for partial horizontal overlap', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 0, width: 10, height: 10 })
		).toBe(true);
	});

	it('returns true for partial vertical overlap', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 5, width: 10, height: 10 })
		).toBe(true);
	});

	it('returns true for identical boxes', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 10, height: 10 })
		).toBe(true);
	});

	it('returns false for boxes at diagonal (no overlap)', () => {
		expect(
			boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 })
		).toBe(false);
	});
});
