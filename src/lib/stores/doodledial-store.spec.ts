import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doodledialStore } from './doodledial.svelte';
import { globalConfig } from './global-config.svelte';

describe('doodledial store auto-placement trigger scheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		globalConfig.pathLabelOptimizerEnabled = true;
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

describe('disc title', () => {
	beforeEach(() => {
		doodledialStore.reset();
	});

	it('defaults to empty title', () => {
		expect(doodledialStore.discTitle).toBe('');
		expect(doodledialStore.discTitleX).toBe(100);
		expect(doodledialStore.discTitleY).toBe(20);
		expect(doodledialStore.discTitleFontSize).toBe(12);
	});

	it('setDiscTitle updates title text', () => {
		doodledialStore.setDiscTitle('My Dial');
		expect(doodledialStore.discTitle).toBe('My Dial');
	});

	it('setDiscTitlePosition updates coordinates', () => {
		doodledialStore.setDiscTitlePosition(150, 50);
		expect(doodledialStore.discTitleX).toBe(150);
		expect(doodledialStore.discTitleY).toBe(50);
	});

	it('setDiscTitleFontSize updates font size', () => {
		doodledialStore.setDiscTitleFontSize(18);
		expect(doodledialStore.discTitleFontSize).toBe(18);
	});

	it('reset clears title to defaults', () => {
		doodledialStore.setDiscTitle('My Dial');
		doodledialStore.setDiscTitlePosition(150, 50);
		doodledialStore.setDiscTitleFontSize(18);
		doodledialStore.reset();
		expect(doodledialStore.discTitle).toBe('');
		expect(doodledialStore.discTitleX).toBe(100);
		expect(doodledialStore.discTitleY).toBe(20);
		expect(doodledialStore.discTitleFontSize).toBe(12);
	});
});
