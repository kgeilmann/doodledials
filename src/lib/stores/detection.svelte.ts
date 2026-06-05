import type { Layer } from '$lib/types/doodledial';
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';

export interface DetectionStoreOptions {
	getLayers: () => Layer[];
	getCombinedSvg: () => string | null;
	getConfig: () => { optimizerGapMm?: number; diameter: number };
	onError?: (error: string) => void;
}

const DEBOUNCE_MS = 50;

export function createDetectionStore(options: DetectionStoreOptions) {
	const { getLayers, getCombinedSvg, getConfig, onError } = options;

	let checkingOverlaps = $state<boolean>(false);
	let overlaps = $state<Map<string, Map<string, number>>>(new Map());
	let cutoutGaps = $state<Map<string, Set<string>>>(new Map());

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
		checkingOverlaps = true;

		try {
			const svg = getCombinedSvg();
			const allLayers = getLayers();
			const visibleLayers = allLayers.filter((l) => l.visible);

			if (!svg || visibleLayers.length < 2) {
				overlaps = new Map();
				cutoutGaps = new Map();
				return;
			}

			try {
				const result = await detectOverlaps(visibleLayers, svg);
				overlaps = result;
			} catch (err) {
				overlaps = new Map();
				onError?.(`Overlap detection failed: ${err instanceof Error ? err.message : String(err)}`);
			}

			try {
				const config = getConfig();
				const result = await detectCutoutGaps(
					visibleLayers,
					svg,
					config.optimizerGapMm ?? 2,
					config.diameter
				);
				cutoutGaps = result;
			} catch (err) {
				cutoutGaps = new Map();
				onError?.(`Gap detection failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		} finally {
			checkingOverlaps = false;
			detectionRunning = false;
			if (detectionStale) {
				detectionStale = false;
				await runDetectionInternal();
			}
		}
	}

	return {
		get checkingOverlaps() {
			return checkingOverlaps;
		},
		get overlaps() {
			return overlaps;
		},
		get cutoutGaps() {
			return cutoutGaps;
		},
		scheduleDetection,
		runDetectionNow,
		setCheckingOverlaps(checking: boolean) {
			checkingOverlaps = checking;
		},
		setOverlaps(newOverlaps: Map<string, Map<string, number>>) {
			overlaps = newOverlaps;
		},
		clearOverlaps() {
			overlaps = new Map();
		},
		setCutoutGaps(newGaps: Map<string, Set<string>>) {
			cutoutGaps = newGaps;
		},
		clearCutoutGaps() {
			cutoutGaps = new Map();
		},
		reset() {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
			detectionRunning = false;
			detectionStale = false;
			overlaps = new Map();
			cutoutGaps = new Map();
			checkingOverlaps = false;
		}
	};
}
