import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';

function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);
	let layers = $state<Layer[]>([]);
	let highlightedLayer = $state<string | null>(null);
	let selectedLayer = $state<string | null>(null);

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
			return layers;
		},
		get highlightedLayer() {
			return highlightedLayer;
		},
		get selectedLayer() {
			return selectedLayer;
		},
		setDiameter(diameter: number) {
			config = { ...config, diameter };
		},
		setSvgContent(content: SVGContent | null) {
			svgContent = content;
		},
		setCombinedSvg(svg: string | null) {
			combinedSvg = svg;
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
		addLayer(svgElementId: string, name?: string) {
			const newLayer: Layer = {
				id: `layer-${layers.length}`,
				name: name || `Layer ${layers.length + 1}`,
				visible: true,
				svgElementId,
				rotation: 0
			};
			layers = [...layers, newLayer];
		},
		removeLayer(id: string) {
			layers = layers.filter((layer) => layer.id !== id);
		},
		toggleVisibility(id: string) {
			layers = layers.map((layer) =>
				layer.id === id ? { ...layer, visible: !layer.visible } : layer
			);
		},
		setLayerRotation(id: string, rotation: number) {
			layers = layers.map((layer) => (layer.id === id ? { ...layer, rotation } : layer));
		},
		showAllLayers() {
			layers = layers.map((layer) => ({ ...layer, visible: true }));
		},
		hideAllLayers() {
			layers = layers.map((layer) => ({ ...layer, visible: false }));
		},
		clearLayers() {
			layers = [];
		},
		reorderLayers(newOrder: Layer[]) {
			layers = newOrder;
		},
		reset() {
			config = { ...DEFAULT_DIAL_CONFIG };
			svgContent = null;
			combinedSvg = null;
			isLoading = false;
			error = null;
			layers = [];
		}
	};
}

export const doodledialStore = createDoodledialStore();
