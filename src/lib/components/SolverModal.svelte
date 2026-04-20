<script lang="ts">
	import type { SolverSolution } from '$lib/utils/solver';

	interface Props {
		solutions: SolverSolution[];
		isOpen: boolean;
		isSearching: boolean;
		searchedCount: number;
		onSelect: (solution: SolverSolution) => void;
		onAbort: () => void;
		onClose: () => void;
	}

	let { solutions, isOpen, isSearching, searchedCount, onSelect, onAbort, onClose }: Props =
		$props();

	function formatRotations(solution: SolverSolution): string {
		const entries = Array.from(solution.rotations.entries())
			.map(([id, angle]) => `${id}: ${angle}°`)
			.join(', ');
		return entries;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
		>
			<div class="p-4 border-b flex items-center justify-between">
				<h2 class="text-lg font-semibold">Solver Results</h2>
				<button onclick={onClose} class="text-gray-500 hover:text-gray-700"> ✕ </button>
			</div>

			<div class="p-4 border-b bg-gray-50">
				{#if isSearching}
					<div class="flex items-center gap-3">
						<div
							class="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"
						></div>
						<span>Searching... {searchedCount.toLocaleString()} combinations checked</span>
					</div>
				{:else if solutions.length === 0}
					<span class="text-red-600">No valid solutions found</span>
				{:else}
					<span class="text-green-600">Found {solutions.length} solutions</span>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto p-4">
				{#if solutions.length === 0 && !isSearching}
					<p class="text-gray-500 text-center py-8">
						No solutions satisfy all constraints. Try adjusting the layers.
					</p>
				{:else}
					<div class="space-y-3">
						{#each solutions as solution, index}
							<div class="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
								<div class="flex items-center justify-between mb-2">
									<span class="font-medium">Solution {index + 1}</span>
									<div class="flex items-center gap-2">
										<span class="text-sm text-gray-500">
											Score: {(solution.score * 100).toFixed(1)}%
										</span>
										<button
											onclick={() => onSelect(solution)}
											class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
										>
											Apply
										</button>
									</div>
								</div>
								<p class="text-sm text-gray-600 font-mono">{formatRotations(solution)}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="p-4 border-t flex justify-end gap-2">
				{#if isSearching}
					<button onclick={onAbort} class="px-4 py-2 border rounded-lg hover:bg-gray-50">
						Abort
					</button>
				{/if}
				<button onclick={onClose} class="px-4 py-2 border rounded-lg hover:bg-gray-50">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
