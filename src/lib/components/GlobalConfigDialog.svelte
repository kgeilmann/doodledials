<script lang="ts">
	import { DEFAULTS, globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import type { ExportFormat } from '$lib/utils/export-formats';
	import type { CenterMarkType } from '$lib/types/doodledial';
	import { FONT_FAMILIES } from '$lib/utils/constants';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const { minDiameter, maxDiameter } = doodledialStore.config;

	let activeTab = $state<'default-disc' | 'default-optimizer' | 'experimental' | 'export'>(
		'default-disc'
	);

	let draftDiameter = $state(globalConfig.diameter);
	let draftCenterHoleDiameter = $state(globalConfig.centerHoleDiameter);
	let draftCenterMarkType = $state<CenterMarkType>(globalConfig.centerMarkType);
	let draftTitleFontFamily = $state(globalConfig.titleFontFamily);
	let draftPathLabelFontSize = $state(globalConfig.pathLabelFontSize);
	let draftDiscTitleFontSize = $state(globalConfig.discTitleFontSize);

	let draftOptimizerGapDefault = $state(globalConfig.optimizerGapDefault);
	let draftBruteforceTimeLimit = $state(globalConfig.bruteforceTimeLimit);

	let draftPathLabelOptimizerEnabled = $state(globalConfig.pathLabelOptimizerEnabled);
	let draftForceDirectedOptimizerEnabled = $state(globalConfig.forceDirectedOptimizerEnabled);

	let draftDefaultExportFormat = $state<ExportFormat>(globalConfig.defaultExportFormat);

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

	function handleOptimizerGapInputChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 0) return;
		draftOptimizerGapDefault = value;
	}

	function handleBruteforceTimeLimitInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 1) return;
		draftBruteforceTimeLimit = value;
	}

	function handleReset() {
		draftDiameter = DEFAULTS.diameter;
		draftCenterHoleDiameter = DEFAULTS.centerHoleDiameter;
		draftCenterMarkType = DEFAULTS.centerMarkType;
		draftTitleFontFamily = DEFAULTS.titleFontFamily;
		draftPathLabelFontSize = DEFAULTS.pathLabelFontSize;
		draftDiscTitleFontSize = DEFAULTS.discTitleFontSize;
		draftOptimizerGapDefault = DEFAULTS.optimizerGapDefault;
		draftBruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		draftPathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
		draftForceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
		draftDefaultExportFormat = DEFAULTS.defaultExportFormat;
	}

	function handleOK() {
		globalConfig.diameter = draftDiameter;
		globalConfig.centerHoleDiameter = draftCenterHoleDiameter;
		globalConfig.centerMarkType = draftCenterMarkType;
		globalConfig.titleFontFamily = draftTitleFontFamily;
		globalConfig.pathLabelFontSize = draftPathLabelFontSize;
		globalConfig.discTitleFontSize = draftDiscTitleFontSize;
		globalConfig.optimizerGapDefault = draftOptimizerGapDefault;
		globalConfig.bruteforceTimeLimit = draftBruteforceTimeLimit;
		globalConfig.pathLabelOptimizerEnabled = draftPathLabelOptimizerEnabled;
		globalConfig.forceDirectedOptimizerEnabled = draftForceDirectedOptimizerEnabled;
		globalConfig.defaultExportFormat = draftDefaultExportFormat;
		globalConfig.save();
		doodledialStore.setCenterHoleDiameter(draftCenterHoleDiameter);
		open = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

{#if open}
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

			<!-- Tabs -->
			<div class="flex gap-1 mb-6 border-b border-gray-200" role="tablist">
				<button
					role="tab"
					aria-selected={activeTab === 'default-disc'}
					onclick={() => (activeTab = 'default-disc')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-disc'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Default Disc Settings</button
				>
				<button
					role="tab"
					aria-selected={activeTab === 'default-optimizer'}
					onclick={() => (activeTab = 'default-optimizer')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-optimizer'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Default Optimizer</button
				>
				<button
					role="tab"
					aria-selected={activeTab === 'experimental'}
					onclick={() => (activeTab = 'experimental')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'experimental'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Experimental</button
				>
				<button
					role="tab"
					aria-selected={activeTab === 'export'}
					onclick={() => (activeTab = 'export')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'export'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Export</button
				>
			</div>

			<!-- Tab Content -->
			<div class="space-y-6 min-h-[280px]">
				{#if activeTab === 'default-disc'}
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
						<div class="mb-3">
							<span class="text-sm font-medium text-gray-700">Center Mark Type</span>
							<p class="text-xs text-gray-500 mt-0.5">
								How the center is rendered in laser exports
							</p>
						</div>
						<fieldset class="flex gap-2">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
								'hole'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-mark-type"
									value="hole"
									checked={draftCenterMarkType === 'hole'}
									onchange={() => (draftCenterMarkType = 'hole')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Hole</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
								'crosshair'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-mark-type"
									value="crosshair"
									checked={draftCenterMarkType === 'crosshair'}
									onchange={() => (draftCenterMarkType = 'crosshair')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Crosshair</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterMarkType ===
								'none'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-mark-type"
									value="none"
									checked={draftCenterMarkType === 'none'}
									onchange={() => (draftCenterMarkType = 'none')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>None</span>
							</label>
						</fieldset>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-title-font-family" class="text-sm font-medium text-gray-700"
								>Title Font</label
							>
							<select
								id="global-title-font-family"
								value={draftTitleFontFamily}
								onchange={(e) => (draftTitleFontFamily = (e.target as HTMLSelectElement).value)}
								class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							>
								{#each FONT_FAMILIES as font (font)}
									<option value={font}>{font}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-path-label-font-size" class="text-sm font-medium text-gray-700"
								>Path Label Font Size</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-path-label-font-size"
									type="number"
									min="4"
									max="40"
									value={draftPathLabelFontSize}
									oninput={(e) => {
										const v = parseInt((e.target as HTMLInputElement).value);
										if (Number.isFinite(v)) draftPathLabelFontSize = v;
									}}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for path labels</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-disc-title-font-size" class="text-sm font-medium text-gray-700"
								>Disc Title Font Size</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-disc-title-font-size"
									type="number"
									min="8"
									max="36"
									value={draftDiscTitleFontSize}
									oninput={(e) => {
										const v = parseInt((e.target as HTMLInputElement).value);
										if (Number.isFinite(v)) draftDiscTitleFontSize = v;
									}}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for disc titles</p>
					</div>
				{/if}

				{#if activeTab === 'default-optimizer'}
					<div>
						<div class="flex items-center justify-between mb-2">
							<label for="global-optimizer-gap-input" class="text-sm font-medium text-gray-700"
								>Optimizer Gap</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-optimizer-gap-input"
									type="number"
									min="0"
									step="0.5"
									value={draftOptimizerGapDefault}
									onchange={handleOptimizerGapInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">mm</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default gap between cutouts used in optimization</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label
								for="global-bruteforce-time-limit-input"
								class="text-sm font-medium text-gray-700">Brute Force Time Limit</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-bruteforce-time-limit-input"
									type="number"
									min="1"
									step="1"
									value={draftBruteforceTimeLimit}
									onchange={handleBruteforceTimeLimitInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">s</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Maximum runtime for brute force optimizer</p>
					</div>
				{/if}

				{#if activeTab === 'experimental'}
					<div>
						<div class="flex items-center justify-between">
							<div>
								<span class="text-sm font-medium text-gray-700"
									>Path Label Optimizer (Experimental)</span
								>
								<p class="text-xs text-gray-500 mt-0.5">Enable auto-placement of path labels</p>
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
								<span class="text-sm font-medium text-gray-700"
									>Force Directed Optimizer (Experimental)</span
								>
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
				{/if}

				{#if activeTab === 'export'}
					<div>
						<div class="mb-3">
							<span class="text-sm font-medium text-gray-700">Default Export Format</span>
							<p class="text-xs text-gray-500 mt-0.5">
								Format used when clicking the main Export button
							</p>
						</div>
						<fieldset class="flex gap-4">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat ===
								'preview-svg'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="export-format"
									value="preview-svg"
									checked={draftDefaultExportFormat === 'preview-svg'}
									onchange={() => (draftDefaultExportFormat = 'preview-svg')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Preview SVG</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat ===
								'laser-svg'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="export-format"
									value="laser-svg"
									checked={draftDefaultExportFormat === 'laser-svg'}
									onchange={() => (draftDefaultExportFormat = 'laser-svg')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Laser SVG</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition {draftDefaultExportFormat ===
								'stl'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="export-format"
									value="stl"
									checked={draftDefaultExportFormat === 'stl'}
									onchange={() => (draftDefaultExportFormat = 'stl')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>3D STL</span>
							</label>
						</fieldset>
					</div>
				{/if}
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
