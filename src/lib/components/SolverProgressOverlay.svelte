<script lang="ts">
	import { solverStore } from '$lib/stores/solver.svelte';
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
