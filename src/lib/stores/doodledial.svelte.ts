import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { SvelteMap } from 'svelte/reactivity';
import { detectOverlaps, detectCutoutGaps } from '$lib/utils/overlap-detection';

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
	let overlaps = $state<Map<string, Set<string>>>(new Map());
	let cutoutGaps = $state<Map<string, Set<string>>>(new Map());

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
		getLayer(id: string): Layer | undefined {
			return layers.get(id);
		},
		setDiameter(diameter: number) {
			config = { ...config, diameter };
		},
		setOffsetX(offsetX: number) {
			config = { ...config, offsetX };
		},
		setOffsetY(offsetY: number) {
			config = { ...config, offsetY };
		},
		setScale(scale: number) {
			config = { ...config, scale };
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
		setOverlaps(newOverlaps: Map<string, Set<string>>) {
			overlaps = newOverlaps;
		},
		getOverlappingLayers(layerId: string): string[] {
			return Array.from(overlaps.get(layerId) || []);
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
				rotation: 0
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
		setLayerLabelOffset(id: string, labelOffsetX: number, labelOffsetY: number) {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, labelOffsetX, labelOffsetY });
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
			config = { ...DEFAULT_DIAL_CONFIG };
			svgContent = null;
			combinedSvg = null;
			isLoading = false;
			error = null;
			layers.clear();
			labelEditMode = false;
		}
	};
}

export const doodledialStore = createDoodledialStore();
