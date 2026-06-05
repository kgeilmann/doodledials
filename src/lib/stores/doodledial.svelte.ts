import type { DialConfig, LabelPlacementStatus, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { globalConfig } from '$lib/stores/global-config.svelte';
import { createLayerStore } from './layers.svelte';
import { createDetectionStore } from './detection.svelte';

type AutoPlacementRunner = () => void | Promise<void>;

function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	config.diameter = globalConfig.diameter;
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);

	const detectionStore = createDetectionStore({
		getLayers: () => layerStore.layers,
		getCombinedSvg: () => combinedSvg,
		getConfig: () => ({ optimizerGapMm: config.optimizerGapMm, diameter: config.diameter }),
		onError(err) {
			error = err;
		}
	});

	const layerStore = createLayerStore({
		onChange() {
			if (combinedSvg) {
				detectionStore.scheduleDetection();
			}
		}
	});

	let discTitle = $state<string>('');
	let discTitleX = $state<number>(100);
	let discTitleY = $state<number>(20);
	let discTitleFontSize = $state<number>(12);
	let autoPlacementTimer: ReturnType<typeof setTimeout> | null = null;
	let autoPlacementRunning = false;
	let autoPlacementStale = false;
	let autoPlacementRunner: AutoPlacementRunner | null = null;

	async function executeAutoPlacementNow(): Promise<void> {
		if (!globalConfig.pathLabelOptimizerEnabled) {
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
		if (!globalConfig.pathLabelOptimizerEnabled) {
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
		get discTitle() {
			return discTitle;
		},
		get discTitleX() {
			return discTitleX;
		},
		get discTitleY() {
			return discTitleY;
		},
		get discTitleFontSize() {
			return discTitleFontSize;
		},
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
			return layerStore.layers;
		},
		get hiddenLayerCount() {
			return layerStore.hiddenLayerCount;
		},
		get highlightedLayer() {
			return layerStore.highlightedLayer;
		},
		get selectedLayer() {
			return layerStore.selectedLayer;
		},

		get checkingOverlaps() {
			return detectionStore.checkingOverlaps;
		},
		get overlaps() {
			return detectionStore.overlaps;
		},
		get cutoutGaps() {
			return detectionStore.cutoutGaps;
		},
		get autoPathLabelPlacementEnabled() {
			return globalConfig.pathLabelOptimizerEnabled;
		},
		getLayer(id: string) {
			return layerStore.getLayer(id);
		},
		setDiameter(diameter: number) {
			config = { ...config, diameter };
			globalConfig.diameter = diameter;
		},
		setCenterHoleDiameter(centerHoleDiameter: number) {
			config = { ...config, centerHoleDiameter };
		},
		setDiscTitle(text: string) {
			discTitle = text;
		},
		setDiscTitlePosition(x: number, y: number) {
			discTitleX = x;
			discTitleY = y;
		},
		setDiscTitleFontSize(size: number) {
			discTitleFontSize = size;
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
		setOptimizerGapMm(optimizerGapMm: number) {
			config = { ...config, optimizerGapMm };
			detectionStore.runDetectionNow();
		},
		setAutoPlacementRunner(runner: AutoPlacementRunner | null) {
			if (!globalConfig.pathLabelOptimizerEnabled) {
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
		},
		setCombinedSvg(svg: string | null) {
			combinedSvg = svg;
			if (svg && layerStore.layers.length >= 2) {
				detectionStore.runDetectionNow();
			}
		},
		setLoading(loading: boolean) {
			isLoading = loading;
		},
		setError(err: string | null) {
			error = err;
		},
		setHighlightedLayer(layerId: string | null) {
			layerStore.setHighlightedLayer(layerId);
		},
		setSelectedLayer(layerId: string | null) {
			layerStore.setSelectedLayer(layerId);
		},
		setCheckingOverlaps(checking: boolean) {
			detectionStore.setCheckingOverlaps(checking);
		},
		setOverlaps(newOverlaps: Map<string, Map<string, number>>) {
			detectionStore.setOverlaps(newOverlaps);
		},
		getOverlappingLayers(layerId: string): string[] {
			return Array.from(detectionStore.overlaps.get(layerId)?.keys() || []);
		},
		clearOverlaps() {
			detectionStore.clearOverlaps();
		},
		getCutoutGaps(layerId: string): string[] {
			return Array.from(detectionStore.cutoutGaps.get(layerId) || []);
		},
		setCutoutGaps(newGaps: Map<string, Set<string>>) {
			detectionStore.setCutoutGaps(newGaps);
		},
		clearCutoutGaps() {
			detectionStore.clearCutoutGaps();
		},
		addLayer(layerId: string, index: number, name: string) {
			layerStore.addLayer(layerId, index, name);
		},
		toggleVisibility(id: string) {
			layerStore.toggleVisibility(id);
		},
		setLayerRotation(id: string, rotation: number) {
			layerStore.setLayerRotation(id, rotation);
		},
		applyLayerRotations(rotations: Record<string, number>) {
			layerStore.applyLayerRotations(rotations);
		},
		setLayerLabelOffset(id: string, labelOffsetX: number, labelOffsetY: number) {
			this.setLayerLabelOffsetManual(id, labelOffsetX, labelOffsetY);
		},
		setLayerLabelOffsetManual(id: string, labelOffsetX: number, labelOffsetY: number) {
			layerStore.setLayerLabelOffsetManual(id, labelOffsetX, labelOffsetY);
		},
		setLayerLabelOffsetAuto(id: string, labelOffsetX: number, labelOffsetY: number) {
			layerStore.setLayerLabelOffsetAuto(id, labelOffsetX, labelOffsetY);
		},
		getLayerLabelOffset(id: string) {
			return layerStore.getLayerLabelOffset(id);
		},
		getLayerLabelPlacementMode(id: string) {
			return layerStore.getLayerLabelPlacementMode(id);
		},
		setLayerLabelPlacementStatus(id: string, status: LabelPlacementStatus) {
			layerStore.setLayerLabelPlacementStatus(id, status);
		},
		getLayerLabelPlacementStatus(id: string) {
			return layerStore.getLayerLabelPlacementStatus(id);
		},
		resetLayerLabelPlacementMode(id: string) {
			layerStore.resetLayerLabelPlacementMode(id);
		},
		requestLayerLabelAutoPlacement(id: string) {
			if (!globalConfig.pathLabelOptimizerEnabled) {
				return Promise.resolve();
			}

			if (!layerStore.getLayer(id)) {
				return Promise.resolve();
			}

			return executeAutoPlacementNow();
		},
		showAllLayers() {
			layerStore.showAllLayers();
		},
		hideAllLayers() {
			layerStore.hideAllLayers();
		},
		clearLayers() {
			layerStore.clearLayers();
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
			config.diameter = globalConfig.diameter;
			svgContent = null;
			combinedSvg = null;
			isLoading = false;
			error = null;
			layerStore.reset();
			detectionStore.reset();
			discTitle = '';
			discTitleX = 100;
			discTitleY = 20;
			discTitleFontSize = 12;
		}
	};
}

export const doodledialStore = createDoodledialStore();

if (typeof window !== 'undefined') {
	(window as typeof window & { __doodledialStore?: typeof doodledialStore }).__doodledialStore =
		doodledialStore;
}
