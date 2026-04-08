<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleToggle(layerId: string) {
		doodledialStore.toggleVisibility(layerId);
	}

	function handleShowAll() {
		doodledialStore.showAllLayers();
	}

	function handleHideAll() {
		doodledialStore.hideAllLayers();
	}
</script>

{#if doodledialStore.layers.length > 0}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700">Layers</span>
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

		<ul class="space-y-2">
			{#each doodledialStore.layers as layer (layer.id)}
				<li class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
					<input
						type="checkbox"
						checked={layer.visible}
						onchange={() => handleToggle(layer.id)}
						class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					/>
					<span class="text-sm text-gray-700">{layer.name}</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
