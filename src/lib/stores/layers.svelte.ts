import type { LabelPlacementStatus, Layer, LayerGroup } from '$lib/types/doodledial';
import { SvelteMap } from 'svelte/reactivity';

const GROUP_COLORS = [
	'#e6194b',
	'#3cb44b',
	'#4363d8',
	'#f58231',
	'#911eb4',
	'#42d4f4',
	'#f032e6',
	'#bfef45',
	'#fabed4',
	'#469990',
	'#dcbeff',
	'#9a6324',
	'#800000',
	'#aaffc3',
	'#808000',
	'#ffd8b1',
	'#000075',
	'#a9a9a9',
	'#e6beff',
	'#ffc107'
];

export interface LayerStoreOptions {
	onChange?: () => void;
}

export function createLayerStore(options?: LayerStoreOptions) {
	const { onChange } = options ?? {};

	const layers: SvelteMap<string, Layer> = new SvelteMap();
	const groups: SvelteMap<string, LayerGroup> = new SvelteMap();
	let groupColorIndex = $state(0);
	let highlightedLayer = $state<string | null>(null);
	let selectedLayer = $state<string | null>(null);

	const layerArray = $derived(Array.from(layers.values()).sort((a, b) => a.index - b.index));
	const hiddenLayerCount = $derived(Array.from(layers.values()).filter((l) => !l.visible).length);

	function notifyChange() {
		onChange?.();
	}

	function getLayer(id: string): Layer | undefined {
		return layers.get(id);
	}

	function addLayer(layerId: string, index: number, name: string, groupId: string = '') {
		const newLayer: Layer = {
			id: layerId,
			name,
			index,
			groupId,
			visible: true,
			rotation: 0,
			labelPlacementMode: 'auto',
			labelPlacementStatus: { status: 'placed' }
		};
		layers.set(layerId, newLayer);
		notifyChange();
	}

	function clearLayers() {
		layers.clear();
		clearGroups();
		selectedLayer = null;
		highlightedLayer = null;
		notifyChange();
	}

	function showAllLayers() {
		layers.forEach((layer) => {
			layers.set(layer.id, { ...layer, visible: true });
		});
		notifyChange();
	}

	function hideAllLayers() {
		layers.forEach((layer) => {
			layers.set(layer.id, { ...layer, visible: false });
		});
		notifyChange();
	}

	function toggleVisibility(id: string) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, { ...layer, visible: !layer.visible });
			notifyChange();
		}
	}

	function toggleGroupVisibility(groupId: string) {
		const groupLayers = Array.from(layers.values()).filter((l) => l.groupId === groupId);
		if (groupLayers.length === 0) return;
		const anyVisible = groupLayers.some((l) => l.visible);
		for (const layer of groupLayers) {
			layers.set(layer.id, { ...layer, visible: !anyVisible });
		}
		notifyChange();
	}

	function isGroupVisible(groupId: string): boolean {
		return Array.from(layers.values()).some((l) => l.groupId === groupId && l.visible);
	}

	function setLayerRotation(id: string, rotation: number) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, { ...layer, rotation });
			notifyChange();
		}
	}

	function applyLayerRotations(rotations: Record<string, number>) {
		Object.entries(rotations).forEach(([id, rotation]) => {
			const layer = layers.get(id);
			if (layer) {
				layers.set(id, { ...layer, rotation });
			}
		});
		notifyChange();
	}

	function setMarkLabelOffsetManual(id: string, labelOffsetX: number, labelOffsetY: number) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, {
				...layer,
				labelOffsetX,
				labelOffsetY,
				labelPlacementMode: 'manual'
			});
			notifyChange();
		}
	}

	function setMarkLabelOffsetAuto(id: string, labelOffsetX: number, labelOffsetY: number) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, {
				...layer,
				labelOffsetX,
				labelOffsetY,
				labelPlacementMode: 'auto'
			});
			notifyChange();
		}
	}

	function getMarkLabelOffset(
		id: string
	): { labelOffsetX: number; labelOffsetY: number } | undefined {
		const layer = layers.get(id);
		if (layer) {
			return {
				labelOffsetX: layer.labelOffsetX || 0,
				labelOffsetY: layer.labelOffsetY || 0
			};
		}
		return undefined;
	}

	function getMarkLabelPlacementMode(id: string): 'auto' | 'manual' {
		return layers.get(id)?.labelPlacementMode || 'auto';
	}

	function setMarkLabelPlacementStatus(id: string, status: LabelPlacementStatus) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, { ...layer, labelPlacementStatus: status });
		}
	}

	function getMarkLabelPlacementStatus(id: string): LabelPlacementStatus {
		return layers.get(id)?.labelPlacementStatus || { status: 'placed' };
	}

	function resetMarkLabelPlacementMode(id: string) {
		const layer = layers.get(id);
		if (layer) {
			layers.set(id, { ...layer, labelPlacementMode: 'auto' });
		}
	}

	function renumberLayersByAngle() {
		const sorted = Array.from(layers.values())
			.map((layer) => ({
				...layer,
				rotation: ((layer.rotation % 360) + 360) % 360
			}))
			.sort((a, b) => {
				if (a.rotation !== b.rotation) return a.rotation - b.rotation;
				return a.index - b.index;
			});

		sorted.forEach((layer, i) => {
			layers.set(layer.id, { ...layer, index: i + 1 });
		});
		notifyChange();
	}

	function addGroup(id: string, name: string) {
		const color = GROUP_COLORS[groupColorIndex % GROUP_COLORS.length];
		groupColorIndex++;
		groups.set(id, { id, name, color });
	}

	function clearGroups() {
		groups.clear();
		groupColorIndex = 0;
	}

	function getGroup(id: string): LayerGroup | undefined {
		return groups.get(id);
	}

	function reset() {
		layers.clear();
		clearGroups();
		selectedLayer = null;
		highlightedLayer = null;
	}

	return {
		get layers() {
			return layerArray;
		},
		get groups() {
			return Array.from(groups.values());
		},
		get hiddenLayerCount() {
			return hiddenLayerCount;
		},
		get highlightedLayer() {
			return highlightedLayer;
		},
		get selectedLayer() {
			return selectedLayer;
		},
		getLayer,
		addLayer,
		clearLayers,
		addGroup,
		clearGroups,
		getGroup,
		showAllLayers,
		hideAllLayers,
		toggleVisibility,
		toggleGroupVisibility,
		isGroupVisible,
		setLayerRotation,
		applyLayerRotations,
		setMarkLabelOffsetManual,
		setMarkLabelOffsetAuto,
		getMarkLabelOffset,
		getMarkLabelPlacementMode,
		setMarkLabelPlacementStatus,
		getMarkLabelPlacementStatus,
		resetMarkLabelPlacementMode,
		renumberLayersByAngle,
		setHighlightedLayer(layerId: string | null) {
			highlightedLayer = layerId;
		},
		setSelectedLayer(layerId: string | null) {
			selectedLayer = layerId;
		},
		reset
	};
}
