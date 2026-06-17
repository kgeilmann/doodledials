import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createLayerStore } from './layers.svelte';

describe('LayerStore', () => {
	let store: ReturnType<typeof createLayerStore>;

	beforeEach(() => {
		store = createLayerStore();
	});

	describe('initial state', () => {
		it('starts with empty layers', () => {
			expect(store.layers).toEqual([]);
			expect(store.hiddenLayerCount).toBe(0);
		});

		it('starts with no selection or highlight', () => {
			expect(store.selectedLayer).toBeNull();
			expect(store.highlightedLayer).toBeNull();
		});
	});

	describe('addLayer', () => {
		it('adds a layer and returns it via getLayer', () => {
			store.addLayer('layer-1', 1, 'Layer 1');
			expect(store.layers).toHaveLength(1);
			const layer = store.getLayer('layer-1');
			expect(layer).toBeDefined();
			expect(layer!.id).toBe('layer-1');
			expect(layer!.name).toBe('Layer 1');
			expect(layer!.index).toBe(1);
			expect(layer!.visible).toBe(true);
			expect(layer!.rotation).toBe(0);
			expect(layer!.labelPlacementMode).toBe('auto');
			expect(layer!.labelPlacementStatus).toEqual({ status: 'placed' });
		});

		it('sorts layers by index', () => {
			store.addLayer('b', 2, 'B');
			store.addLayer('a', 1, 'A');
			expect(store.layers[0].id).toBe('a');
			expect(store.layers[1].id).toBe('b');
		});

		it('returns undefined for non-existent layer', () => {
			expect(store.getLayer('non-existent')).toBeUndefined();
		});
	});

	describe('toggleVisibility', () => {
		it('toggles layer visibility', () => {
			store.addLayer('layer-1', 1, 'Layer 1');
			expect(store.getLayer('layer-1')!.visible).toBe(true);
			store.toggleVisibility('layer-1');
			expect(store.getLayer('layer-1')!.visible).toBe(false);
			store.toggleVisibility('layer-1');
			expect(store.getLayer('layer-1')!.visible).toBe(true);
		});

		it('does nothing for non-existent layer', () => {
			store.toggleVisibility('ghost');
			expect(store.layers).toHaveLength(0);
		});

		it('updates hiddenLayerCount', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			expect(store.hiddenLayerCount).toBe(0);
			store.toggleVisibility('a');
			expect(store.hiddenLayerCount).toBe(1);
			store.toggleVisibility('a');
			expect(store.hiddenLayerCount).toBe(0);
		});
	});

	describe('setLayerRotation', () => {
		it('sets rotation on a layer', () => {
			store.addLayer('layer-1', 1, 'Layer 1');
			store.setLayerRotation('layer-1', 45);
			expect(store.getLayer('layer-1')!.rotation).toBe(45);
		});

		it('does nothing for non-existent layer', () => {
			store.setLayerRotation('ghost', 45);
			expect(store.getLayer('ghost')).toBeUndefined();
		});
	});

	describe('applyLayerRotations', () => {
		it('applies multiple rotations', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.applyLayerRotations({ a: 10, b: 20 });
			expect(store.getLayer('a')!.rotation).toBe(10);
			expect(store.getLayer('b')!.rotation).toBe(20);
		});

		it('skips non-existent layers', () => {
			store.addLayer('a', 1, 'A');
			store.applyLayerRotations({ a: 10, ghost: 30 });
			expect(store.getLayer('a')!.rotation).toBe(10);
		});
	});

	describe('selection and highlighting', () => {
		it('setSelectedLayer updates selectedLayer', () => {
			store.addLayer('a', 1, 'A');
			store.setSelectedLayer('a');
			expect(store.selectedLayer).toBe('a');
			store.setSelectedLayer(null);
			expect(store.selectedLayer).toBeNull();
		});

		it('setHighlightedLayer updates highlightedLayer', () => {
			store.addLayer('a', 1, 'A');
			store.setHighlightedLayer('a');
			expect(store.highlightedLayer).toBe('a');
			store.setHighlightedLayer(null);
			expect(store.highlightedLayer).toBeNull();
		});
	});

	describe('showAllLayers and hideAllLayers', () => {
		it('showAllLayers makes all layers visible', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.toggleVisibility('a');
			store.showAllLayers();
			expect(store.getLayer('a')!.visible).toBe(true);
			expect(store.getLayer('b')!.visible).toBe(true);
			expect(store.hiddenLayerCount).toBe(0);
		});

		it('hideAllLayers hides all layers', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.hideAllLayers();
			expect(store.getLayer('a')!.visible).toBe(false);
			expect(store.getLayer('b')!.visible).toBe(false);
			expect(store.hiddenLayerCount).toBe(2);
		});
	});

	describe('clearLayers', () => {
		it('removes all layers', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.setSelectedLayer('a');
			store.clearLayers();
			expect(store.layers).toHaveLength(0);
			expect(store.selectedLayer).toBeNull();
		});
	});

	describe('label placement methods', () => {
		it('setLayerLabelOffsetManual sets offset and mode to manual', () => {
			store.addLayer('a', 1, 'A');
			store.setLayerLabelOffsetManual('a', 10, 20);
			const offset = store.getLayerLabelOffset('a');
			expect(offset).toEqual({ labelOffsetX: 10, labelOffsetY: 20 });
			expect(store.getLayerLabelPlacementMode('a')).toBe('manual');
		});

		it('setLayerLabelOffsetAuto sets offset and mode to auto', () => {
			store.addLayer('a', 1, 'A');
			store.setLayerLabelOffsetManual('a', 10, 20);
			store.setLayerLabelOffsetAuto('a', 5, 5);
			const offset = store.getLayerLabelOffset('a');
			expect(offset).toEqual({ labelOffsetX: 5, labelOffsetY: 5 });
			expect(store.getLayerLabelPlacementMode('a')).toBe('auto');
		});

		it('getLayerLabelOffset returns undefined for non-existent layer', () => {
			expect(store.getLayerLabelOffset('ghost')).toBeUndefined();
		});

		it('getLayerLabelOffset returns zeros when no offset set', () => {
			store.addLayer('a', 1, 'A');
			expect(store.getLayerLabelOffset('a')).toEqual({ labelOffsetX: 0, labelOffsetY: 0 });
		});

		it('getLayerLabelPlacementStatus returns placed as default', () => {
			store.addLayer('a', 1, 'A');
			expect(store.getLayerLabelPlacementStatus('a')).toEqual({ status: 'placed' });
		});

		it('setLayerLabelPlacementStatus updates status', () => {
			store.addLayer('a', 1, 'A');
			store.setLayerLabelPlacementStatus('a', {
				status: 'error',
				reason: 'no-valid-position-within-radius'
			});
			expect(store.getLayerLabelPlacementStatus('a')).toEqual({
				status: 'error',
				reason: 'no-valid-position-within-radius'
			});
		});

		it('resetLayerLabelPlacementMode resets mode to auto', () => {
			store.addLayer('a', 1, 'A');
			store.setLayerLabelOffsetManual('a', 10, 20);
			expect(store.getLayerLabelPlacementMode('a')).toBe('manual');
			store.resetLayerLabelPlacementMode('a');
			expect(store.getLayerLabelPlacementMode('a')).toBe('auto');
		});

		it('getLayerLabelPlacementMode returns auto as default', () => {
			store.addLayer('a', 1, 'A');
			expect(store.getLayerLabelPlacementMode('a')).toBe('auto');
		});
	});

	describe('onChange callback', () => {
		it('calls onChange when a layer is added', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on toggleVisibility', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.toggleVisibility('a');
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on setLayerRotation', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.setLayerRotation('a', 45);
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on applyLayerRotations', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.applyLayerRotations({ a: 90 });
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on setLayerLabelOffsetManual', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.setLayerLabelOffsetManual('a', 10, 20);
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on showAllLayers', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			onChange.mockClear();
			store.showAllLayers();
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on hideAllLayers', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.hideAllLayers();
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('calls onChange on clearLayers', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.clearLayers();
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('does NOT call onChange for selection changes', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.setSelectedLayer('a');
			expect(onChange).not.toHaveBeenCalled();
		});

		it('does NOT call onChange for highlight changes', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.setHighlightedLayer('a');
			expect(onChange).not.toHaveBeenCalled();
		});

		it('does NOT call onChange for read operations', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			onChange.mockClear();
			store.getLayer('a');
			store.getLayerLabelOffset('a');
			store.getLayerLabelPlacementMode('a');
			store.getLayerLabelPlacementStatus('a');
			expect(onChange).not.toHaveBeenCalled();
		});

		it('calls onChange only once for a batch of changes', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			onChange.mockClear();
			store.applyLayerRotations({ a: 10, b: 20 });
			expect(onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe('renumberLayersByAngle', () => {
		it('sorts layers by rotation angle and reassigns indexes', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.addLayer('c', 3, 'C');
			store.setLayerRotation('a', 180);
			store.setLayerRotation('b', 0);
			store.setLayerRotation('c', 90);
			store.renumberLayersByAngle();
			expect(store.getLayer('a')!.index).toBe(3);
			expect(store.getLayer('b')!.index).toBe(1);
			expect(store.getLayer('c')!.index).toBe(2);
			expect(store.layers[0].id).toBe('b');
			expect(store.layers[1].id).toBe('c');
			expect(store.layers[2].id).toBe('a');
		});

		it('handles negative rotation values', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.setLayerRotation('a', -90);
			store.setLayerRotation('b', 0);
			store.renumberLayersByAngle();
			expect(store.getLayer('a')!.index).toBe(2);
			expect(store.getLayer('b')!.index).toBe(1);
			expect(store.layers[0].id).toBe('b');
			expect(store.layers[1].id).toBe('a');
		});

		it('handles angles > 360', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			store.setLayerRotation('a', 450);
			store.setLayerRotation('b', 90);
			store.renumberLayersByAngle();
			expect(store.getLayer('a')!.index).toBe(1);
			expect(store.getLayer('b')!.index).toBe(2);
		});

		it('tie-breaks equal angles by current index', () => {
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 3, 'B');
			store.addLayer('c', 2, 'C');
			store.renumberLayersByAngle();
			expect(store.layers[0].id).toBe('a');
			expect(store.layers[1].id).toBe('c');
			expect(store.layers[2].id).toBe('b');
		});

		it('works with a single layer', () => {
			store.addLayer('a', 5, 'A');
			store.renumberLayersByAngle();
			expect(store.layers).toHaveLength(1);
			expect(store.getLayer('a')!.index).toBe(1);
		});

		it('calls onChange', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			store.addLayer('b', 2, 'B');
			onChange.mockClear();
			store.renumberLayersByAngle();
			expect(onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe('reset', () => {
		it('clears all layers and selection', () => {
			store.addLayer('a', 1, 'A');
			store.setSelectedLayer('a');
			store.reset();
			expect(store.layers).toHaveLength(0);
			expect(store.selectedLayer).toBeNull();
			expect(store.highlightedLayer).toBeNull();
			expect(store.hiddenLayerCount).toBe(0);
		});
	});

	describe('groups', () => {
		it('starts with empty groups', () => {
			expect(store.groups).toEqual([]);
		});

		it('addGroup adds a group', () => {
			store.addGroup('group-1', 'Disc 1');
			expect(store.groups).toHaveLength(1);
			expect(store.groups[0]).toEqual({ id: 'group-1', name: 'Disc 1', color: '#e6194b' });
		});

		it('getGroup returns a group by id', () => {
			store.addGroup('g1', 'G1');
			expect(store.getGroup('g1')).toEqual({ id: 'g1', name: 'G1', color: '#e6194b' });
		});

		it('getGroup returns undefined for non-existent group', () => {
			expect(store.getGroup('ghost')).toBeUndefined();
		});

		it('clearGroups removes all groups', () => {
			store.addGroup('g1', 'G1');
			store.addGroup('g2', 'G2');
			store.clearGroups();
			expect(store.groups).toEqual([]);
		});

		it('clearLayers also clears groups', () => {
			store.addGroup('g1', 'G1');
			store.clearLayers();
			expect(store.groups).toEqual([]);
		});

		it('reset also clears groups', () => {
			store.addGroup('g1', 'G1');
			store.reset();
			expect(store.groups).toEqual([]);
		});

		it('addLayer stores groupId on the layer', () => {
			store.addGroup('g1', 'Disc 1');
			store.addLayer('layer-1', 1, 'Layer 1', 'g1');
			expect(store.getLayer('layer-1')!.groupId).toBe('g1');
		});
	});

	describe('toggleGroupVisibility', () => {
		it('hides all layers in a group when any are visible', () => {
			store.addGroup('g1', 'Disc 1');
			store.addLayer('a', 1, 'A', 'g1');
			store.addLayer('b', 2, 'B', 'g1');
			store.toggleGroupVisibility('g1');
			expect(store.getLayer('a')!.visible).toBe(false);
			expect(store.getLayer('b')!.visible).toBe(false);
		});

		it('shows all layers in a group when all are hidden', () => {
			store.addGroup('g1', 'Disc 1');
			store.addLayer('a', 1, 'A', 'g1');
			store.addLayer('b', 2, 'B', 'g1');
			store.toggleVisibility('a');
			store.toggleVisibility('b');
			store.toggleGroupVisibility('g1');
			expect(store.getLayer('a')!.visible).toBe(true);
			expect(store.getLayer('b')!.visible).toBe(true);
		});

		it('does not affect layers in other groups', () => {
			store.addGroup('g1', 'Disc 1');
			store.addGroup('g2', 'Disc 2');
			store.addLayer('a', 1, 'A', 'g1');
			store.addLayer('b', 2, 'B', 'g2');
			store.toggleGroupVisibility('g1');
			expect(store.getLayer('b')!.visible).toBe(true);
		});

		it('calls onChange', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addGroup('g1', 'Disc 1');
			store.addLayer('a', 1, 'A', 'g1');
			onChange.mockClear();
			store.toggleGroupVisibility('g1');
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('does nothing for non-existent group', () => {
			const onChange = vi.fn();
			store = createLayerStore({ onChange });
			store.addLayer('a', 1, 'A');
			onChange.mockClear();
			store.toggleGroupVisibility('ghost');
			expect(store.getLayer('a')!.visible).toBe(true);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('isGroupVisible', () => {
		it('returns true when at least one layer in group is visible', () => {
			store.addGroup('g1', 'Disc 1');
			store.addLayer('a', 1, 'A', 'g1');
			store.addLayer('b', 2, 'B', 'g1');
			store.toggleVisibility('a');
			expect(store.isGroupVisible('g1')).toBe(true);
		});

		it('returns false when all layers in group are hidden', () => {
			store.addGroup('g1', 'Disc 1');
			store.addLayer('a', 1, 'A', 'g1');
			store.addLayer('b', 2, 'B', 'g1');
			store.toggleVisibility('a');
			store.toggleVisibility('b');
			expect(store.isGroupVisible('g1')).toBe(false);
		});

		it('returns false for empty group', () => {
			store.addGroup('g1', 'Disc 1');
			expect(store.isGroupVisible('g1')).toBe(false);
		});
	});
});
