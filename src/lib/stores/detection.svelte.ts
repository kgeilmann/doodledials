import type { Layer } from '$lib/types/doodledial';
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';
import { SvelteMap } from 'svelte/reactivity';

export interface DetectionStoreOptions {
	getLayers: () => Layer[];
	getCombinedSvg: () => string | null;
	getConfig: () => { solverGapMm?: number; diameter: number };
	onError?: (error: string) => void;
}

const DEBOUNCE_MS = 50;

function replaceMapContent<K, V>(target: SvelteMap<K, V>, source: Map<K, V>) {
	target.clear();
	for (const [k, v] of source) {
		target.set(k, v);
	}
}

function clearMap<K, V>(target: SvelteMap<K, V>) {
	target.clear();
}

export function createDetectionStore(options: DetectionStoreOptions) {
	const { getLayers, getCombinedSvg, getConfig, onError } = options;

	let isDetecting = $state<boolean>(false);
	const overlaps: SvelteMap<string, Map<string, number>> = new SvelteMap();
	const cutoutGaps: SvelteMap<string, Set<string>> = new SvelteMap();

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let detectionRunning = false;
	let detectionStale = false;

	function scheduleDetection() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			void runDetectionInternal();
		}, DEBOUNCE_MS);
	}

	async function runDetectionNow() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		await runDetectionInternal();
	}

	async function runDetectionInternal() {
		if (detectionRunning) {
			detectionStale = true;
			return;
		}

		detectionRunning = true;
		isDetecting = true;

		try {
			const svg = getCombinedSvg();
			const allLayers = getLayers();
			const visibleLayers = allLayers.filter((l) => l.visible);

			if (!svg || visibleLayers.length < 2) {
				clearMap(overlaps);
				clearMap(cutoutGaps);
				return;
			}

			try {
				const result = await detectOverlaps(visibleLayers, svg);
				replaceMapContent(overlaps, result);
			} catch (err) {
				clearMap(overlaps);
				onError?.(`Overlap detection failed: ${err instanceof Error ? err.message : String(err)}`);
			}

			try {
				const config = getConfig();
				const result = await detectCutoutGaps(
					visibleLayers,
					svg,
					config.solverGapMm ?? 2,
					config.diameter
				);
				replaceMapContent(cutoutGaps, result);
			} catch (err) {
				clearMap(cutoutGaps);
				onError?.(`Gap detection failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		} finally {
			isDetecting = false;
			detectionRunning = false;
			if (detectionStale) {
				detectionStale = false;
				await runDetectionInternal();
			}
		}
	}

	return {
		get isDetecting() {
			return isDetecting;
		},
		get overlaps() {
			return overlaps;
		},
		get cutoutGaps() {
			return cutoutGaps;
		},
		scheduleDetection,
		runDetectionNow,
		setDetecting(checking: boolean) {
			isDetecting = checking;
		},
		setOverlaps(newOverlaps: Map<string, Map<string, number>>) {
			replaceMapContent(overlaps, newOverlaps);
		},
		clearOverlaps() {
			clearMap(overlaps);
		},
		setCutoutGaps(newGaps: Map<string, Set<string>>) {
			replaceMapContent(cutoutGaps, newGaps);
		},
		clearCutoutGaps() {
			clearMap(cutoutGaps);
		},
		reset() {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
			detectionRunning = false;
			detectionStale = false;
			clearMap(overlaps);
			clearMap(cutoutGaps);
			isDetecting = false;
		}
	};
}
