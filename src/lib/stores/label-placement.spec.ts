import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLabelPlacementStore } from './label-placement.svelte';

describe('LabelPlacementStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('does not run when placement is disabled', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => false });

		store.setRunner(runner);
		store.schedule();

		await vi.advanceTimersByTimeAsync(200);

		expect(runner).not.toHaveBeenCalled();
	});

	it('debounces multiple schedule calls into a single run', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });

		store.setRunner(runner);
		store.schedule();
		store.schedule();
		store.schedule();

		expect(runner).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(120);

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('runNow executes immediately without debounce', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });

		store.setRunner(runner);
		await store.runNow();

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('reruns once when work becomes stale during single-flight run', async () => {
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

		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });
		store.setRunner(runner);

		const firstRunPromise = store.runNow();
		const staleRunPromise = store.runNow();

		expect(runner).toHaveBeenCalledTimes(1);

		releaseFirstRun();
		await firstRunPromise;
		await staleRunPromise;

		expect(runner).toHaveBeenCalledTimes(2);
	});

	it('setRunner always stores the runner even when disabled (guard fix)', async () => {
		let enabled = false;
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => enabled });

		store.setRunner(runner);

		enabled = true;
		await store.runNow();

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('requestLayerAutoPlacement returns resolved promise when layer does not exist', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });
		store.setRunner(runner);

		const result = await store.requestLayerAutoPlacement('nonexistent', false);

		expect(result).toBeUndefined();
		expect(runner).not.toHaveBeenCalled();
	});

	it('requestLayerAutoPlacement calls runner when layer exists', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });
		store.setRunner(runner);

		await store.requestLayerAutoPlacement('layer-1', true);

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('reset clears timer and state', async () => {
		const runner = vi.fn(async () => {});
		const store = createLabelPlacementStore({ getIsPlacementEnabled: () => true });
		store.setRunner(runner);

		store.schedule();
		store.reset();

		await vi.advanceTimersByTimeAsync(200);

		expect(runner).not.toHaveBeenCalled();
	});

	it('defaults isPlacementEnabled to reading globalConfig', () => {
		// With no options, should use default which imports globalConfig
		const store = createLabelPlacementStore();
		expect(store.isPlacementEnabled).toBeTypeOf('boolean');
	});
});
