<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import RotationKnob from './RotationKnob.svelte';

	let isDraggingKnob = $state(false);

	function handleToggle(layerId: string) {
		doodledialStore.toggleVisibility(layerId);
	}

	function handleShowAll() {
		doodledialStore.showAllLayers();
	}

	function handleHideAll() {
		doodledialStore.hideAllLayers();
	}

	function handleSelect(layerId: string) {
		if (isDraggingKnob) return;
		const currentSelected = doodledialStore.selectedLayer;
		if (currentSelected === layerId) {
			doodledialStore.setSelectedLayer(null);
		} else {
			doodledialStore.setSelectedLayer(layerId);
		}
	}

	function handleMouseEnter(layerId: string) {
		if (isDraggingKnob) return;
		doodledialStore.setHighlightedLayer(layerId);
	}

	function handleMouseLeave() {
		if (isDraggingKnob) return;
		const currentSelected = doodledialStore.selectedLayer;
		if (currentSelected) {
			const selectedLayer = doodledialStore.layers.find((l) => l.id === currentSelected);
			doodledialStore.setHighlightedLayer(selectedLayer?.svgElementId || null);
		} else {
			doodledialStore.setHighlightedLayer(null);
		}
	}

	function handleRotationChange(layerId: string, rotation: number) {
		doodledialStore.setLayerRotation(layerId, rotation);
	}

	function handleDragStart(svgElementId: string) {
		isDraggingKnob = true;
		doodledialStore.setHighlightedLayer(svgElementId);
	}

	function handleDragEnd() {
		isDraggingKnob = false;
		const currentSelected = doodledialStore.selectedLayer;
		if (currentSelected) {
			const selectedLayer = doodledialStore.layers.find((l) => l.id === currentSelected);
			doodledialStore.setHighlightedLayer(selectedLayer?.svgElementId || null);
		} else {
			doodledialStore.setHighlightedLayer(null);
		}
	}

	const hiddenCount = $derived(doodledialStore.layers.filter((l) => !l.visible).length);
	const totalCount = $derived(doodledialStore.layers.length);
</script>

{#if doodledialStore.layers.length > 0}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-700">Layers</span>
				<span
					class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full cursor-default"
					title="{hiddenCount} of {totalCount} layers are hidden"
				>
					{hiddenCount}/{totalCount}
				</span>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={handleShowAll}
					class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
				>
					Show All
				</button>
				<span class="text-gray-300">|</span>
				<button
					type="button"
					onclick={handleHideAll}
					class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
				>
					Hide All
				</button>
			</div>
		</div>

		<div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
			<ul class="divide-y divide-gray-100">
				{#each doodledialStore.layers as layer (layer.id)}
					<li
						class="flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer list-none {doodledialStore.selectedLayer ===
						layer.id
							? 'bg-indigo-50 border-l-2 border-indigo-500'
							: 'hover:bg-gray-50'}"
						role="menuitem"
						tabindex="0"
						onclick={() => handleSelect(layer.id)}
						onkeydown={(e) => e.key === 'Enter' && handleSelect(layer.id)}
						onmouseenter={() => handleMouseEnter(layer.svgElementId)}
						onmouseleave={handleMouseLeave}
					>
						<div class="flex items-center justify-between flex-1 min-w-0">
							<span class="text-sm text-gray-700 font-mono truncate">
								{layer.name}
							</span>
							<div class="flex items-center gap-2 shrink-0">
								<RotationKnob
									value={layer.rotation}
									onchange={(rotation) => handleRotationChange(layer.id, rotation)}
									label="Rotate {layer.name}"
									disabled={!layer.visible}
									ondragstart={() => handleDragStart(layer.svgElementId)}
									ondragend={handleDragEnd}
								/>
							</div>
						</div>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								handleToggle(layer.id);
							}}
							class="p-1 rounded hover:bg-gray-200 transition-colors"
						>
							{#if layer.visible}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-gray-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-gray-400"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
