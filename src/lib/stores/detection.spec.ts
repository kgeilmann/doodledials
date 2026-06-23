import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createDetectionStore } from './detection.svelte';

const { mockOverlapResult, mockGapResult, testLayers } = vi.hoisted(() => {
	const mockOverlapResult = new Map<string, Map<string, number>>();
	const mockGapResult = new Map<string, Set<string>>();
	const testLayers = [
		{ id: 'a', name: 'A', index: 1, visible: true, rotation: 0, groupId: '' },
		{ id: 'b', name: 'B', index: 2, visible: true, rotation: 0, groupId: '' }
	];
	return { mockOverlapResult, mockGapResult, testLayers };
});

vi.mock('$lib/utils/overlap-detection', () => ({
	detectOverlaps: vi.fn().mockResolvedValue(mockOverlapResult),
	detectCutoutGaps: vi.fn().mockResolvedValue(mockGapResult)
}));

describe('DetectionStore', () => {
	let store: ReturnType<typeof createDetectionStore>;
	let getLayers: () => typeof testLayers;
	let getCombinedSvg: () => string;
	let getConfig: () => { solverGapMm: number; diameter: number };
	let onError: (error: string) => void;

	beforeEach(() => {
		vi.clearAllMocks();
		getLayers = () => testLayers;
		getCombinedSvg = () => '<svg></svg>';
		getConfig = () => ({ solverGapMm: 2, diameter: 200 });
		onError = vi.fn<(error: string) => void>();

		store = createDetectionStore({
			getLayers,
			getCombinedSvg,
			getConfig,
			onError
		});
	});

	describe('initial state', () => {
		it('starts with empty overlap and gap maps', () => {
			expect(store.overlaps.size).toBe(0);
			expect(store.cutoutGaps.size).toBe(0);
			expect(store.isDetecting).toBe(false);
		});
	});

	describe('scheduleDetection', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('debounces multiple rapid calls into a single run', async () => {
			store.scheduleDetection();
			store.scheduleDetection();
			store.scheduleDetection();

			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			expect(detectOverlaps).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(60);

			expect(detectOverlaps).toHaveBeenCalledTimes(1);
		});

		it('waits for the debounce delay before running', async () => {
			store.scheduleDetection();

			const { detectOverlaps } = await import('$lib/utils/overlap-detection');

			await vi.advanceTimersByTimeAsync(40);
			expect(detectOverlaps).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(20);
			expect(detectOverlaps).toHaveBeenCalledTimes(1);
		});

		it('resets the debounce timer on each call', async () => {
			store.scheduleDetection();
			await vi.advanceTimersByTimeAsync(30);

			store.scheduleDetection();
			await vi.advanceTimersByTimeAsync(30);
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			expect(detectOverlaps).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(30);
			expect(detectOverlaps).toHaveBeenCalledTimes(1);
		});
	});

	describe('runDetectionNow', () => {
		it('runs detection immediately without debounce', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			await store.runDetectionNow();
			expect(detectOverlaps).toHaveBeenCalledTimes(1);
		});

		it('runs overlap detection then cutout gap detection in sequence', async () => {
			const { detectOverlaps, detectCutoutGaps } = await import('$lib/utils/overlap-detection');
			let overlapDone = false;

			vi.mocked(detectOverlaps).mockImplementation(async () => {
				overlapDone = true;
				return mockOverlapResult;
			});

			vi.mocked(detectCutoutGaps).mockImplementation(async () => {
				expect(overlapDone).toBe(true);
				return mockGapResult;
			});

			await store.runDetectionNow();
			expect(detectOverlaps).toHaveBeenCalledTimes(1);
			expect(detectCutoutGaps).toHaveBeenCalledTimes(1);
		});
	});

	describe('runs overlap and gap detection', () => {
		it('passes visible layers and combinedSvg to detectOverlaps', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			await store.runDetectionNow();
			expect(detectOverlaps).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'a' })]),
				'<svg></svg>'
			);
		});

		it('passes layers, svg, gapMm, and diameter to detectCutoutGaps', async () => {
			const { detectCutoutGaps } = await import('$lib/utils/overlap-detection');
			await store.runDetectionNow();
			expect(detectCutoutGaps).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'a' })]),
				'<svg></svg>',
				2,
				200
			);
		});
	});

	describe('updates reactive state', () => {
		it('sets overlaps after a successful run', async () => {
			const result = new Map<string, Map<string, number>>();
			result.set('a', new Map([['b', 5]]));
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			vi.mocked(detectOverlaps).mockResolvedValue(result);

			await store.runDetectionNow();
			expect(store.overlaps.get('a')?.get('b')).toBe(5);
		});

		it('sets cutoutGaps after a successful run', async () => {
			const result = new Map<string, Set<string>>();
			result.set('a', new Set(['b']));
			const { detectCutoutGaps } = await import('$lib/utils/overlap-detection');
			vi.mocked(detectCutoutGaps).mockResolvedValue(result);

			await store.runDetectionNow();
			expect(store.cutoutGaps.get('a')?.has('b')).toBe(true);
		});

		it('clears overlaps when no combinedSvg', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			store = createDetectionStore({
				getLayers,
				getCombinedSvg: () => null,
				getConfig,
				onError
			});
			await store.runDetectionNow();
			expect(detectOverlaps).not.toHaveBeenCalled();
			expect(store.overlaps.size).toBe(0);
		});

		it('clears overlaps when fewer than 2 visible layers', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			store = createDetectionStore({
				getLayers: () => [testLayers[0]],
				getCombinedSvg,
				getConfig,
				onError
			});
			await store.runDetectionNow();
			expect(detectOverlaps).not.toHaveBeenCalled();
			expect(store.overlaps.size).toBe(0);
		});
	});

	describe('isDetecting state', () => {
		it('is true during detection', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			let resolveOverlap: (v: Map<string, Map<string, number>>) => void;
			vi.mocked(detectOverlaps).mockReturnValue(
				new Promise<Map<string, Map<string, number>>>((resolve) => {
					resolveOverlap = resolve;
				})
			);

			const runPromise = store.runDetectionNow();

			expect(store.isDetecting).toBe(true);

			resolveOverlap!(mockOverlapResult);
			await runPromise;
			expect(store.isDetecting).toBe(false);
		});
	});

	describe('serialization / stale re-run', () => {
		it('queues a re-run if scheduleDetection is called while a run is in progress', async () => {
			const { detectOverlaps, detectCutoutGaps } = await import('$lib/utils/overlap-detection');
			let resolveOverlap1: (v: Map<string, Map<string, number>>) => void;
			let resolveOverlap2: (v: Map<string, Map<string, number>>) => void;
			let overlapCalls = 0;

			vi.mocked(detectOverlaps).mockImplementation(
				() =>
					new Promise<Map<string, Map<string, number>>>((resolve) => {
						overlapCalls++;
						if (overlapCalls === 1) {
							resolveOverlap1 = resolve;
						} else {
							resolveOverlap2 = resolve;
						}
					})
			);
			vi.mocked(detectCutoutGaps).mockResolvedValue(new Map());

			const firstRun = store.runDetectionNow();
			expect(overlapCalls).toBe(1);

			store.scheduleDetection();

			resolveOverlap1!(mockOverlapResult);

			await vi.waitFor(() => expect(overlapCalls).toBe(2));
			resolveOverlap2!(mockOverlapResult);

			await firstRun;

			expect(detectOverlaps).toHaveBeenCalledTimes(2);
		});
	});

	describe('error handling', () => {
		it('calls onError when detectOverlaps fails', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			vi.mocked(detectOverlaps).mockRejectedValue(new Error('Overlap failed'));

			await store.runDetectionNow();
			expect(onError).toHaveBeenCalledWith('Overlap detection failed: Overlap failed');
		});

		it('calls onError when detectCutoutGaps fails', async () => {
			const { detectCutoutGaps } = await import('$lib/utils/overlap-detection');
			vi.mocked(detectCutoutGaps).mockRejectedValue(new Error('Gap failed'));

			await store.runDetectionNow();
			expect(onError).toHaveBeenCalledWith('Gap detection failed: Gap failed');
		});

		it('still clears isDetecting on error', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			vi.mocked(detectOverlaps).mockRejectedValue(new Error('fail'));

			await store.runDetectionNow();
			expect(store.isDetecting).toBe(false);
		});
	});

	describe('filters to visible layers only', () => {
		it('only passes visible layers to detectOverlaps', async () => {
			const { detectOverlaps } = await import('$lib/utils/overlap-detection');
			store = createDetectionStore({
				getLayers: () => [
					{ id: 'a', name: 'A', index: 1, visible: true, rotation: 0, groupId: '' },
					{ id: 'b', name: 'B', index: 2, visible: true, rotation: 0, groupId: '' },
					{ id: 'c', name: 'C', index: 3, visible: false, rotation: 0, groupId: '' }
				],
				getCombinedSvg,
				getConfig,
				onError
			});
			await store.runDetectionNow();
			const passedLayers = vi.mocked(detectOverlaps).mock.calls[0][0] as { id: string }[];
			expect(passedLayers).toHaveLength(2);
			expect(passedLayers.find((l) => l.id === 'c')).toBeUndefined();
		});
	});
});
