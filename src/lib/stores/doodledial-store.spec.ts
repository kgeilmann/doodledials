import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDoodledialStore, doodledialStore } from './doodledial.svelte';

describe('doodledial store auto-placement trigger scheduler', () => {
	function createStoreWithMockConfig() {
		const mockConfig = {
			autoLabelPlacementEnabled: true,
			diameter: 100,
			save: vi.fn(),
			open: vi.fn(),
			close: vi.fn(),
			reset: vi.fn(),
			centerHoleDiameter: 0.5,
			forceDirectedSolverEnabled: false,
			solverGapDefault: 3,
			bruteforceTimeLimit: 120,
			defaultExportFormat: 'laser-svg' as const,
			dialogOpen: false,
			titleFontFamily: 'sans-serif',
			cutoutLabelFontSize: 10,
			dialTitleFontSize: 12
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

describe('dial title', () => {
	beforeEach(() => {
		doodledialStore.reset();
	});

	it('defaults to empty title', () => {
		expect(doodledialStore.dialTitle).toBe('');
		expect(doodledialStore.dialTitleX).toBe(100);
		expect(doodledialStore.dialTitleY).toBe(20);
		expect(doodledialStore.dialTitleFontSize).toBe(12);
	});

	it('setDialTitle updates title text', () => {
		doodledialStore.setDialTitle('My Dial');
		expect(doodledialStore.dialTitle).toBe('My Dial');
	});

	it('setDialTitlePosition updates coordinates', () => {
		doodledialStore.setDialTitlePosition(150, 50);
		expect(doodledialStore.dialTitleX).toBe(150);
		expect(doodledialStore.dialTitleY).toBe(50);
	});

	it('setDialTitleFontSize updates font size', () => {
		doodledialStore.setDialTitleFontSize(18);
		expect(doodledialStore.dialTitleFontSize).toBe(18);
	});

	it('reset clears title to defaults', () => {
		doodledialStore.setDialTitle('My Dial');
		doodledialStore.setDialTitlePosition(150, 50);
		doodledialStore.setDialTitleFontSize(18);
		doodledialStore.reset();
		expect(doodledialStore.dialTitle).toBe('');
		expect(doodledialStore.dialTitleX).toBe(100);
		expect(doodledialStore.dialTitleY).toBe(20);
		expect(doodledialStore.dialTitleFontSize).toBe(12);
	});
});
