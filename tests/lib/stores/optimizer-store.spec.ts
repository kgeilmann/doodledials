import { describe, expect, it } from 'vitest';
import { createOptimizerStore, optimizerTuningDefaults } from '$lib/stores/optimizer.svelte';
import type { DialConfig, SVGContent, Layer } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';

interface MockDoodledialStore {
	svgContent: SVGContent | null;
	config: DialConfig;
	layers: Layer[];
	applyLayerRotations(rotations: Record<string, number>): void;
	setOptimizerGapMm(gapMm: number): void;
}

function createMockDoodledialStore(overrides?: Partial<MockDoodledialStore>): MockDoodledialStore {
	return {
		svgContent: null,
		config: { ...DEFAULT_DIAL_CONFIG },
		layers: [],
		applyLayerRotations(_rotations: Record<string, number>) {
			_rotations satisfies Record<string, number>;
		},
		setOptimizerGapMm(_gapMm: number) {
			_gapMm satisfies number;
		},
		...overrides
	};
}

function createTestStore(options?: { svgContent?: SVGContent | null }) {
	const ddStore = createMockDoodledialStore();
	if (options?.svgContent !== undefined) {
		ddStore.svgContent = options.svgContent;
	} else {
		ddStore.svgContent = null;
	}
	return createOptimizerStore({
		globalConfig: { optimizerGapDefault: 10, bruteforceTimeLimit: 60 },
		doodledialStore: ddStore
	});
}

function createTestStoreWithSvg() {
	return createTestStore({
		svgContent: { raw: '<svg></svg>', filename: 'test.svg' }
	});
}

describe('optimizer store', () => {
	describe('initial state', () => {
		it('has default pending state', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerPending).toBe(false);
		});

		it('has zero progress', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerProgress).toBe(0);
		});

		it('has idle phase', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerProgressPhase).toBe('Idle');
		});

		it('has empty progress message', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerProgressMessage).toBe('');
		});

		it('has default gap input from injected globalConfig', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerGapMmInput).toBe('10');
		});

		it('has default max runtime input from injected globalConfig', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerMaxRuntimeSInput).toBe('60');
		});

		it('has default random seed', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerRandomSeedInput).toBe('42');
		});

		it('has round output angles enabled by default', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerRoundOutputAngles).toBe(true);
		});

		it('has default mode as force-directed', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerMode).toBe('force-directed');
		});

		it('has overlays hidden by default', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerOverlayVisible).toBe(false);
			expect(store.optimizerRunDialogOpen).toBe(false);
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});

		it('has zero elapsed time', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerElapsedMs).toBe(0);
		});

		it('has null max runtime ms', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerMaxRuntimeMs).toBeNull();
		});

		it('has default tuning values', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerTuning).toEqual(optimizerTuningDefaults);
		});

		it('has empty top layouts', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerTopLayouts).toEqual([]);
		});

		it('has null svg template', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerSvgTemplate).toBeNull();
		});

		it('has result index 0', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerResultSelectedIndex).toBe(0);
		});

		it('has empty thumbnails when no template', () => {
			const store = createTestStore();
			store.reset();
			expect(store.optimizerThumbnailSvgs).toEqual([]);
		});
	});

	describe('fitSvg', () => {
		it('removes width attribute from svg', () => {
			const store = createTestStore();
			const result = store.fitSvg('<svg width="200" height="100" viewBox="0 0 100 100">');
			expect(result).not.toContain('width="200"');
		});

		it('removes height attribute from svg', () => {
			const store = createTestStore();
			const result = store.fitSvg('<svg width="200" height="100" viewBox="0 0 100 100">');
			expect(result).not.toContain('height="100"');
		});

		it('adds style for 100% width and height', () => {
			const store = createTestStore();
			const result = store.fitSvg('<svg width="200" height="100" viewBox="0 0 100 100">');
			expect(result).toContain('style="width:100%;height:100%"');
		});

		it('handles svg with no existing attributes', () => {
			const store = createTestStore();
			const result = store.fitSvg('<svg>');
			expect(result).toContain('style="width:100%;height:100%"');
		});
	});

	describe('formatDurationMs', () => {
		it('formats seconds correctly', () => {
			const store = createTestStore();
			expect(store.formatDurationMs(5000)).toBe('5.0s');
		});

		it('formats milliseconds correctly', () => {
			const store = createTestStore();
			expect(store.formatDurationMs(1500)).toBe('1.5s');
		});

		it('formats zero correctly', () => {
			const store = createTestStore();
			expect(store.formatDurationMs(0)).toBe('0.0s');
		});

		it('formats large values correctly', () => {
			const store = createTestStore();
			expect(store.formatDurationMs(120000)).toBe('120.0s');
		});
	});

	describe('resetOptimizerTuning', () => {
		it('resets tuning to defaults', () => {
			const store = createTestStore();
			store.optimizerTuning.overlapMagnitudeWeight = 0.5;
			store.optimizerTuning.timeStepDt = 1.0;
			store.resetOptimizerTuning();
			expect(store.optimizerTuning).toEqual(optimizerTuningDefaults);
		});

		it('resets initialize randomly', () => {
			const store = createTestStore();
			store.optimizerInitializeRandomly = true;
			store.resetOptimizerTuning();
			expect(store.optimizerInitializeRandomly).toBe(false);
		});

		it('resets round output angles', () => {
			const store = createTestStore();
			store.optimizerRoundOutputAngles = false;
			store.resetOptimizerTuning();
			expect(store.optimizerRoundOutputAngles).toBe(true);
		});

		it('resets gap input from global config', () => {
			const store = createTestStore();
			store.optimizerGapMmInput = '99';
			store.resetOptimizerTuning();
			expect(store.optimizerGapMmInput).toBe('10');
		});

		it('resets random seed input', () => {
			const store = createTestStore();
			store.optimizerRandomSeedInput = '123';
			store.resetOptimizerTuning();
			expect(store.optimizerRandomSeedInput).toBe('42');
		});

		it('resets max runtime input', () => {
			const store = createTestStore();
			store.optimizerMaxRuntimeSInput = '999';
			store.resetOptimizerTuning();
			expect(store.optimizerMaxRuntimeSInput).toBe('60');
		});
	});

	describe('dialog state management', () => {
		it('closes optimizer dialog via handleCloseOptimizerDialog', () => {
			const store = createTestStoreWithSvg();
			store.handleOpenOptimizerDialog('force-directed');
			expect(store.optimizerRunDialogOpen).toBe(true);
			store.handleCloseOptimizerDialog();
			expect(store.optimizerRunDialogOpen).toBe(false);
		});

		it('closes bruteforce result dialog via handleCloseBruteforceResultDialog', () => {
			const store = createTestStore();
			store.handleCloseBruteforceResultDialog();
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});

		it('handleCloseBruteforceResultDialog can be called when already closed', () => {
			const store = createTestStore();
			store.handleCloseBruteforceResultDialog();
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});
	});

	describe('handleStopOptimizer', () => {
		it('does not crash when no abort controller is active', () => {
			const store = createTestStore();
			expect(() => store.handleStopOptimizer()).not.toThrow();
		});

		it('can be called multiple times', () => {
			const store = createTestStore();
			store.handleStopOptimizer();
			store.handleStopOptimizer();
		});
	});

	describe('reset', () => {
		it('resets all state to initial values', () => {
			const store = createTestStoreWithSvg();
			store.handleOpenOptimizerDialog('force-directed');
			store.reset();
			expect(store.optimizerPending).toBe(false);
			expect(store.optimizerProgress).toBe(0);
			expect(store.optimizerProgressPhase).toBe('Idle');
			expect(store.optimizerRunDialogOpen).toBe(false);
		});

		it('resets tuning to defaults', () => {
			const store = createTestStore();
			store.optimizerTuning.overlapMagnitudeWeight = 999;
			store.reset();
			expect(store.optimizerTuning).toEqual(optimizerTuningDefaults);
		});

		it('resets inputs to global config defaults', () => {
			const store = createTestStore();
			store.optimizerGapMmInput = '50';
			store.reset();
			expect(store.optimizerGapMmInput).toBe('10');
			expect(store.optimizerMaxRuntimeSInput).toBe('60');
		});
	});

	describe('handleOpenOptimizerDialog', () => {
		it('does nothing when no svgContent', () => {
			const store = createTestStore();
			store.handleOpenOptimizerDialog('force-directed');
			expect(store.optimizerRunDialogOpen).toBe(false);
		});

		it('does nothing when optimizer is pending', () => {
			const store = createTestStoreWithSvg();
			store.reset();
			store.handleOpenOptimizerDialog('bruteforce');
			expect(store.optimizerMode).toBe('bruteforce');
			expect(store.optimizerRunDialogOpen).toBe(true);
		});

		it('resets input fields when opening', () => {
			const store = createTestStoreWithSvg();
			store.optimizerGapMmInput = '99';
			store.optimizerMaxRuntimeSInput = '999';
			store.handleOpenOptimizerDialog('bruteforce');
			expect(store.optimizerGapMmInput).toBe('10');
			expect(store.optimizerMaxRuntimeSInput).toBe('60');
		});
	});

	describe('handleConfirmOptimizerDialogRun', () => {
		it('closes dialog and does not crash without svg', () => {
			const store = createTestStore();
			store.handleConfirmOptimizerDialogRun();
			expect(store.optimizerRunDialogOpen).toBe(false);
		});
	});

	describe('handleApplyBruteforceLayout', () => {
		it('closes dialog even without layout', () => {
			const store = createTestStore();
			store.handleApplyBruteforceLayout();
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});
	});

	describe('handleContinueBruteforce', () => {
		it('closes dialog and does not crash without context', () => {
			const store = createTestStore();
			store.handleContinueBruteforce();
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});
	});
});

describe('optimizer store with defaults', () => {
	it('can create store without options', () => {
		const defaultStore = createOptimizerStore();
		expect(defaultStore.optimizerGapMmInput).toBeDefined();
	});
});
