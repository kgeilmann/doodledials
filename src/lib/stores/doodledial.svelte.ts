import type { DialConfig, LabelPlacementStatus, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { globalConfig as defaultGlobalConfig } from '$lib/stores/global-config.svelte';
import { createLayerStore } from './layers.svelte';
import { createDetectionStore } from './detection.svelte';
import { createLabelPlacementStore } from './label-placement.svelte';
import { parseSvgPaths } from '$lib/utils/doodledial';

interface GlobalConfigLike {
	diameter: number;
	pathLabelOptimizerEnabled: boolean;
	titleFontFamily: string;
}

function createDoodledialStore(options?: { globalConfig?: GlobalConfigLike }) {
	const globalConfig = options?.globalConfig ?? defaultGlobalConfig;
	let config = $state<DialConfig>({
		...DEFAULT_DIAL_CONFIG,
		diameter: globalConfig.diameter,
		titleFontFamily: globalConfig.titleFontFamily
	});
	let svgContent = $state<SVGContent | null>(null);
	let originalRawSvg = $state<string | null>(null);
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

	const labelPlacementStore = createLabelPlacementStore({
		getIsPlacementEnabled: () => globalConfig.pathLabelOptimizerEnabled
	});

	let discTitle = $state<string>('');
	let discTitleX = $state<number>(100);
	let discTitleY = $state<number>(20);
	let discTitleFontSize = $state<number>(12);

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
		get originalRawSvg() {
			return originalRawSvg;
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
			if (!Number.isFinite(diameter)) return;
			const clamped = Math.min(Math.max(diameter, config.minDiameter), config.maxDiameter);
			config = { ...config, diameter: clamped };
		},
		setCenterHoleDiameter(centerHoleDiameter: number) {
			if (!Number.isFinite(centerHoleDiameter)) return;
			const clamped = Math.min(Math.max(centerHoleDiameter, 0), 3);
			config = { ...config, centerHoleDiameter: clamped };
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
			labelPlacementStore.schedule();
		},
		setOffsetY(offsetY: number) {
			config = { ...config, offsetY };
			labelPlacementStore.schedule();
		},
		setScale(scale: number) {
			config = { ...config, scale };
			labelPlacementStore.schedule();
		},
		setPathLabelFontSize(size: number) {
			config = { ...config, pathLabelFontSize: size };
			labelPlacementStore.schedule();
		},
		setTitleFontFamily(fontFamily: string) {
			config = { ...config, titleFontFamily: fontFamily };
		},
		setSizeToFit(sizeToFit: boolean) {
			config = { ...config, sizeToFit };
			if (originalRawSvg) {
				const parsed = parseSvgPaths(originalRawSvg, sizeToFit);
				layerStore.clearLayers();
				for (const layer of parsed.layers) {
					layerStore.addLayer(layer.id, layer.index, layer.name);
				}
				svgContent = {
					raw: parsed.updatedSvg,
					filename: svgContent?.filename ?? ''
				};
			}
			labelPlacementStore.schedule();
		},
		setOriginalRawSvg(raw: string | null) {
			originalRawSvg = raw;
		},
		setOptimizerGapMm(optimizerGapMm: number) {
			config = { ...config, optimizerGapMm };
			detectionStore.runDetectionNow();
		},
		setAutoPlacementRunner(runner: (() => void | Promise<void>) | null) {
			labelPlacementStore.setRunner(runner);
		},
		runAutoPlacementNow() {
			return labelPlacementStore.runNow();
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
			layerStore.setLayerLabelOffsetManual(id, labelOffsetX, labelOffsetY);
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
			return labelPlacementStore.requestLayerAutoPlacement(id, !!layerStore.getLayer(id));
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
			labelPlacementStore.reset();
			config = {
				...DEFAULT_DIAL_CONFIG,
				diameter: globalConfig.diameter,
				titleFontFamily: globalConfig.titleFontFamily
			};
			svgContent = null;
			originalRawSvg = null;
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

export { createDoodledialStore };
export const doodledialStore = createDoodledialStore();
