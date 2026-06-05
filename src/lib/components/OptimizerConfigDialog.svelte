<script lang="ts">
	import { optimizerStore } from '$lib/stores/optimizer.svelte';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			optimizerStore.handleCloseOptimizerDialog();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			optimizerStore.handleCloseOptimizerDialog();
		}
	}
</script>

{#if optimizerStore.optimizerRunDialogOpen}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="optimizer-config-dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Optimizer configuration"
		tabindex="-1"
		onkeydown={handleKeydown}
	>
		<div
			class="absolute inset-0 bg-slate-900/40"
			role="presentation"
			onclick={handleBackdropClick}
		></div>

		<section
			class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
		>
			<div>
				<h2 id="optimizer-config-title" class="text-xl font-semibold text-gray-900">
					{optimizerStore.optimizerMode === 'bruteforce'
						? 'Run Brute Force Optimizer'
						: 'Run Optimizer'}
				</h2>
				<p class="text-sm text-gray-600 mt-1">Configure options, then start optimization.</p>
			</div>

			<div class="grid grid-cols-2 gap-3 text-sm">
				{#if optimizerStore.optimizerMode === 'force-directed'}
					<label class="col-span-2 flex items-center gap-2">
						<input type="checkbox" bind:checked={optimizerStore.optimizerRoundOutputAngles} />
						<span>Round Output Angles</span>
					</label>
					<label class="col-span-2 flex items-center gap-2">
						<input type="checkbox" bind:checked={optimizerStore.optimizerInitializeRandomly} />
						<span>Initialize Randomly</span>
					</label>
					<label class="col-span-2">
						<span class="block text-gray-600 mb-1">Gap (mm)</span>
						<input
							type="number"
							min="0.1"
							step="0.1"
							bind:value={optimizerStore.optimizerGapMmInput}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label class="col-span-2">
						<span class="block text-gray-600 mb-1">Random Seed</span>
						<input
							type="text"
							bind:value={optimizerStore.optimizerRandomSeedInput}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
				{/if}
				{#if optimizerStore.optimizerMode === 'bruteforce'}
					<label class="col-span-2">
						<span class="block text-gray-600 mb-1">Gap (mm)</span>
						<input
							type="number"
							min="0.1"
							step="0.1"
							bind:value={optimizerStore.optimizerGapMmInput}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label class="col-span-2">
						<span class="block text-gray-600 mb-1">Max Runtime (s)</span>
						<input
							type="number"
							min="0"
							step="1"
							bind:value={optimizerStore.optimizerMaxRuntimeSInput}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
				{/if}
				{#if optimizerStore.optimizerMode === 'force-directed'}
					<label>
						<span class="block text-gray-600 mb-1">Overlap Weight</span>
						<input
							type="number"
							step="0.01"
							bind:value={optimizerStore.optimizerTuning.overlapMagnitudeWeight}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Overlap Power</span>
						<input
							type="number"
							step="0.1"
							bind:value={optimizerStore.optimizerTuning.overlapMagnitudePower}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Max Overlap Force</span>
						<input
							type="number"
							step="0.1"
							bind:value={optimizerStore.optimizerTuning.maxOverlapForceMagnitude}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Time Step</span>
						<input
							type="number"
							step="0.05"
							bind:value={optimizerStore.optimizerTuning.timeStepDt}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Restoring Weight</span>
						<input
							type="number"
							step="0.01"
							bind:value={optimizerStore.optimizerTuning.restoringForceWeight}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Max Restoring Force</span>
						<input
							type="number"
							step="0.1"
							bind:value={optimizerStore.optimizerTuning.maxRestoringForce}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Unique Weight</span>
						<input
							type="number"
							step="0.01"
							bind:value={optimizerStore.optimizerTuning.uniqueForceWeight}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label>
						<span class="block text-gray-600 mb-1">Min Unique Separation</span>
						<input
							type="number"
							step="0.5"
							bind:value={optimizerStore.optimizerTuning.minUniqueAngleSeparation}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
					<label class="col-span-2">
						<span class="block text-gray-600 mb-1">Max Unique Force</span>
						<input
							type="number"
							step="0.1"
							bind:value={optimizerStore.optimizerTuning.maxUniqueForce}
							class="w-full rounded-lg border border-gray-300 px-2 py-1"
						/>
					</label>
				{/if}
			</div>

			<div class="mt-5 flex items-center justify-between gap-3">
				<button
					type="button"
					onclick={() => optimizerStore.resetOptimizerTuning()}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Reset Defaults
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => optimizerStore.handleCloseOptimizerDialog()}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
						data-testid="optimizer-dialog-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={() => optimizerStore.handleConfirmOptimizerDialogRun()}
						class="px-4 py-2 rounded-lg border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700"
						data-testid="optimizer-dialog-run-button"
					>
						Start Optimization
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
