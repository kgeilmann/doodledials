import { beforeEach, describe, expect, it } from 'vitest';
import { doodledialStore } from '$lib/stores/doodledial.svelte';

describe('label placement store state', () => {
	beforeEach(() => {
		doodledialStore.reset();
		doodledialStore.addLayer('layer-1', 1, 'Layer 1');
	});

	it('defaults layers to auto placement mode and placed status', () => {
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('auto');
		expect(doodledialStore.getLayerLabelPlacementStatus('layer-1')?.status).toBe('placed');
	});

	it('switches to manual mode after explicit manual update', () => {
		doodledialStore.setLayerLabelOffsetManual('layer-1', 12, -4);
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('manual');
	});

	it('can reset mode to auto', () => {
		doodledialStore.setLayerLabelOffsetManual('layer-1', 3, 2);
		doodledialStore.resetLayerLabelPlacementMode('layer-1');
		expect(doodledialStore.getLayerLabelPlacementMode('layer-1')).toBe('auto');
	});
});
