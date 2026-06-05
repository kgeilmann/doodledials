import { globalConfig } from '$lib/stores/global-config.svelte';

type AutoPlacementRunner = () => void | Promise<void>;

export interface LabelPlacementStoreOptions {
	getIsPlacementEnabled?: () => boolean;
}

export function createLabelPlacementStore(options?: LabelPlacementStoreOptions) {
	const getIsPlacementEnabled =
		options?.getIsPlacementEnabled ?? (() => globalConfig.pathLabelOptimizerEnabled);

	let timer: ReturnType<typeof setTimeout> | null = null;
	let running = false;
	let stale = false;
	let runner: AutoPlacementRunner | null = null;

	async function executeNow(): Promise<void> {
		if (!getIsPlacementEnabled()) return;

		if (running) {
			stale = true;
			return;
		}

		running = true;
		try {
			await runner?.();
		} finally {
			running = false;
			if (stale) {
				stale = false;
				await executeNow();
			}
		}
	}

	function schedule(delay = 100) {
		if (!getIsPlacementEnabled()) return;

		if (timer) {
			clearTimeout(timer);
		}

		timer = setTimeout(() => {
			timer = null;
			void executeNow();
		}, delay);
	}

	return {
		get isPlacementEnabled() {
			return getIsPlacementEnabled();
		},
		setRunner(r: AutoPlacementRunner | null) {
			runner = r;
		},
		schedule,
		runNow() {
			return executeNow();
		},
		requestLayerAutoPlacement(_layerId: string, layerExists: boolean) {
			if (!getIsPlacementEnabled() || !layerExists) {
				return Promise.resolve();
			}
			return executeNow();
		},
		reset() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			running = false;
			stale = false;
			runner = null;
		}
	};
}
