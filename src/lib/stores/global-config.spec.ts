import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'doodledial:config';

function createMockStorage(): Storage {
	const store: Record<string, string> = {};
	return {
		getItem(key: string) {
			return store[key] ?? null;
		},
		setItem(key: string, value: string) {
			store[key] = value;
		},
		removeItem(key: string) {
			delete store[key];
		},
		clear() {
			for (const key in store) delete store[key];
		},
		get length() {
			return Object.keys(store).length;
		},
		key(_index: number) {
			void _index;
			return null;
		}
	};
}

describe('global config store', () => {
	beforeEach(() => {
		const mock = createMockStorage();
		vi.stubGlobal('localStorage', mock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it('uses defaults when localStorage is empty', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(100);
		expect(globalConfig.autoLabelPlacementEnabled).toBe(false);
	});

	it('loads persisted values from localStorage on init', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ diameter: 150, autoLabelPlacementEnabled: false })
		);
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(150);
		expect(globalConfig.autoLabelPlacementEnabled).toBe(false);
	});

	it('falls back to defaults when localStorage has partial data', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ diameter: 180 }));
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(180);
		expect(globalConfig.autoLabelPlacementEnabled).toBe(false);
	});

	it('falls back to defaults when localStorage has corrupt data', async () => {
		localStorage.setItem(STORAGE_KEY, 'not-json');
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(100);
		expect(globalConfig.autoLabelPlacementEnabled).toBe(false);
	});

	it('persists to localStorage on save', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.diameter = 150;
		globalConfig.autoLabelPlacementEnabled = false;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.diameter).toBe(150);
		expect(saved.autoLabelPlacementEnabled).toBe(false);
	});

	it('reset restores defaults', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.diameter = 150;
		globalConfig.autoLabelPlacementEnabled = true;
		globalConfig.reset();
		expect(globalConfig.diameter).toBe(100);
		expect(globalConfig.autoLabelPlacementEnabled).toBe(false);
	});

	it('has default centerHoleDiameter of 0.5', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.centerHoleDiameter).toBe(0.5);
	});

	it('persists and restores centerHoleDiameter', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.centerHoleDiameter = 1.5;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.centerHoleDiameter).toBe(1.5);
	});

	it('resets centerHoleDiameter to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.centerHoleDiameter = 3;
		globalConfig.reset();
		expect(globalConfig.centerHoleDiameter).toBe(0.5);
	});

	it('has default solverGapDefault of 3', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.solverGapDefault).toBe(3);
	});

	it('persists and restores solverGapDefault', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.solverGapDefault = 8;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.solverGapDefault).toBe(8);
	});

	it('resets solverGapDefault to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.solverGapDefault = 10;
		globalConfig.reset();
		expect(globalConfig.solverGapDefault).toBe(3);
	});

	it('has default bruteforceTimeLimit of 120', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.bruteforceTimeLimit).toBe(120);
	});

	it('persists and restores bruteforceTimeLimit', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.bruteforceTimeLimit = 300;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.bruteforceTimeLimit).toBe(300);
	});

	it('resets bruteforceTimeLimit to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.bruteforceTimeLimit = 60;
		globalConfig.reset();
		expect(globalConfig.bruteforceTimeLimit).toBe(120);
	});

	it('has default defaultExportFormat of laser-svg', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.defaultExportFormat).toBe('laser-svg');
	});

	it('persists and restores defaultExportFormat', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.defaultExportFormat = 'stl';
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.defaultExportFormat).toBe('stl');
	});

	it('resets defaultExportFormat to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.defaultExportFormat = 'stl';
		globalConfig.reset();
		expect(globalConfig.defaultExportFormat).toBe('laser-svg');
	});

	it('has default centerStyle of hole', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.centerStyle).toBe('hole');
	});

	it('persists and restores centerStyle', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.centerStyle = 'crosshair';
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.centerStyle).toBe('crosshair');
	});

	it('resets centerStyle to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.centerStyle = 'none';
		globalConfig.reset();
		expect(globalConfig.centerStyle).toBe('hole');
	});

	it('has default cutoutLabelFontSize of 10', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.cutoutLabelFontSize).toBe(10);
	});

	it('persists and restores cutoutLabelFontSize', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.cutoutLabelFontSize = 14;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.cutoutLabelFontSize).toBe(14);
	});

	it('resets cutoutLabelFontSize to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.cutoutLabelFontSize = 16;
		globalConfig.reset();
		expect(globalConfig.cutoutLabelFontSize).toBe(10);
	});

	it('has default dialTitleFontSize of 12', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.dialTitleFontSize).toBe(12);
	});

	it('persists and restores dialTitleFontSize', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.dialTitleFontSize = 16;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.dialTitleFontSize).toBe(16);
	});

	it('resets dialTitleFontSize to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.dialTitleFontSize = 20;
		globalConfig.reset();
		expect(globalConfig.dialTitleFontSize).toBe(12);
	});
});
