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
		expect(globalConfig.diameter).toBe(200);
		expect(globalConfig.pathLabelOptimizerEnabled).toBe(false);
		expect(globalConfig.dialogOpen).toBe(false);
	});

	it('loads persisted values from localStorage on init', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ diameter: 150, pathLabelOptimizerEnabled: false })
		);
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(150);
		expect(globalConfig.pathLabelOptimizerEnabled).toBe(false);
	});

	it('falls back to defaults when localStorage has partial data', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ diameter: 180 }));
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(180);
		expect(globalConfig.pathLabelOptimizerEnabled).toBe(false);
	});

	it('falls back to defaults when localStorage has corrupt data', async () => {
		localStorage.setItem(STORAGE_KEY, 'not-json');
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.diameter).toBe(200);
		expect(globalConfig.pathLabelOptimizerEnabled).toBe(false);
	});

	it('persists to localStorage on save', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.diameter = 150;
		globalConfig.pathLabelOptimizerEnabled = false;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.diameter).toBe(150);
		expect(saved.pathLabelOptimizerEnabled).toBe(false);
	});

	it('open and close toggle dialogOpen', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.dialogOpen).toBe(false);
		globalConfig.open();
		expect(globalConfig.dialogOpen).toBe(true);
		globalConfig.close();
		expect(globalConfig.dialogOpen).toBe(false);
	});

	it('reset restores defaults', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.diameter = 150;
		globalConfig.pathLabelOptimizerEnabled = true;
		globalConfig.reset();
		expect(globalConfig.diameter).toBe(200);
		expect(globalConfig.pathLabelOptimizerEnabled).toBe(false);
		expect(globalConfig.dialogOpen).toBe(false);
	});

	it('has default centerHoleDiameter of 2', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.centerHoleDiameter).toBe(2);
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
		expect(globalConfig.centerHoleDiameter).toBe(2);
	});

	it('has default optimizerGapDefault of 5', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		expect(globalConfig.optimizerGapDefault).toBe(5);
	});

	it('persists and restores optimizerGapDefault', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.optimizerGapDefault = 8;
		globalConfig.save();
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		expect(saved.optimizerGapDefault).toBe(8);
	});

	it('resets optimizerGapDefault to default', async () => {
		const { globalConfig } = await import('./global-config.svelte.ts');
		globalConfig.optimizerGapDefault = 10;
		globalConfig.reset();
		expect(globalConfig.optimizerGapDefault).toBe(5);
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
});
