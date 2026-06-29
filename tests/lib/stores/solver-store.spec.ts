import { describe, expect, it } from 'vitest';
import { createSolverStore } from '$lib/stores/solver.svelte';
import type { DialConfig, SVGContent, Layer, LayerGroup } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';

interface MockDoodledialStore {
	svgContent: SVGContent | null;
	config: DialConfig;
	layers: Layer[];
	groups: LayerGroup[];
	applyLayerRotations(rotations: Record<string, number>): void;
	setSolverGapMm(gapMm: number): void;
}

function createMockDoodledialStore(overrides?: Partial<MockDoodledialStore>): MockDoodledialStore {
	return {
		svgContent: null,
		config: { ...DEFAULT_DIAL_CONFIG },
		layers: [],
		groups: [],
		applyLayerRotations(_rotations: Record<string, number>) {
			_rotations satisfies Record<string, number>;
		},
		setSolverGapMm(_gapMm: number) {
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
	return createSolverStore({
		globalConfig: { solverGapDefault: 10, bruteforceTimeLimit: 60 },
		doodledialStore: ddStore
	});
}

function createTestStoreWithSvg() {
	return createTestStore({
		svgContent: { raw: '<svg></svg>', filename: 'test.svg' }
	});
}

describe('solver store', () => {
	describe('initial state', () => {
		it('has default pending state', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverPending).toBe(false);
		});

		it('has zero progress', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverProgress).toBe(0);
		});

		it('has idle phase', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverProgressPhase).toBe('Idle');
		});

		it('has empty progress message', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverProgressMessage).toBe('');
		});

		it('has default gap input from injected globalConfig', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverGapMmInput).toBe('10');
		});

		it('has default max runtime input from injected globalConfig', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverMaxRuntimeSInput).toBe('60');
		});

		it('has round output angles enabled by default', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverRoundOutputAngles).toBe(true);
		});

		it('has overlays hidden by default', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverOverlayVisible).toBe(false);
			expect(store.solverRunDialogOpen).toBe(false);
			expect(store.bruteforceResultDialogOpen).toBe(false);
		});

		it('has zero elapsed time', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverElapsedMs).toBe(0);
		});

		it('has null max runtime ms', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverMaxRuntimeMs).toBeNull();
		});

		it('has empty top layouts', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverTopLayouts).toEqual([]);
		});

		it('has null svg template', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverSvgTemplate).toBeNull();
		});

		it('has result index 0', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverResultSelectedIndex).toBe(0);
		});

		it('has empty thumbnails when no template', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverThumbnailSvgs).toEqual([]);
		});

		it('has empty selected group ids by default', () => {
			const store = createTestStore();
			store.reset();
			expect(store.solverSelectedGroupIds).toEqual([]);
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

	describe('resetSolverTuning', () => {
		it('resets round output angles', () => {
			const store = createTestStore();
			store.solverRoundOutputAngles = false;
			store.resetSolverTuning();
			expect(store.solverRoundOutputAngles).toBe(true);
		});

		it('resets gap input from global config', () => {
			const store = createTestStore();
			store.solverGapMmInput = '99';
			store.resetSolverTuning();
			expect(store.solverGapMmInput).toBe('10');
		});

		it('resets max runtime input', () => {
			const store = createTestStore();
			store.solverMaxRuntimeSInput = '999';
			store.resetSolverTuning();
			expect(store.solverMaxRuntimeSInput).toBe('60');
		});
	});

	describe('dialog state management', () => {
		it('closes solver dialog via handleCloseSolverDialog', () => {
			const store = createTestStoreWithSvg();
			store.handleOpenSolverDialog();
			expect(store.solverRunDialogOpen).toBe(true);
			store.handleCloseSolverDialog();
			expect(store.solverRunDialogOpen).toBe(false);
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

	describe('handleStopSolver', () => {
		it('does not crash when no abort controller is active', () => {
			const store = createTestStore();
			expect(() => store.handleStopSolver()).not.toThrow();
		});

		it('can be called multiple times', () => {
			const store = createTestStore();
			expect(() => {
				store.handleStopSolver();
				store.handleStopSolver();
			}).not.toThrow();
		});
	});

	describe('reset', () => {
		it('resets all state to initial values', () => {
			const store = createTestStoreWithSvg();
			store.handleOpenSolverDialog();
			store.reset();
			expect(store.solverPending).toBe(false);
			expect(store.solverProgress).toBe(0);
			expect(store.solverProgressPhase).toBe('Idle');
			expect(store.solverRunDialogOpen).toBe(false);
		});

		it('resets inputs to global config defaults', () => {
			const store = createTestStore();
			store.solverGapMmInput = '50';
			store.reset();
			expect(store.solverGapMmInput).toBe('10');
			expect(store.solverMaxRuntimeSInput).toBe('60');
		});
	});

	describe('handleOpenSolverDialog', () => {
		it('does nothing when no svgContent', () => {
			const store = createTestStore();
			store.handleOpenSolverDialog();
			expect(store.solverRunDialogOpen).toBe(false);
		});

		it('does nothing when solver is pending', () => {
			const store = createTestStoreWithSvg();
			store.reset();
			store.handleOpenSolverDialog();
			expect(store.solverRunDialogOpen).toBe(true);
		});

		it('resets input fields when opening', () => {
			const store = createTestStoreWithSvg();
			store.solverGapMmInput = '99';
			store.solverMaxRuntimeSInput = '999';
			store.handleOpenSolverDialog();
			expect(store.solverGapMmInput).toBe('10');
			expect(store.solverMaxRuntimeSInput).toBe('60');
		});
	});

	describe('handleConfirmSolverDialogRun', () => {
		it('closes dialog and does not crash without svg', () => {
			const store = createTestStore();
			store.handleConfirmSolverDialogRun();
			expect(store.solverRunDialogOpen).toBe(false);
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

	describe('group selection', () => {
		it('pre-populates selectedGroupIds from visible groups on dialog open', () => {
			const layers: Layer[] = [
				{ id: 'l1', name: 'L1', index: 0, groupId: 'g1', visible: true, rotation: 0 },
				{ id: 'l2', name: 'L2', index: 1, groupId: 'g2', visible: false, rotation: 0 }
			];
			const ddStore = createMockDoodledialStore({
				svgContent: { raw: '<svg></svg>', filename: 'test.svg' },
				layers,
				groups: [
					{ id: 'g1', color: '#ff0000', name: 'Group 1' },
					{ id: 'g2', color: '#00ff00', name: 'Group 2' }
				]
			});
			const store = createSolverStore({
				globalConfig: { solverGapDefault: 10, bruteforceTimeLimit: 60 },
				doodledialStore: ddStore
			});
			store.handleOpenSolverDialog();
			// g2 has no visible layers, so it should not be pre-selected
			expect(store.solverSelectedGroupIds).toEqual(['g1']);
		});

		it('pre-populates all groups when all have visible layers', () => {
			const layers: Layer[] = [
				{ id: 'l1', name: 'L1', index: 0, groupId: 'g1', visible: true, rotation: 0 },
				{ id: 'l2', name: 'L2', index: 1, groupId: 'g2', visible: true, rotation: 0 }
			];
			const ddStore = createMockDoodledialStore({
				svgContent: { raw: '<svg></svg>', filename: 'test.svg' },
				layers,
				groups: [
					{ id: 'g1', color: '#ff0000', name: 'Group 1' },
					{ id: 'g2', color: '#00ff00', name: 'Group 2' }
				]
			});
			const store = createSolverStore({
				globalConfig: { solverGapDefault: 10, bruteforceTimeLimit: 60 },
				doodledialStore: ddStore
			});
			store.handleOpenSolverDialog();
			expect(store.solverSelectedGroupIds).toEqual(['g1', 'g2']);
		});

		it('pre-populates empty when no groups have visible layers', () => {
			const layers: Layer[] = [
				{ id: 'l1', name: 'L1', index: 0, groupId: 'g1', visible: false, rotation: 0 }
			];
			const ddStore = createMockDoodledialStore({
				svgContent: { raw: '<svg></svg>', filename: 'test.svg' },
				layers,
				groups: [{ id: 'g1', color: '#ff0000', name: 'Group 1' }]
			});
			const store = createSolverStore({
				globalConfig: { solverGapDefault: 10, bruteforceTimeLimit: 60 },
				doodledialStore: ddStore
			});
			store.handleOpenSolverDialog();
			expect(store.solverSelectedGroupIds).toEqual([]);
		});
	});
});

describe('solver store with defaults', () => {
	it('can create store without options', () => {
		const defaultStore = createSolverStore();
		expect(defaultStore.solverGapMmInput).toBeDefined();
	});
});
