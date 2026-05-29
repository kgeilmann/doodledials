import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doodledialStore } from './doodledial.svelte';

describe('doodledial store auto-placement trigger scheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		doodledialStore.reset();
		doodledialStore.addLayer('layer-1', 1, 'Layer 1');
	});

	afterEach(() => {
		doodledialStore.setAutoPlacementRunner(null);
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('triggers debounced auto-placement on setScale and setOffsetX/Y', async () => {
		const runner = vi.fn(async () => {});
		doodledialStore.setAutoPlacementRunner(runner);

		doodledialStore.setScale(1.1);
		doodledialStore.setOffsetX(2);
		doodledialStore.setOffsetY(-3);

		expect(runner).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(120);

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('does not trigger auto-placement on setLayerRotation or toggleVisibility', async () => {
		const runner = vi.fn(async () => {});
		doodledialStore.setAutoPlacementRunner(runner);

		doodledialStore.setLayerRotation('layer-1', 45);
		doodledialStore.toggleVisibility('layer-1');

		await vi.advanceTimersByTimeAsync(120);

		expect(runner).not.toHaveBeenCalled();
	});

	it('reruns once when work becomes stale during an active single-flight run', async () => {
		let invocationCount = 0;
		let releaseFirstRun: () => void = () => {};
		const firstRunDone = new Promise<void>((resolve) => {
			releaseFirstRun = resolve;
		});

		const runner = vi.fn(async () => {
			invocationCount += 1;
			if (invocationCount === 1) {
				await firstRunDone;
			}
		});

		doodledialStore.setAutoPlacementRunner(runner);

		const firstRunPromise = doodledialStore.runAutoPlacementNow();
		const staleRunPromise = doodledialStore.runAutoPlacementNow();

		expect(runner).toHaveBeenCalledTimes(1);

		releaseFirstRun();
		await firstRunPromise;
		await staleRunPromise;

		expect(runner).toHaveBeenCalledTimes(2);
	});
});
