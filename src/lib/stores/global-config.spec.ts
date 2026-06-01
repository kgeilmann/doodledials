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
});
