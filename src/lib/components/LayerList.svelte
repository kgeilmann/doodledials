<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	let selectedLayerId = $state<string | null>(null);

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
		selectedLayerId = selectedLayerId === layerId ? null : layerId;
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

		<div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
			<ul class="divide-y divide-gray-100">
				{#each doodledialStore.layers as layer (layer.id)}
					<li>
						<button
							type="button"
							onclick={() => handleSelect(layer.id)}
							class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors {selectedLayerId ===
							layer.id
								? 'bg-indigo-50 border-l-2 border-indigo-500'
								: 'hover:bg-gray-50'}"
						>
							<input
								type="checkbox"
								checked={layer.visible}
								onclick={(e) => e.stopPropagation()}
								onchange={() => handleToggle(layer.id)}
								class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
							/>
							<span class="text-sm text-gray-700 font-mono">{layer.name}</span>
							{#if !layer.visible}
								<span class="text-xs text-gray-400">(hidden)</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
