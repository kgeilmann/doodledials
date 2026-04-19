<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { detectOverlaps } from '$lib/utils/overlap-detection';
	import type { DialConfig } from '$lib/types/doodledial';
	import RotationKnob from './RotationKnob.svelte';

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
		const currentSelected = doodledialStore.selectedLayer;
		if (currentSelected === layerId) {
			doodledialStore.setSelectedLayer(null);
		} else {
			doodledialStore.setSelectedLayer(layerId);
		}
	}

	function handleMouseEnter(layerId: string) {
		doodledialStore.setHighlightedLayer(layerId);
	}

	function handleMouseLeave() {
		const currentSelected = doodledialStore.selectedLayer;
		doodledialStore.setHighlightedLayer(currentSelected || null);
	}

	function handleRotationChange(layerId: string, rotation: number) {
		doodledialStore.setLayerRotation(layerId, rotation);
	}

	const hiddenCount = $derived(doodledialStore.layers.filter((l) => !l.visible).length);
	const totalCount = $derived(doodledialStore.layers.length);

	const isChecking = $derived(doodledialStore.checkingOverlaps);
	const hasSufficientLayers = $derived(doodledialStore.layers.length >= 2);
	const overlapsMap = $derived(doodledialStore.overlaps);

	async function handleCheckOverlaps() {
		if (!doodledialStore.svgContent) return;

		doodledialStore.setCheckingOverlaps(true);
		doodledialStore.clearOverlaps();

		try {
			const overlaps = await detectOverlaps(
				doodledialStore.layers,
				doodledialStore.svgContent,
				doodledialStore.config as DialConfig
			);
			doodledialStore.setOverlaps(overlaps);
		} catch (err) {
			console.error('Overlap detection failed:', err);
		} finally {
			doodledialStore.setCheckingOverlaps(false);
		}
	}

	function getOverlappingLayers(layerId: string): string[] {
		return Array.from(overlapsMap.get(layerId) || []);
	}
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
				<span class="text-gray-300">|</span>
				<button
					type="button"
					onclick={() => doodledialStore.toggleLabelEditMode()}
					class="text-xs {doodledialStore.labelEditMode
						? 'text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded'
						: 'text-indigo-600 hover:text-indigo-800 font-medium'}"
				>
					{doodledialStore.labelEditMode ? 'Done' : 'Edit Labels'}
				</button>
				<span class="text-gray-300">|</span>
				<button
					type="button"
					onclick={handleCheckOverlaps}
					disabled={!hasSufficientLayers || isChecking}
					class="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isChecking ? 'Checking...' : 'Check Overlaps'}
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
						onmouseenter={() => handleMouseEnter(layer.id)}
						onmouseleave={handleMouseLeave}
					>
						<div class="flex items-center justify-between flex-1 min-w-0 gap-2">
							<span class="text-sm text-gray-700 font-mono truncate">
								{layer.name}
								{#if getOverlappingLayers(layer.id).length > 0}
									<span
										class="inline-flex items-center gap-1 text-xs text-amber-600 ml-1"
										title="Overlaps with: {getOverlappingLayers(layer.id)
											.map((id) => doodledialStore.getLayer(id)?.name || id)
											.join(', ')}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v6a1 1 0 002 0V6a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
									</span>
								{/if}
							</span>
							<div class="flex items-center gap-2 shrink-0">
								<RotationKnob
									value={layer.rotation}
									onchange={(rotation) => handleRotationChange(layer.id, rotation)}
									label="Rotate {layer.name}"
									disabled={!layer.visible || doodledialStore.labelEditMode}
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
