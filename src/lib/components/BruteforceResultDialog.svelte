<script lang="ts">
	import { solverStore } from '$lib/stores/solver.svelte';
	import { scoreCircularGaps } from '$lib/solver/run-bruteforce-solver';
	import { combineSolverSvgTemplate } from '$lib/utils/doodledial';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			solverStore.handleCloseBruteforceResultDialog();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			solverStore.handleCloseBruteforceResultDialog();
		}
	}
</script>

{#if solverStore.bruteforceResultDialogOpen && solverStore.bruteforceRunSummary}
	{@const summary = solverStore.bruteforceRunSummary}
	{@const hasLayouts = summary.feasibleSolutionsFound > 0}
	{@const selectedLayout = hasLayouts
		? solverStore.solverTopLayouts[solverStore.solverResultSelectedIndex]
		: null}
	{@const scores = selectedLayout ? scoreCircularGaps(selectedLayout) : null}

	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="bruteforce-result-dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Brute force results"
		tabindex="-1"
		onkeydown={handleKeydown}
	>
		<div
			class="absolute inset-0 bg-slate-900/40"
			role="presentation"
			onclick={handleBackdropClick}
		></div>

		<section
			class="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
		>
			<div class="px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-semibold text-gray-900">
					{#if summary.stopReason === 'stopped'}
						Search Stopped — Select a Layout
					{:else if summary.stopReason === 'time_limit'}
						Time Limit Reached — Select a Layout
					{:else if summary.stopReason === 'exact_complete'}
						Search Complete — Select a Layout
					{:else}
						No Feasible Layout Found
					{/if}
				</h2>
				<p class="text-sm text-gray-500 mt-0.5">Click a thumbnail to preview, then accept.</p>
			</div>

			{#if hasLayouts}
				<div class="flex flex-1 min-h-0">
					<div class="w-64 shrink-0 p-4 border-r border-gray-100 overflow-y-auto">
						<div class="grid grid-cols-2 gap-2">
							{#each solverStore.solverThumbnailSvgs as thumbSvg, index (index)}
								{@const isSelected = solverStore.solverResultSelectedIndex === index}
								<button
									type="button"
									onclick={() => {
										solverStore.solverResultSelectedIndex = index;
									}}
									class="relative aspect-square rounded-lg border-2 overflow-hidden p-0.5 flex items-center justify-center transition-all duration-150 {isSelected
										? 'border-indigo-500 ring-2 ring-indigo-200'
										: 'border-gray-200 hover:border-indigo-300'}"
								>
									{#if thumbSvg}
										<div class="w-full h-full">
											{@html thumbSvg}
										</div>
									{:else}
										<span class="text-xs text-gray-300">rendering...</span>
									{/if}
									<div
										class="absolute bottom-1 right-1 text-xs font-semibold {isSelected
											? 'text-indigo-600'
											: 'text-gray-500'} bg-white/90 px-1.5 py-0.5 rounded-full shadow-xs"
									>
										#{index + 1}
									</div>
								</button>
							{/each}
						</div>
					</div>

					<div class="flex-1 flex flex-col p-4 min-w-0">
						<div class="flex items-center justify-between mb-3">
							<span class="text-sm font-medium text-gray-700">
								Layout #{solverStore.solverResultSelectedIndex + 1}
							</span>
							{#if scores}
								<div class="flex gap-3 text-xs text-gray-500">
									<span>Min gap: <strong class="text-gray-900">{scores.minGap}°</strong></span>
									<span
										>Variance: <strong class="text-gray-900">{scores.variance.toFixed(0)}</strong
										></span
									>
									<span
										>Deviation: <strong class="text-gray-900"
											>{scores.deviationSum.toFixed(0)}°</strong
										></span
									>
								</div>
							{/if}
						</div>

						<div
							class="flex-1 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center min-h-[300px] overflow-hidden p-4"
						>
							{#if selectedLayout && solverStore.solverSvgTemplate}
								{@const previewSvg = solverStore.fitSvg(
									combineSolverSvgTemplate(solverStore.solverSvgTemplate, selectedLayout)
								)}
								<div class="w-full h-full flex items-center justify-center">
									{@html previewSvg}
								</div>
							{:else}
								<span class="text-sm text-gray-400">No preview available</span>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="p-8 text-center text-gray-500">
					<p class="text-sm">
						No non-overlapping layout was found. Try increasing the gap or adjusting layer
						positions.
					</p>
				</div>
			{/if}

			<div class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
				{#if summary.stopReason === 'time_limit' || summary.stopReason === 'stopped'}
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => solverStore.handleContinueBruteforce()}
							class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
							data-testid="bruteforce-result-continue-button"
						>
							Continue Searching
						</button>
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<span>Continue for</span>
							<input
								type="number"
								min="1"
								step="1"
								bind:value={solverStore.bruteforceExtendRuntimeSInput}
								class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
							/>
							<span>s</span>
						</div>
					</div>
				{:else}
					<div></div>
				{/if}
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => solverStore.handleCloseBruteforceResultDialog()}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
					>
						Cancel
					</button>
					{#if hasLayouts}
						<button
							type="button"
							onclick={() => solverStore.handleApplyBruteforceLayout()}
							class="px-4 py-2 rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
							data-testid="bruteforce-result-accept-button"
						>
							Accept Layout
						</button>
					{/if}
				</div>
			</div>
		</section>
	</div>
{/if}
