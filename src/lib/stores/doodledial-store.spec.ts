import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDoodledialStore, doodledialStore } from './doodledial.svelte';

describe('doodledial store auto-placement trigger scheduler', () => {
	function createStoreWithMockConfig() {
		const mockConfig = {
			pathLabelOptimizerEnabled: true,
			diameter: 200,
			save: vi.fn(),
			open: vi.fn(),
			close: vi.fn(),
			reset: vi.fn(),
			centerHoleDiameter: 2,
			forceDirectedOptimizerEnabled: false,
			optimizerGapDefault: 5,
			bruteforceTimeLimit: 120,
			defaultExportFormat: 'laser-svg' as const,
			dialogOpen: false,
			labelFontFamily: '',
			titleFontFamily: ''
		};
		const store = createDoodledialStore({ globalConfig: mockConfig });
		store.addLayer('layer-1', 1, 'Layer 1');
		return store;
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('triggers debounced auto-placement on setScale and setOffsetX/Y', async () => {
		const store = createStoreWithMockConfig();
		const runner = vi.fn(async () => {});
		store.setAutoPlacementRunner(runner);

		store.setScale(1.1);
		store.setOffsetX(2);
		store.setOffsetY(-3);

		expect(runner).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(120);

		expect(runner).toHaveBeenCalledTimes(1);
	});

	it('does not trigger auto-placement on setLayerRotation or toggleVisibility', async () => {
		const store = createStoreWithMockConfig();
		const runner = vi.fn(async () => {});
		store.setAutoPlacementRunner(runner);

		store.setLayerRotation('layer-1', 45);
		store.toggleVisibility('layer-1');

		await vi.advanceTimersByTimeAsync(120);

		expect(runner).not.toHaveBeenCalled();
	});

	it('reruns once when work becomes stale during an active single-flight run', async () => {
		const store = createStoreWithMockConfig();
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

		store.setAutoPlacementRunner(runner);

		const firstRunPromise = store.runAutoPlacementNow();
		const staleRunPromise = store.runAutoPlacementNow();

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
