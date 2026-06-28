<script lang="ts">
	import { DEFAULTS, globalConfig } from '$lib/stores/global-config.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import type { ExportFormat } from '$lib/utils/export-formats';
	import type { CenterStyle } from '$lib/types/doodledial';
	import { FONT_FAMILIES } from '$lib/utils/constants';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const { minDiameter, maxDiameter } = doodledialStore.config;

	let activeTab = $state<'default-dial' | 'default-solver' | 'experimental' | 'export'>(
		'default-dial'
	);

	let draftDiameter = $state(globalConfig.diameter);
	let draftCenterHoleDiameter = $state(globalConfig.centerHoleDiameter);
	let draftCenterStyle = $state<CenterStyle>(globalConfig.centerStyle);
	let draftTitleFontFamily = $state(globalConfig.titleFontFamily);
	let draftCutoutLabelFontSize = $state(globalConfig.cutoutLabelFontSize);
	let draftDialTitleFontSize = $state(globalConfig.dialTitleFontSize);

	let draftSolverGapDefault = $state(globalConfig.solverGapDefault);
	let draftBruteforceTimeLimit = $state(globalConfig.bruteforceTimeLimit);

	let draftAutoLabelPlacementEnabled = $state(globalConfig.autoLabelPlacementEnabled);
	let draftForceDirectedSolverEnabled = $state(globalConfig.forceDirectedSolverEnabled);

	let draftDefaultExportFormat = $state<ExportFormat>(globalConfig.defaultExportFormat);
	let draftDefaultNumberingScheme = $state<'continuous' | 'independent'>(
		globalConfig.defaultNumberingScheme
	);
	let draftDefaultTitleFormat = $state<'none' | 'name' | 'numbered' | 'both'>(
		globalConfig.defaultTitleFormat
	);

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

	function handleToggleAutoLabelPlacement() {
		draftAutoLabelPlacementEnabled = !draftAutoLabelPlacementEnabled;
	}

	function handleToggleForceDirected() {
		draftForceDirectedSolverEnabled = !draftForceDirectedSolverEnabled;
	}

	function handleSolverGapInputChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 0) return;
		draftSolverGapDefault = value;
	}

	function handleBruteforceTimeLimitInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value < 1) return;
		draftBruteforceTimeLimit = value;
	}

	function handleCutoutLabelFontSizeInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		draftCutoutLabelFontSize = value;
	}

	function handleDialTitleFontSizeInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value)) return;
		draftDialTitleFontSize = value;
	}

	function handleReset() {
		draftDiameter = DEFAULTS.diameter;
		draftCenterHoleDiameter = DEFAULTS.centerHoleDiameter;
		draftCenterStyle = DEFAULTS.centerStyle;
		draftTitleFontFamily = DEFAULTS.titleFontFamily;
		draftCutoutLabelFontSize = DEFAULTS.cutoutLabelFontSize;
		draftDialTitleFontSize = DEFAULTS.dialTitleFontSize;
		draftSolverGapDefault = DEFAULTS.solverGapDefault;
		draftBruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		draftAutoLabelPlacementEnabled = DEFAULTS.autoLabelPlacementEnabled;
		draftForceDirectedSolverEnabled = DEFAULTS.forceDirectedSolverEnabled;
		draftDefaultExportFormat = DEFAULTS.defaultExportFormat;
		draftDefaultNumberingScheme = DEFAULTS.defaultNumberingScheme;
		draftDefaultTitleFormat = DEFAULTS.defaultTitleFormat;
	}

	function handleOK() {
		globalConfig.diameter = draftDiameter;
		globalConfig.centerHoleDiameter = draftCenterHoleDiameter;
		globalConfig.centerStyle = draftCenterStyle;
		globalConfig.titleFontFamily = draftTitleFontFamily;
		globalConfig.cutoutLabelFontSize = draftCutoutLabelFontSize;
		globalConfig.dialTitleFontSize = draftDialTitleFontSize;
		globalConfig.solverGapDefault = draftSolverGapDefault;
		globalConfig.bruteforceTimeLimit = draftBruteforceTimeLimit;
		globalConfig.autoLabelPlacementEnabled = draftAutoLabelPlacementEnabled;
		globalConfig.forceDirectedSolverEnabled = draftForceDirectedSolverEnabled;
		globalConfig.defaultExportFormat = draftDefaultExportFormat;
		globalConfig.defaultNumberingScheme = draftDefaultNumberingScheme;
		globalConfig.defaultTitleFormat = draftDefaultTitleFormat;
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
					aria-selected={activeTab === 'default-dial'}
					onclick={() => (activeTab = 'default-dial')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-dial'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Default Dial Settings</button
				>
				<button
					role="tab"
					aria-selected={activeTab === 'default-solver'}
					onclick={() => (activeTab = 'default-solver')}
					class="pb-2 px-3 text-sm font-medium transition {activeTab === 'default-solver'
						? 'text-indigo-600 border-b-2 border-indigo-600'
						: 'text-gray-500 hover:text-gray-700'}">Default Solver</button
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
				{#if activeTab === 'default-dial'}
					<div>
						<div class="flex items-center justify-between mb-2">
							<label for="global-diameter-input" class="text-sm font-medium text-gray-700"
								>Dial Diameter</label
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
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterStyle ===
								'hole'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-style"
									value="hole"
									checked={draftCenterStyle === 'hole'}
									onchange={() => (draftCenterStyle = 'hole')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Hole</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterStyle ===
								'crosshair'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-style"
									value="crosshair"
									checked={draftCenterStyle === 'crosshair'}
									onchange={() => (draftCenterStyle = 'crosshair')}
									class="h-4 w-4 accent-indigo-600"
								/>
								<span>Crosshair</span>
							</label>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition {draftCenterStyle ===
								'none'
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="center-style"
									value="none"
									checked={draftCenterStyle === 'none'}
									onchange={() => (draftCenterStyle = 'none')}
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
							<label for="global-cutout-label-font-size" class="text-sm font-medium text-gray-700"
								>Cutout Label Font Size</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-cutout-label-font-size"
									type="number"
									min="4"
									max="40"
									value={draftCutoutLabelFontSize}
									onchange={handleCutoutLabelFontSizeInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for cutout labels</p>
					</div>

					<div class="border-t border-gray-100 pt-6">
						<div class="flex items-center justify-between mb-2">
							<label for="global-dial-title-font-size" class="text-sm font-medium text-gray-700"
								>Dial Title Font Size</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-dial-title-font-size"
									type="number"
									min="8"
									max="36"
									value={draftDialTitleFontSize}
									onchange={handleDialTitleFontSizeInputChange}
									class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<span class="text-sm text-gray-500">px</span>
							</div>
						</div>
						<p class="text-xs text-gray-500">Default font size for dial titles</p>
					</div>
				{/if}

				{#if activeTab === 'default-solver'}
					<div>
						<div class="flex items-center justify-between mb-2">
							<label for="global-solver-gap-input" class="text-sm font-medium text-gray-700"
								>Solver Gap</label
							>
							<div class="flex items-center gap-2">
								<input
									id="global-solver-gap-input"
									type="number"
									min="0"
									step="0.5"
									value={draftSolverGapDefault}
									onchange={handleSolverGapInputChange}
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
						<p class="text-xs text-gray-500">Maximum runtime for brute force solver</p>
					</div>
				{/if}

				{#if activeTab === 'experimental'}
					<div>
						<div class="flex items-center justify-between">
							<div>
								<span class="text-sm font-medium text-gray-700"
									>Auto Label Placement (Experimental)</span
								>
								<p class="text-xs text-gray-500 mt-0.5">Enable auto-placement of cutout labels</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={draftAutoLabelPlacementEnabled}
								aria-label="Toggle auto label placement"
								onclick={handleToggleAutoLabelPlacement}
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftAutoLabelPlacementEnabled
									? 'bg-indigo-600'
									: 'bg-gray-200'}"
							>
								<span
									aria-hidden="true"
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftAutoLabelPlacementEnabled
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
									>Force Directed Solver (Experimental)</span
								>
								<p class="text-xs text-gray-500 mt-0.5">
									Use physics-based force directed optimization instead of brute force search
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={draftForceDirectedSolverEnabled}
								aria-label="Toggle force directed solver"
								data-testid="toggle-force-directed-solver"
								onclick={handleToggleForceDirected}
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftForceDirectedSolverEnabled
									? 'bg-indigo-600'
									: 'bg-gray-200'}"
							>
								<span
									aria-hidden="true"
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftForceDirectedSolverEnabled
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

						<div class="border-t border-gray-100 pt-6">
							<div class="flex items-center justify-between mb-2">
								<label for="default-numbering-scheme" class="text-sm font-medium text-gray-700"
									>Default Numbering Scheme</label
								>
								<select
									id="default-numbering-scheme"
									value={draftDefaultNumberingScheme}
									onchange={(e) =>
										(draftDefaultNumberingScheme = (e.target as HTMLSelectElement).value as
											| 'continuous'
											| 'independent')}
									class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="continuous">Continuous</option>
									<option value="independent">Independent</option>
								</select>
							</div>
							<p class="text-xs text-gray-500">
								Default numbering for layer indices in laser export
							</p>
						</div>

						<div class="border-t border-gray-100 pt-6">
							<div class="flex items-center justify-between mb-2">
								<label for="default-title-format" class="text-sm font-medium text-gray-700"
									>Default Title Format</label
								>
								<select
									id="default-title-format"
									value={draftDefaultTitleFormat}
									onchange={(e) =>
										(draftDefaultTitleFormat = (e.target as HTMLSelectElement).value as
											| 'none'
											| 'name'
											| 'numbered'
											| 'both')}
									class="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="none">None (As-is)</option>
									<option value="name">Name Only</option>
									<option value="numbered">Numbered Only</option>
									<option value="both">Name & Numbered</option>
								</select>
							</div>
							<p class="text-xs text-gray-500">
								Default title formatting for dial groups in laser export
							</p>
						</div>
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
