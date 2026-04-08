import type { DialConfig, Layer, SVGContent } from '$lib/types/doodledial';
import { DEFAULT_DIAL_CONFIG } from '$lib/types/doodledial';

function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

function createDoodledialStore() {
	let config = $state<DialConfig>({ ...DEFAULT_DIAL_CONFIG });
	let svgContent = $state<SVGContent | null>(null);
	let combinedSvg = $state<string | null>(null);
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);
	let layers = $state<Layer[]>([]);

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
		addLayer(pathData: string, name?: string) {
			const newLayer: Layer = {
				id: generateId(),
				name: name || `Layer ${layers.length + 1}`,
				visible: true,
				pathData
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
