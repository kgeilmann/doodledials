<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import RotationKnob from './RotationKnob.svelte';

	function handleToggle(layerId: string) {
		if (optimizerStore.optimizerPending) return;
		doodledialStore.toggleVisibility(layerId);
	}

	function handleShowAll() {
		if (optimizerStore.optimizerPending) return;
		doodledialStore.showAllLayers();
	}

	function handleHideAll() {
		if (optimizerStore.optimizerPending) return;
		doodledialStore.hideAllLayers();
	}

	function handleSelect(layerId: string) {
		if (optimizerStore.optimizerPending) return;
		const currentSelected = doodledialStore.selectedLayer;
		if (currentSelected === layerId) {
			doodledialStore.setSelectedLayer(null);
		} else {
			doodledialStore.setSelectedLayer(layerId);
		}
	}

	function handleMouseEnter(layerId: string) {
		if (optimizerStore.optimizerPending) return;
		doodledialStore.setHighlightedLayer(layerId);
	}

	function handleMouseLeave() {
		if (optimizerStore.optimizerPending) return;
		const currentSelected = doodledialStore.selectedLayer;
		doodledialStore.setHighlightedLayer(currentSelected || null);
	}

	function handleRotationChange(layerId: string, rotation: number) {
		if (optimizerStore.optimizerPending) return;
		doodledialStore.setLayerRotation(layerId, rotation);
	}

	const hiddenCount = $derived(doodledialStore.layers.filter((l) => !l.visible).length);
	const totalCount = $derived(doodledialStore.layers.length);

	const overlapsMap = $derived(doodledialStore.overlaps);
	const cutoutGapsMap = $derived(doodledialStore.cutoutGaps);

	function getOverlappingLayers(layerId: string): string[] {
		return Array.from((overlapsMap.get(layerId) || new Map()).keys());
	}

	function getOverlapPixelCount(layerId: string, overlappingLayerId: string): number {
		return overlapsMap.get(layerId)?.get(overlappingLayerId) || 0;
	}

	function formatOverlapTooltip(layerId: string): string {
		const overlappingIds = Array.from((overlapsMap.get(layerId) || new Map()).keys());
		if (overlappingIds.length === 0) return '';
		const details = overlappingIds
			.map(
				(id) =>
					`${doodledialStore.getLayer(id)?.name || id} (${getOverlapPixelCount(layerId, id)} px)`
			)
			.join(', ');
		return `Overlaps with: ${details}`;
	}

	function getCutoutGapLayers(layerId: string): string[] {
		return Array.from(cutoutGapsMap.get(layerId) || []);
	}

	const warningTriangleSvg =
		'<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v6a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
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
					onclick={() => doodledialStore.renumberLayersByAngle()}
					disabled={optimizerStore.optimizerPending}
					class="text-xs font-medium {optimizerStore.optimizerPending
						? 'text-gray-400 cursor-not-allowed'
						: 'text-indigo-600 hover:text-indigo-800'}"
					title="Reorder layers by their rotation angle"
				>
					Renumber by Angle
				</button>
				<span class="text-gray-300">|</span>
				<button
					type="button"
					onclick={handleShowAll}
					disabled={optimizerStore.optimizerPending}
					class="text-xs font-medium {optimizerStore.optimizerPending
						? 'text-gray-400 cursor-not-allowed'
						: 'text-indigo-600 hover:text-indigo-800'}"
				>
					Show All
				</button>
				<span class="text-gray-300">|</span>
				<button
					type="button"
					onclick={handleHideAll}
					disabled={optimizerStore.optimizerPending}
					class="text-xs font-medium {optimizerStore.optimizerPending
						? 'text-gray-400 cursor-not-allowed'
						: 'text-indigo-600 hover:text-indigo-800'}"
				>
					Hide All
				</button>
			</div>
		</div>

		{#if doodledialStore.groups.length <= 1}
			<div class="border border-gray-200 rounded-lg">
				<ul class="divide-y divide-gray-100">
					{#each doodledialStore.layers as layer (layer.id)}
						<li
							class="flex items-center justify-between px-3 py-2.5 transition-colors list-none {optimizerStore.optimizerPending
								? 'opacity-60'
								: 'cursor-pointer hover:bg-gray-50'} {doodledialStore.selectedLayer === layer.id
								? 'bg-indigo-50 border-l-2 border-indigo-500'
								: ''}"
							role="menuitem"
							tabindex={optimizerStore.optimizerPending ? -1 : 0}
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
											title={formatOverlapTooltip(layer.id)}
										>
											{@html warningTriangleSvg}
										</span>
									{/if}
									{#if getCutoutGapLayers(layer.id).length > 0}
										<span
											class="inline-flex items-center gap-1 text-xs text-amber-600 ml-1"
											title="Gap too small with: {getCutoutGapLayers(layer.id)
												.map((id) => doodledialStore.getLayer(id)?.name || id)
												.join(', ')}"
										>
											{@html warningTriangleSvg}
										</span>
									{/if}
									{#if doodledialStore.getLayerLabelPlacementStatus(layer.id).status === 'error'}
										<span
											class="inline-flex items-center gap-1 text-xs text-rose-600 ml-1"
											data-label-placement-error={layer.id}
											title="Label auto placement failed"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M18 10A8 8 0 114 3.08V5a1 1 0 11-2 0V1a1 1 0 011-1h4a1 1 0 110 2H4.51A6 6 0 1016 10a1 1 0 112 0zm-9-3a1 1 0 012 0v3a1 1 0 11-2 0V7zm1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z"
													clip-rule="evenodd"
												/>
											</svg>
										</span>
									{/if}
								</span>
								<div class="flex items-center gap-2 shrink-0">
									{#if doodledialStore.autoPathLabelPlacementEnabled && doodledialStore.getLayerLabelPlacementStatus(layer.id).status === 'error'}
										<button
											type="button"
											data-reset-label-auto={layer.id}
											onclick={(e) => {
												if (optimizerStore.optimizerPending) return;
												e.stopPropagation();
												doodledialStore.resetLayerLabelPlacementMode(layer.id);
												void doodledialStore.requestLayerLabelAutoPlacement(layer.id);
											}}
											disabled={optimizerStore.optimizerPending}
											class="text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed {optimizerStore.optimizerPending
												? 'bg-rose-50 text-rose-400'
												: 'bg-rose-50 text-rose-700 hover:bg-rose-100'}"
											title="Retry automatic label placement"
										>
											Reset Auto
										</button>
									{/if}
									<RotationKnob
										value={layer.rotation}
										onchange={(rotation) => handleRotationChange(layer.id, rotation)}
										label="Rotate {layer.name}"
										disabled={!layer.visible || optimizerStore.optimizerPending}
									/>
								</div>
							</div>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									handleToggle(layer.id);
								}}
								disabled={optimizerStore.optimizerPending}
								class="p-1 rounded transition-colors {optimizerStore.optimizerPending
									? 'cursor-not-allowed opacity-50'
									: 'hover:bg-gray-200'}"
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
		{:else}
			<div class="border border-gray-200 rounded-lg">
				{#each doodledialStore.groups as group (group.id)}
					<details class="group" open>
						<summary
							class="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 list-none select-none"
						>
							<span class="flex items-center gap-2 text-sm font-semibold text-gray-700">
								<span
									class="inline-block w-3 h-3 rounded-full shrink-0"
									style="background: {group.color}"
								></span>
								{group.name}
							</span>
							<svg
								class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</summary>
						<ul class="divide-y divide-gray-100">
							{#each doodledialStore.layers.filter((l) => l.groupId === group.id) as layer (layer.id)}
								<li
									class="flex items-center justify-between pl-8 py-2.5 transition-colors list-none {optimizerStore.optimizerPending
										? 'opacity-60'
										: 'cursor-pointer hover:bg-gray-50'} {doodledialStore.selectedLayer === layer.id
										? 'bg-indigo-50 border-l-2 border-indigo-500'
										: ''}"
									role="menuitem"
									tabindex={optimizerStore.optimizerPending ? -1 : 0}
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
													title={formatOverlapTooltip(layer.id)}
												>
													{@html warningTriangleSvg}
												</span>
											{/if}
											{#if getCutoutGapLayers(layer.id).length > 0}
												<span
													class="inline-flex items-center gap-1 text-xs text-amber-600 ml-1"
													title="Gap too small with: {getCutoutGapLayers(layer.id)
														.map((id) => doodledialStore.getLayer(id)?.name || id)
														.join(', ')}"
												>
													{@html warningTriangleSvg}
												</span>
											{/if}
											{#if doodledialStore.getLayerLabelPlacementStatus(layer.id).status === 'error'}
												<span
													class="inline-flex items-center gap-1 text-xs text-rose-600 ml-1"
													data-label-placement-error={layer.id}
													title="Label auto placement failed"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="h-4 w-4"
														viewBox="0 0 20 20"
														fill="currentColor"
													>
														<path
															fill-rule="evenodd"
															d="M18 10A8 8 0 114 3.08V5a1 1 0 11-2 0V1a1 1 0 011-1h4a1 1 0 110 2H4.51A6 6 0 1016 10a1 1 0 112 0zm-9-3a1 1 0 012 0v3a1 1 0 11-2 0V7zm1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z"
															clip-rule="evenodd"
														/>
													</svg>
												</span>
											{/if}
										</span>
										<div class="flex items-center gap-2 shrink-0">
											{#if doodledialStore.autoPathLabelPlacementEnabled && doodledialStore.getLayerLabelPlacementStatus(layer.id).status === 'error'}
												<button
													type="button"
													data-reset-label-auto={layer.id}
													onclick={(e) => {
														if (optimizerStore.optimizerPending) return;
														e.stopPropagation();
														doodledialStore.resetLayerLabelPlacementMode(layer.id);
														void doodledialStore.requestLayerLabelAutoPlacement(layer.id);
													}}
													disabled={optimizerStore.optimizerPending}
													class="text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed {optimizerStore.optimizerPending
														? 'bg-rose-50 text-rose-400'
														: 'bg-rose-50 text-rose-700 hover:bg-rose-100'}"
													title="Retry automatic label placement"
												>
													Reset Auto
												</button>
											{/if}
											<RotationKnob
												value={layer.rotation}
												onchange={(rotation) => handleRotationChange(layer.id, rotation)}
												label="Rotate {layer.name}"
												disabled={!layer.visible || optimizerStore.optimizerPending}
											/>
										</div>
									</div>
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											handleToggle(layer.id);
										}}
										disabled={optimizerStore.optimizerPending}
										class="p-1 rounded transition-colors {optimizerStore.optimizerPending
											? 'cursor-not-allowed opacity-50'
											: 'hover:bg-gray-200'}"
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
					</details>
				{/each}
			</div>
		{/if}
	</div>
{/if}
