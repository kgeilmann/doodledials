import type { DialConfig, LabelPlacementStatus, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';
import { globalConfig } from '$lib/stores/global-config.svelte';
import { createLayerStore } from './layers.svelte';

type AutoPlacementRunner = () => void | Promise<void>;

function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	config.diameter = globalConfig.diameter;
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);

	const layerStore = createLayerStore({
		onChange() {
			if (combinedSvg) {
				runOverlapDetection();
				runCutoutGapDetection();
			}
		}
	});

	let checkingOverlaps = $state<boolean>(false);
	let overlaps = $state<Map<string, Map<string, number>>>(new Map());
	let cutoutGaps = $state<Map<string, Set<string>>>(new Map());
	let discTitle = $state<string>('');
	let discTitleX = $state<number>(100);
	let discTitleY = $state<number>(20);
	let discTitleFontSize = $state<number>(12);
	let autoPlacementTimer: ReturnType<typeof setTimeout> | null = null;
	let autoPlacementRunning = false;
	let autoPlacementStale = false;
	let autoPlacementRunner: AutoPlacementRunner | null = null;

	async function runOverlapDetection() {
		const visibleLayers = layerStore.layers.filter((l) => l.visible);
		if (!combinedSvg || visibleLayers.length < 2) {
			overlaps = new Map();
			return;
		}
		checkingOverlaps = true;
		try {
			const result = await detectOverlaps(visibleLayers, combinedSvg);
			overlaps = result;
		} catch (err) {
			console.error('Overlap detection failed:', err);
		} finally {
			checkingOverlaps = false;
		}
	}

	async function runCutoutGapDetection() {
		const visibleLayers = layerStore.layers.filter((l) => l.visible);
		if (!combinedSvg || visibleLayers.length < 2) {
			cutoutGaps = new Map();
			return;
		}
		try {
			const optimizerGapMm = config.optimizerGapMm ?? 2;
			const result = await detectCutoutGaps(
				visibleLayers,
				combinedSvg,
				optimizerGapMm,
				config.diameter
			);
			cutoutGaps = result;
		} catch (err) {
			console.error('Cutout gap detection failed:', err);
		}
	}

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
			return checkingOverlaps;
		},
		get overlaps() {
			return overlaps;
		},
		get cutoutGaps() {
			return cutoutGaps;
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
			runCutoutGapDetection();
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
			layerStore.setHighlightedLayer(layerId);
		},
		setSelectedLayer(layerId: string | null) {
			layerStore.setSelectedLayer(layerId);
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
