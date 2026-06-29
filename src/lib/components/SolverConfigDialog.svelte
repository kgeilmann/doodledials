<script lang="ts">
	import { solverStore } from '$lib/stores/solver.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			solverStore.handleCloseSolverDialog();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			solverStore.handleCloseSolverDialog();
		}
	}
</script>

{#if solverStore.solverRunDialogOpen}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="solver-config-dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Solver configuration"
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
				<h2 id="solver-config-title" class="text-xl font-semibold text-gray-900">
					Run Brute Force Solver
				</h2>
				<p class="text-sm text-gray-600 mt-1">Configure options, then start optimization.</p>
			</div>

			<div class="grid grid-cols-2 gap-3 text-sm">
				<label class="col-span-2">
					<span class="block text-gray-600 mb-1">Gap (mm)</span>
					<input
						type="number"
						min="0.1"
						step="0.1"
						bind:value={solverStore.solverGapMmInput}
						class="w-full rounded-lg border border-gray-300 px-2 py-1"
					/>
				</label>
				<label class="col-span-2">
					<span class="block text-gray-600 mb-1">Max Runtime (s)</span>
					<input
						type="number"
						min="0"
						step="1"
						bind:value={solverStore.solverMaxRuntimeSInput}
						class="w-full rounded-lg border border-gray-300 px-2 py-1"
					/>
				</label>
				{#if doodledialStore.groups.length > 1}
					<div class="col-span-2">
						<span class="text-xs font-medium text-gray-600">Select dials to solve</span>
						<div
							class="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 p-3 max-h-36 overflow-y-auto"
						>
							{#each doodledialStore.groups as group (group.id)}
								<label class="flex items-center gap-2 text-sm text-gray-700">
									<input
										type="checkbox"
										checked={solverStore.solverSelectedGroupIds.includes(group.id)}
										onchange={(e) => {
											if (e.currentTarget.checked) {
												solverStore.solverSelectedGroupIds = [
													...solverStore.solverSelectedGroupIds,
													group.id
												];
											} else {
												solverStore.solverSelectedGroupIds =
													solverStore.solverSelectedGroupIds.filter((id) => id !== group.id);
											}
										}}
										class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
									/>
									<span
										class="w-3 h-3 rounded-full"
										style="background-color: {group.color}"
										aria-hidden="true"
									></span>
									<span>{group.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="mt-5 flex items-center justify-between gap-3">
				<button
					type="button"
					onclick={() => solverStore.resetSolverTuning()}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Reset Defaults
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => solverStore.handleCloseSolverDialog()}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
						data-testid="solver-dialog-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={() => solverStore.handleConfirmSolverDialogRun()}
						class="px-4 py-2 rounded-lg border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700"
						data-testid="solver-dialog-run-button"
					>
						Start Optimization
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
