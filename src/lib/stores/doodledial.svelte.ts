import type { DialConfig, LabelPlacementStatus, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { globalConfig as defaultGlobalConfig } from '$lib/stores/global-config.svelte';
import { createLayerStore } from './layers.svelte';
import { createDetectionStore } from './detection.svelte';
import { createLabelPlacementStore } from './label-placement.svelte';
import { parseSvgPaths } from '$lib/utils/doodledial';

interface GlobalConfigLike {
	diameter: number;
	autoLabelPlacementEnabled: boolean;
	titleFontFamily: string;
	cutoutLabelFontSize: number;
	dialTitleFontSize: number;
	defaultNumberingScheme: 'continuous' | 'independent';
	defaultTitleFormat: 'none' | 'name' | 'numbered' | 'both';
}

function createDoodledialStore(options?: { globalConfig?: GlobalConfigLike }) {
	const globalConfig = options?.globalConfig ?? defaultGlobalConfig;
	let config = $state<DialConfig>({
		...DEFAULT_DIAL_CONFIG,
		diameter: globalConfig.diameter,
		cutoutLabelFontSize: globalConfig.cutoutLabelFontSize,
		titleFontFamily: globalConfig.titleFontFamily,
		numberingScheme: globalConfig.defaultNumberingScheme,
		titleFormat: globalConfig.defaultTitleFormat
	});
	let svgContent = $state<SVGContent | null>(null);
	let originalRawSvg = $state<string | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);

	const detectionStore = createDetectionStore({
		getLayers: () => layerStore.layers,
		getCombinedSvg: () => combinedSvg,
		getConfig: () => ({ solverGapMm: config.solverGapMm, diameter: config.diameter }),
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
		getIsPlacementEnabled: () => globalConfig.autoLabelPlacementEnabled
	});

	let dialTitle = $state<string>('');
	let dialTitleX = $state<number>(100);
	let dialTitleY = $state<number>(20);
	let dialTitleFontSize = $state<number>(globalConfig.dialTitleFontSize);

	return {
		get dialTitle() {
			return dialTitle;
		},
		get dialTitleX() {
			return dialTitleX;
		},
		get dialTitleY() {
			return dialTitleY;
		},
		get dialTitleFontSize() {
			return dialTitleFontSize;
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
		get groups() {
			return layerStore.groups;
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

		get isDetecting() {
			return detectionStore.isDetecting;
		},
		get overlaps() {
			return detectionStore.overlaps;
		},
		get cutoutGaps() {
			return detectionStore.cutoutGaps;
		},
		get autoLabelPlacementEnabled() {
			return globalConfig.autoLabelPlacementEnabled;
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
		setDialTitle(text: string) {
			dialTitle = text;
		},
		setDialTitlePosition(x: number, y: number) {
			dialTitleX = x;
			dialTitleY = y;
		},
		setDialTitleFontSize(size: number) {
			dialTitleFontSize = size;
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
		setCutoutLabelFontSize(size: number) {
			config = { ...config, cutoutLabelFontSize: size };
			labelPlacementStore.schedule();
		},
		setTitleFontFamily(fontFamily: string) {
			config = { ...config, titleFontFamily: fontFamily };
		},
		setNumberingScheme(scheme: 'continuous' | 'independent') {
			config = { ...config, numberingScheme: scheme };
		},
		setTitleFormat(format: 'none' | 'name' | 'numbered' | 'both') {
			config = { ...config, titleFormat: format };
		},
		setSizeToFit(sizeToFit: boolean) {
			config = { ...config, sizeToFit };
			if (originalRawSvg) {
				const parsed = parseSvgPaths(originalRawSvg, sizeToFit);
				layerStore.clearLayers();
				layerStore.clearGroups();
				for (const group of parsed.groups ?? []) {
					layerStore.addGroup(group.id, group.name);
				}
				for (const layer of parsed.layers) {
					layerStore.addLayer(layer.id, layer.index, layer.name, layer.groupId);
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
		setSolverGapMm(solverGapMm: number) {
			config = { ...config, solverGapMm };
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
		setDetecting(checking: boolean) {
			detectionStore.setDetecting(checking);
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
		addGroup(id: string, name: string) {
			layerStore.addGroup(id, name);
		},
		addLayer(layerId: string, index: number, name: string, groupId?: string) {
			layerStore.addLayer(layerId, index, name, groupId ?? '');
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
		setMarkLabelOffset(id: string, labelOffsetX: number, labelOffsetY: number) {
			layerStore.setMarkLabelOffsetManual(id, labelOffsetX, labelOffsetY);
		},
		setMarkLabelOffsetManual(id: string, labelOffsetX: number, labelOffsetY: number) {
			layerStore.setMarkLabelOffsetManual(id, labelOffsetX, labelOffsetY);
		},
		setMarkLabelOffsetAuto(id: string, labelOffsetX: number, labelOffsetY: number) {
			layerStore.setMarkLabelOffsetAuto(id, labelOffsetX, labelOffsetY);
		},
		getMarkLabelOffset(id: string) {
			return layerStore.getMarkLabelOffset(id);
		},
		getMarkLabelPlacementMode(id: string) {
			return layerStore.getMarkLabelPlacementMode(id);
		},
		setMarkLabelPlacementStatus(id: string, status: LabelPlacementStatus) {
			layerStore.setMarkLabelPlacementStatus(id, status);
		},
		getMarkLabelPlacementStatus(id: string) {
			return layerStore.getMarkLabelPlacementStatus(id);
		},
		resetMarkLabelPlacementMode(id: string) {
			layerStore.resetMarkLabelPlacementMode(id);
		},
		requestMarkLabelAutoPlacement(id: string) {
			return labelPlacementStore.requestLayerAutoPlacement(id, !!layerStore.getLayer(id));
		},
		showAllLayers() {
			layerStore.showAllLayers();
		},
		hideAllLayers() {
			layerStore.hideAllLayers();
		},
		toggleGroupVisibility(groupId: string) {
			layerStore.toggleGroupVisibility(groupId);
		},
		isGroupVisible(groupId: string): boolean {
			return layerStore.isGroupVisible(groupId);
		},
		clearLayers() {
			layerStore.clearLayers();
		},
		renumberLayersByAngle() {
			layerStore.renumberLayersByAngle();
		},
		reset() {
			labelPlacementStore.reset();
			config = {
				...DEFAULT_DIAL_CONFIG,
				diameter: globalConfig.diameter,
				cutoutLabelFontSize: globalConfig.cutoutLabelFontSize,
				titleFontFamily: globalConfig.titleFontFamily,
				numberingScheme: globalConfig.defaultNumberingScheme,
				titleFormat: globalConfig.defaultTitleFormat
			};
			svgContent = null;
			originalRawSvg = null;
			combinedSvg = null;
			isLoading = false;
			error = null;
			layerStore.reset();
			detectionStore.reset();
			dialTitle = '';
			dialTitleX = 100;
			dialTitleY = 20;
			dialTitleFontSize = globalConfig.dialTitleFontSize;
		}
	};
}

export { createDoodledialStore };
export const doodledialStore = createDoodledialStore();
