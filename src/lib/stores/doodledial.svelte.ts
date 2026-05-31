import type { DialConfig, LabelPlacementStatus, Layer, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { SvelteMap } from 'svelte/reactivity';
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';
import { solveOptimalLayout } from '$lib/utils';

type AutoPlacementRunner = () => void | Promise<void>;

const AUTO_PATH_LABEL_PLACEMENT_ENABLED =
	import.meta.env.VITE_ENABLE_AUTO_PATH_LABEL_PLACEMENT !== 'false';

function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);
	const layers: SvelteMap<string, Layer> = new SvelteMap();
	let highlightedLayer = $state<string | null>(null);
	let selectedLayer = $state<string | null>(null);
	let labelEditMode = $state<boolean>(false);
	let checkingOverlaps = $state<boolean>(false);
	let overlaps = $state<Map<string, Map<string, number>>>(new Map());
	let cutoutGaps = $state<Map<string, Set<string>>>(new Map());
	let autoPlacementTimer: ReturnType<typeof setTimeout> | null = null;
	let autoPlacementRunning = false;
	let autoPlacementStale = false;
	let autoPlacementRunner: AutoPlacementRunner | null = null;

	function getLayerArray(): Layer[] {
		return Array.from(layers.values()).sort((a, b) => a.index - b.index);
	}

	async function runOverlapDetection() {
		if (!combinedSvg || layers.size < 2) {
			overlaps = new Map();
			return;
		}
		checkingOverlaps = true;
		try {
			const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
			const result = await detectOverlaps(layerArray, combinedSvg);
			overlaps = result;
		} catch (err) {
			console.error('Overlap detection failed:', err);
		} finally {
			checkingOverlaps = false;
		}
	}

	async function runCutoutGapDetection() {
		if (!combinedSvg || layers.size < 2) {
			cutoutGaps = new Map();
			return;
		}
		try {
			const layerArray = Array.from(layers.values()).sort((a, b) => a.index - b.index);
			const result = await detectCutoutGaps(layerArray, combinedSvg, 2, config.diameter);
			cutoutGaps = result;
		} catch (err) {
			console.error('Cutout gap detection failed:', err);
		}
	}

	async function executeAutoPlacementNow(): Promise<void> {
		if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED) {
			return;
		}

		if (autoPlacementRunning) {
			autoPlacementStale = true;
			return;
		}

		autoPlacementRunning = true;
		try {
			await autoPlacementRunner?.();
		} finally {
			autoPlacementRunning = false;
			if (autoPlacementStale) {
				autoPlacementStale = false;
				await executeAutoPlacementNow();
			}
		}
	}

	function scheduleLabelAutoPlacement() {
		if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED) {
			return;
		}

		if (autoPlacementTimer) {
			clearTimeout(autoPlacementTimer);
		}

		autoPlacementTimer = setTimeout(() => {
			autoPlacementTimer = null;
			void executeAutoPlacementNow();
		}, 100);
	}

	return {
		get config() {
			return config;
		},
		get svgContent() {
			return svgContent;
		},
		get combinedSvg() {
			return combinedSvg;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get layers() {
			return getLayerArray();
		},
		get highlightedLayer() {
			return highlightedLayer;
		},
		get selectedLayer() {
			return selectedLayer;
		},
		get labelEditMode() {
			return labelEditMode;
		},
		get checkingOverlaps() {
			return checkingOverlaps;
		},
		get overlaps() {
			return overlaps;
		},
		get cutoutGaps() {
			return cutoutGaps;
		},
		get autoPathLabelPlacementEnabled() {
			return AUTO_PATH_LABEL_PLACEMENT_ENABLED;
		},
		getLayer(id: string): Layer | undefined {
			return layers.get(id);
		},
		setDiameter(diameter: number) {
			config = { ...config, diameter };
		},
		setOffsetX(offsetX: number) {
			config = { ...config, offsetX };
			scheduleLabelAutoPlacement();
		},
		setOffsetY(offsetY: number) {
			config = { ...config, offsetY };
			scheduleLabelAutoPlacement();
		},
		setScale(scale: number) {
			config = { ...config, scale };
			scheduleLabelAutoPlacement();
		},
		setAutoPlacementRunner(runner: AutoPlacementRunner | null) {
			if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED) {
				autoPlacementRunner = null;
				return;
			}
			autoPlacementRunner = runner;
		},
		runAutoPlacementNow() {
			return executeAutoPlacementNow();
		},
		setSvgContent(content: SVGContent | null) {
			svgContent = content;
			labelEditMode = false;
		},
		setCombinedSvg(svg: string | null) {
			combinedSvg = svg;
			if (svg && layers.size >= 2) {
				runOverlapDetection();
				runCutoutGapDetection();
			}
		},
		setLoading(loading: boolean) {
			isLoading = loading;
		},
		setError(err: string | null) {
			error = err;
		},
		setHighlightedLayer(layerId: string | null) {
			highlightedLayer = layerId;
		},
		setSelectedLayer(layerId: string | null) {
			selectedLayer = layerId;
		},
		toggleLabelEditMode() {
			labelEditMode = !labelEditMode;
		},
		setCheckingOverlaps(checking: boolean) {
			checkingOverlaps = checking;
		},
		setOverlaps(newOverlaps: Map<string, Map<string, number>>) {
			overlaps = newOverlaps;
		},
		getOverlappingLayers(layerId: string): string[] {
			return Array.from(overlaps.get(layerId)?.keys() || []);
		},
		clearOverlaps() {
			overlaps = new Map();
		},
		getCutoutGaps(layerId: string): string[] {
			return Array.from(cutoutGaps.get(layerId) || []);
		},
		setCutoutGaps(newGaps: Map<string, Set<string>>) {
			cutoutGaps = newGaps;
		},
		clearCutoutGaps() {
			cutoutGaps = new Map();
		},
		addLayer(layerId: string, index: number, name: string) {
			const newLayer: Layer = {
				id: layerId,
				name: name,
				index: index,
				visible: true,
				rotation: 0,
				labelPlacementMode: 'auto',
				labelPlacementStatus: { status: 'placed' }
			};
			layers.set(layerId, newLayer);
			overlaps = new Map();
			cutoutGaps = new Map();
		},
		toggleVisibility(id: string) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, visible: !layer.visible });
			}
		},
		setLayerRotation(id: string, rotation: number) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, rotation });
			}
			runOverlapDetection();
			runCutoutGapDetection();
		},
		applyLayerRotations(rotations: Record<string, number>) {
			Object.entries(rotations).forEach(([id, rotation]) => {
				const layer = layers.get(id);
				if (layer) {
					layers.set(id, { ...layer, rotation });
				}
			});

			runOverlapDetection();
			runCutoutGapDetection();
		},
		setLayerLabelOffset(id: string, labelOffsetX: number, labelOffsetY: number) {
			this.setLayerLabelOffsetManual(id, labelOffsetX, labelOffsetY);
		},
		setLayerLabelOffsetManual(id: string, labelOffsetX: number, labelOffsetY: number) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, {
					...layer,
					labelOffsetX,
					labelOffsetY,
					labelPlacementMode: 'manual'
				});
			}
			runOverlapDetection();
			runCutoutGapDetection();
		},
		setLayerLabelOffsetAuto(id: string, labelOffsetX: number, labelOffsetY: number) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, {
					...layer,
					labelOffsetX,
					labelOffsetY,
					labelPlacementMode: 'auto'
				});
			}
			runOverlapDetection();
			runCutoutGapDetection();
		},
		getLayerLabelOffset(id: string): { labelOffsetX: number; labelOffsetY: number } | undefined {
			const layer = layers.get(id);
			if (layer) {
				return {
					labelOffsetX: layer.labelOffsetX || 0,
					labelOffsetY: layer.labelOffsetY || 0
				};
			}
			return undefined;
		},
		getLayerLabelPlacementMode(id: string): 'auto' | 'manual' {
			return layers.get(id)?.labelPlacementMode || 'auto';
		},
		setLayerLabelPlacementStatus(id: string, status: LabelPlacementStatus) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, labelPlacementStatus: status });
			}
		},
		getLayerLabelPlacementStatus(id: string): LabelPlacementStatus {
			return layers.get(id)?.labelPlacementStatus || { status: 'placed' };
		},
		resetLayerLabelPlacementMode(id: string) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, labelPlacementMode: 'auto' });
			}
		},
		requestLayerLabelAutoPlacement(id: string) {
			if (!AUTO_PATH_LABEL_PLACEMENT_ENABLED) {
				return Promise.resolve();
			}

			if (!layers.has(id)) {
				return Promise.resolve();
			}

			return executeAutoPlacementNow();
		},
		showAllLayers() {
			layers.forEach((layer) => {
				layers.set(layer.id, { ...layer, visible: true });
			});
			overlaps = new Map();
		},
		hideAllLayers() {
			layers.forEach((layer) => {
				layers.set(layer.id, { ...layer, visible: false });
			});
			overlaps = new Map();
		},
		clearLayers() {
			layers.clear();
		},
		reset() {
			if (autoPlacementTimer) {
				clearTimeout(autoPlacementTimer);
				autoPlacementTimer = null;
			}
			autoPlacementRunning = false;
			autoPlacementStale = false;
			autoPlacementRunner = null;
			config = { ...DEFAULT_DIAL_CONFIG };
			svgContent = null;
			combinedSvg = null;
			isLoading = false;
			error = null;
			layers.clear();
			labelEditMode = false;
		},
		async solveLayout() {
			if (!svgContent || !combinedSvg || layers.size < 2) {
				return;
			}

			console.log(`[Layout Solver UI] Starting layout optimization for ${layers.size} layers`);
			this.setLoading(true);
			this.setError(null);

			try {
				const layerArray = getLayerArray();
				const solvedLayers = await solveOptimalLayout(layerArray, this.config, svgContent);

				// Update layer rotations with solver results
				solvedLayers.forEach((solvedLayer) => {
					const layer = layers.get(solvedLayer.id);
					if (layer) {
						layers.set(solvedLayer.id, { ...layer, rotation: solvedLayer.rotation });
					}
				});

				// Re-run overlap and cutout gap detection with new rotations
				runOverlapDetection();
				runCutoutGapDetection();

				console.log(`[Layout Solver UI] Layout optimization completed successfully`);
			} catch (err) {
				console.error('Layout solving failed:', err);
				this.setError(
					'Layout solving failed: ' + (err instanceof Error ? err.message : String(err))
				);
			} finally {
				this.setLoading(false);
			}
		}
	};
}

export const doodledialStore = createDoodledialStore();

if (typeof window !== 'undefined') {
	(window as typeof window & { __doodledialStore?: typeof doodledialStore }).__doodledialStore =
		doodledialStore;
}
