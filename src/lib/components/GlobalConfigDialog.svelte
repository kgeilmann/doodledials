<script lang="ts">
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	const { minDiameter, maxDiameter } = doodledialStore.config;

	const DEFAULTS = {
		diameter: 200,
		centerHoleDiameter: 2,
		pathLabelOptimizerEnabled: false,
		forceDirectedOptimizerEnabled: false
	};

	let draftDiameter = $state(globalConfig.diameter);
	let draftCenterHoleDiameter = $state(globalConfig.centerHoleDiameter);
	let draftPathLabelOptimizerEnabled = $state(globalConfig.pathLabelOptimizerEnabled);
	let draftForceDirectedOptimizerEnabled = $state(globalConfig.forceDirectedOptimizerEnabled);

	function handleDiameterInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		const clamped = Math.min(Math.max(value, minDiameter), maxDiameter);
		draftDiameter = clamped;
	}

	function handleCenterHoleInputChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		const clamped = Math.min(Math.max(value, 0), 3);
		draftCenterHoleDiameter = clamped;
	}

	function handleTogglePathLabel() {
		draftPathLabelOptimizerEnabled = !draftPathLabelOptimizerEnabled;
	}

	function handleToggleForceDirected() {
		draftForceDirectedOptimizerEnabled = !draftForceDirectedOptimizerEnabled;
	}

	function handleReset() {
		draftDiameter = DEFAULTS.diameter;
		draftCenterHoleDiameter = DEFAULTS.centerHoleDiameter;
		draftPathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
		draftForceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
	}

	function handleOK() {
		globalConfig.diameter = draftDiameter;
		globalConfig.centerHoleDiameter = draftCenterHoleDiameter;
		globalConfig.pathLabelOptimizerEnabled = draftPathLabelOptimizerEnabled;
		globalConfig.forceDirectedOptimizerEnabled = draftForceDirectedOptimizerEnabled;
		globalConfig.save();
		doodledialStore.setDiameter(draftDiameter);
		doodledialStore.setCenterHoleDiameter(draftCenterHoleDiameter);
		globalConfig.close();
	}

	function handleCancel() {
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
			onclick={handleCancel}
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close settings dialog"
		></button>

		<section
			class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-6"
		>
			<div class="mb-6">
				<h2 class="text-xl font-semibold text-gray-900">Global Settings</h2>
				<p class="text-sm text-gray-600 mt-1">Configuration persisted across sessions</p>
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
								min={minDiameter}
								max={maxDiameter}
								value={draftDiameter}
								onchange={handleDiameterInputChange}
								class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<span class="text-sm text-gray-500">mm</span>
						</div>
					</div>
				</div>

				<div class="border-t border-gray-100 pt-6">
					<div class="flex items-center justify-between mb-2">
						<label for="center-hole-diameter-input" class="text-sm font-medium text-gray-700"
							>Center Hole Diameter</label
						>
						<div class="flex items-center gap-2">
							<input
								id="center-hole-diameter-input"
								type="number"
								min="0"
								max="3"
								step="0.5"
								value={draftCenterHoleDiameter}
								onchange={handleCenterHoleInputChange}
								class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							/>
							<span class="text-sm text-gray-500">mm</span>
						</div>
					</div>
					<p class="text-xs text-gray-500">for needle axle. Set to 0 for no hole.</p>
				</div>

				<div class="border-t border-gray-100 pt-6">
					<div class="flex items-center justify-between">
						<div>
							<span class="text-sm font-medium text-gray-700">Path Label Optimizer (Experimental)</span>
							<p class="text-xs text-gray-500 mt-0.5">
								Enable auto-placement of path labels
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={draftPathLabelOptimizerEnabled}
							aria-label="Toggle path label optimizer"
							onclick={handleTogglePathLabel}
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftPathLabelOptimizerEnabled
								? 'bg-indigo-600'
								: 'bg-gray-200'}"
						>
							<span
								aria-hidden="true"
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftPathLabelOptimizerEnabled
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>

				<div class="border-t border-gray-100 pt-6">
					<div class="flex items-center justify-between">
						<div>
							<span class="text-sm font-medium text-gray-700">Force Directed Optimizer (Experimental)</span>
							<p class="text-xs text-gray-500 mt-0.5">
								Use physics-based force directed optimization instead of brute force search
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={draftForceDirectedOptimizerEnabled}
							aria-label="Toggle force directed optimizer"
							data-testid="toggle-force-directed-optimizer"
							onclick={handleToggleForceDirected}
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftForceDirectedOptimizerEnabled
								? 'bg-indigo-600'
								: 'bg-gray-200'}"
						>
							<span
								aria-hidden="true"
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftForceDirectedOptimizerEnabled
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
						onclick={handleCancel}
						class="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleOK}
						class="px-4 py-2 rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
						data-testid="global-config-ok-button"
					>
						OK
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}
