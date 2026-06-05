<script lang="ts">
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
</script>

{#if optimizerStore.optimizerOverlayVisible}
	<div class="absolute inset-0 z-20 flex items-start justify-center pointer-events-none">
		<div class="absolute inset-0 rounded-2xl bg-slate-900/20 backdrop-blur-[1px]"></div>
		<section
			class="pointer-events-auto relative mt-4 w-full max-w-4xl rounded-2xl border border-indigo-200 bg-white/95 shadow-lg px-4 py-3"
		>
			<div class="flex items-center text-xs text-slate-600 mb-2">
				<span class="font-medium uppercase tracking-wide"
					>{optimizerStore.optimizerProgressPhase}</span
				>
			</div>
			{#if optimizerStore.optimizerActiveMode === 'bruteforce'}
				<div
					class="mb-2 flex items-center justify-between text-xs text-slate-600"
					data-testid="optimizer-time-counter"
				>
					<span>Elapsed {optimizerStore.formatDurationMs(optimizerStore.optimizerElapsedMs)}</span>
					<span>
						Max {optimizerStore.optimizerMaxRuntimeMs === null
							? 'No limit'
							: optimizerStore.formatDurationMs(optimizerStore.optimizerMaxRuntimeMs)}
					</span>
				</div>
			{/if}
			<div
				class="h-2 w-full rounded-full bg-indigo-100 overflow-hidden"
				data-testid="optimizer-progress-track"
			>
				<div
					data-testid="optimizer-progress-bar"
					class="h-full bg-indigo-600 transition-all duration-300"
					style="width: {optimizerStore.optimizerProgress}%;"
				></div>
			</div>

			<div class="mt-2 flex items-center justify-between gap-4">
				<p class="text-sm text-slate-700" data-testid="optimizer-progress-message">
					{optimizerStore.optimizerProgressMessage}
				</p>
				{#if optimizerStore.optimizerPending}
					<button
						onclick={() => optimizerStore.handleStopOptimizer()}
						class="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-medium transition-colors hover:bg-rose-100"
						data-testid="optimizer-cancel-button"
					>
						Stop
					</button>
				{/if}
			</div>
		</section>
	</div>
{/if}
