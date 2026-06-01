<script lang="ts">
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleDiameterSliderChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		globalConfig.diameter = value;
		doodledialStore.setDiameter(value);
	}

	function handleDiameterInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		const clamped = Math.min(Math.max(value, 50), 200);
		globalConfig.diameter = clamped;
		doodledialStore.setDiameter(clamped);
	}

	function handleToggle() {
		globalConfig.pathLabelOptimizerEnabled = !globalConfig.pathLabelOptimizerEnabled;
	}

	function handleReset() {
		globalConfig.reset();
		doodledialStore.setDiameter(globalConfig.diameter);
	}

	function handleClose() {
		globalConfig.close();
	}
</script>

{#if globalConfig.dialogOpen}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		data-testid="global-config-dialog"
	>
		<button
			type="button"
			onclick={handleClose}
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close settings dialog"
		></button>

		<section
			class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
		>
			<div class="flex items-start justify-between gap-4 mb-6">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Global Settings</h2>
					<p class="text-sm text-gray-600 mt-1">Configuration persisted across sessions</p>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Close
				</button>
			</div>

			<div class="space-y-6">
				<div>
					<div class="flex items-center justify-between mb-2">
						<label for="global-diameter-input" class="text-sm font-medium text-gray-700"
							>Disc Diameter</label
						>
						<div class="flex items-center gap-2">
							<input
								id="global-diameter-input"
								type="number"
								min="50"
								max="200"
								value={globalConfig.diameter}
								onchange={handleDiameterInputChange}
								class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<span class="text-sm text-gray-500">mm</span>
						</div>
					</div>
					<input
						type="range"
						min="50"
						max="200"
						value={globalConfig.diameter}
						oninput={handleDiameterSliderChange}
						class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
					/>
					<div class="flex justify-between text-xs text-gray-400 mt-1">
						<span>50mm</span>
						<span>200mm</span>
					</div>
				</div>

				<div class="border-t border-gray-100 pt-6">
					<div class="flex items-center justify-between">
						<div>
							<span class="text-sm font-medium text-gray-700">Path Label Optimizer</span>
							<p class="text-xs text-gray-500 mt-0.5">Enable auto-placement of path labels</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={globalConfig.pathLabelOptimizerEnabled}
							aria-label="Toggle path label optimizer"
							onclick={handleToggle}
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {globalConfig.pathLabelOptimizerEnabled
								? 'bg-indigo-600'
								: 'bg-gray-200'}"
						>
							<span
								aria-hidden="true"
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {globalConfig.pathLabelOptimizerEnabled
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
				<button
					type="button"
					onclick={handleReset}
					class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				>
					Reset Defaults
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleClose}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
						data-testid="global-config-close-button"
					>
						Close
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
