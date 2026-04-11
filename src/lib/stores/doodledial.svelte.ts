import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';
import { SvelteMap } from 'svelte/reactivity';


function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);
	const layers : SvelteMap<string, Layer> = new SvelteMap();
	let highlightedLayer = $state<string | null>(null);
	let selectedLayer = $state<string | null>(null);

	function getLayerArray(): Layer[] {
		return Array.from(layers.values()).sort((a, b) => a.index - b.index);
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
		addLayer(layerId: string, index: number, name: string) {
			const newLayer: Layer = {
				id: layerId,
				name: name,
				index: index,
				visible: true,
				rotation: 0
			};
			layers.set(layerId, newLayer);
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
		},
		showAllLayers() {
			layers.forEach((layer) => {
				layers.set(layer.id, { ...layer, visible: true });
			});
		},
		hideAllLayers() {
			layers.forEach((layer) => {
				layers.set(layer.id, { ...layer, visible: false });
			});
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
		}
	};
}

export const doodledialStore = createDoodledialStore();
