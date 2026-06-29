<script lang="ts">
	import { solverStore } from '$lib/stores/solver.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
</script>

{#if solverStore.solverOverlayVisible}
	<div class="absolute inset-0 z-20 flex items-start justify-center pointer-events-none">
		<div class="absolute inset-0 rounded-2xl bg-slate-900/20 backdrop-blur-[1px]"></div>
		<section
			class="pointer-events-auto relative mt-4 w-full max-w-4xl rounded-2xl border border-indigo-200 bg-white/95 shadow-lg px-4 py-3"
		>
			<div class="flex items-center text-xs text-slate-600 mb-2">
				<span class="font-medium uppercase tracking-wide">{solverStore.solverProgressPhase}</span>
			</div>
			<div
				class="mb-2 flex items-center justify-between text-xs text-slate-600"
				data-testid="solver-time-counter"
			>
				<span>Elapsed {solverStore.formatDurationMs(solverStore.solverElapsedMs)}</span>
				<span>
					Max {solverStore.solverMaxRuntimeMs === null
						? 'No limit'
						: solverStore.formatDurationMs(solverStore.solverMaxRuntimeMs)}
				</span>
			</div>
			{#if doodledialStore.groups.length > 1 && solverStore.solverSelectedGroupIds.length > 1}
				<div
					class="mb-2 flex flex-wrap items-center gap-2 text-xs"
					data-testid="solver-group-progress"
				>
					{#each solverStore.solverSelectedGroupIds as groupId (groupId)}
						{@const group = doodledialStore.groups.find((g) => g.id === groupId)}
						{@const isCompleted = solverStore.solverMultiGroupCompletedIds.includes(groupId)}
						{@const isCurrent = solverStore.solverCurrentGroupId === groupId}
						{@const isWaiting = !isCompleted && !isCurrent}
						<span
							class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium transition-colors"
							class:bg-green-100={isCompleted}
							class:text-green-700={isCompleted}
							class:bg-indigo-100={isCurrent}
							class:text-indigo-700={isCurrent}
							class:bg-slate-100={isWaiting}
							class:text-slate-500={isWaiting}
							class:ring-1={isCurrent}
							class:ring-indigo-300={isCurrent}
						>
							<span
								class="w-2 h-2 rounded-full shrink-0"
								style="background-color: {group?.color ?? '#999'}"
								aria-hidden="true"
							></span>
							<span>{isCompleted ? '✓' : isCurrent ? '◉' : '○'}</span>
							<span>{group?.name ?? groupId}</span>
						</span>
					{/each}
				</div>
			{/if}

			<div
				class="h-2 w-full rounded-full bg-indigo-100 overflow-hidden"
				data-testid="solver-progress-track"
			>
				<div
					data-testid="solver-progress-bar"
					class="h-full bg-indigo-600 transition-all duration-300"
					style="width: {solverStore.solverProgress}%;"
				></div>
			</div>

			<div class="mt-2 flex items-center justify-between gap-4">
				<p class="text-sm text-slate-700" data-testid="solver-progress-message">
					{solverStore.solverProgressMessage}
				</p>
				{#if solverStore.solverPending}
					<button
						onclick={() => solverStore.handleStopSolver()}
						class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
						data-testid="solver-cancel-button"
					>
						Stop
					</button>
				{/if}
			</div>
		</section>
	</div>
{/if}
