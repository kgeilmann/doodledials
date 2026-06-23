<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import { exportLaserSvg, exportStl, exportPreviewSvg } from '$lib/utils/export-formats';
	import type { CenterMarkType } from '$lib/types/doodledial';
	import type { ExportFormat } from '$lib/utils/export-formats';

	let dialogOpen = $state(false);
	let selectedFormat: ExportFormat = $state(globalConfig.defaultExportFormat);
	let selectedCenterMark: CenterMarkType = $state(globalConfig.centerMarkType);
	let discThicknessMm = $state('3');
	let markThicknessMm = $state('0.5');
	let raised = $state(true);

	function parseThickness(value: string, fallback: number): number {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}

	function makeFilename(base: string, ext: string): string {
		const title = doodledialStore.discTitle.trim();
		const suffix = title ? `-${title.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
		return `doodledial${suffix}.${ext}`;
	}

	function createDownload(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function getVisibleLayers() {
		return doodledialStore.layers.filter((l) => l.visible);
	}

	function openDialog() {
		selectedFormat = globalConfig.defaultExportFormat;
		selectedCenterMark = globalConfig.centerMarkType;
		discThicknessMm = '3';
		markThicknessMm = '0.5';
		raised = true;
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			closeDialog();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeDialog();
		}
	}

	function handleExport() {
		if (!doodledialStore.svgContent) return;

		try {
			if (selectedFormat === 'preview-svg') {
				if (!doodledialStore.combinedSvg) return;
				const svg = exportPreviewSvg(doodledialStore.combinedSvg);
				createDownload(svg, makeFilename('doodledial-preview', 'svg'), 'image/svg+xml');
			} else if (selectedFormat === 'laser-svg') {
				const svg = exportLaserSvg(
					doodledialStore.svgContent,
					doodledialStore.config,
					getVisibleLayers(),
					{
						centerMarkType: selectedCenterMark,
						discTitle: doodledialStore.discTitle || undefined,
						discTitleX: doodledialStore.discTitleX,
						discTitleY: doodledialStore.discTitleY,
						discTitleFontSize: doodledialStore.discTitleFontSize
					}
				);
				createDownload(svg, makeFilename('doodledial', 'svg'), 'image/svg+xml');
			} else if (selectedFormat === 'stl') {
				const stl = exportStl(
					doodledialStore.svgContent,
					doodledialStore.config,
					getVisibleLayers(),
					{
						discThicknessMm: parseThickness(discThicknessMm, 3),
						markThicknessMm: parseThickness(markThicknessMm, 0.5),
						raised
					}
				);
				createDownload(stl, makeFilename('doodledial', 'stl'), 'model/stl');
			}
			closeDialog();
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	let formats: { value: ExportFormat; label: string }[] = [
		{ value: 'preview-svg', label: 'Preview SVG' },
		{ value: 'laser-svg', label: 'Laser SVG' },
		{ value: 'stl', label: '3D STL' }
	];
</script>

<div class="relative inline-flex">
	<button
		onclick={openDialog}
		disabled={!doodledialStore.svgContent || optimizerStore.optimizerPending}
		class="group flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:bg-gray-300 enabled:hover:bg-indigo-700 enabled:hover:shadow-lg enabled:hover:shadow-indigo-200 enabled:active:scale-95"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fill-rule="evenodd"
				d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>Export</span>
	</button>
</div>

{#if dialogOpen}
	<div
		class="fixed inset-0 z-30 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Export dial"
		tabindex="-1"
		onkeydown={handleKeydown}
	>
		<div
			class="absolute inset-0 bg-slate-900/40"
			role="presentation"
			onclick={handleBackdropClick}
		></div>

		<section
			class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-5"
		>
			<h2 class="text-lg font-semibold text-gray-900">Export Dial</h2>
			<p class="mt-1 text-sm text-gray-500">Choose format and options, then export.</p>

			<div class="mt-4 flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
				{#each formats as fmt (fmt.value)}
					<button
						type="button"
						onclick={() => (selectedFormat = fmt.value)}
						class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150"
						class:bg-white={selectedFormat === fmt.value}
						class:text-gray-900={selectedFormat === fmt.value}
						class:shadow-sm={selectedFormat === fmt.value}
						class:text-gray-500={selectedFormat !== fmt.value}
						class:hover:text-gray-700={selectedFormat !== fmt.value}
					>
						{fmt.label}
					</button>
				{/each}
			</div>

			{#if selectedFormat === 'preview-svg'}
				<p class="mt-4 text-sm text-gray-500">Exports the combined SVG as-is.</p>
			{/if}

			{#if selectedFormat === 'laser-svg'}
				<div class="mt-4">
					<p class="text-sm text-gray-500">Laser-ready SVG with cut/engrave encoding.</p>
					<div class="mt-3">
						<span class="text-xs font-medium text-gray-600">Center mark</span>
						<div class="mt-1 flex gap-2">
							<button
								type="button"
								onclick={() => (selectedCenterMark = 'hole')}
								class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
								class:bg-indigo-600={selectedCenterMark === 'hole'}
								class:text-white={selectedCenterMark === 'hole'}
								class:border={selectedCenterMark !== 'hole'}
								class:border-gray-300={selectedCenterMark !== 'hole'}
								class:text-gray-600={selectedCenterMark !== 'hole'}
								class:hover:bg-gray-50={selectedCenterMark !== 'hole'}>Hole</button
							>
							<button
								type="button"
								onclick={() => (selectedCenterMark = 'crosshair')}
								class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
								class:bg-indigo-600={selectedCenterMark === 'crosshair'}
								class:text-white={selectedCenterMark === 'crosshair'}
								class:border={selectedCenterMark !== 'crosshair'}
								class:border-gray-300={selectedCenterMark !== 'crosshair'}
								class:text-gray-600={selectedCenterMark !== 'crosshair'}
								class:hover:bg-gray-50={selectedCenterMark !== 'crosshair'}>Crosshair</button
							>
							<button
								type="button"
								onclick={() => (selectedCenterMark = 'none')}
								class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
								class:bg-indigo-600={selectedCenterMark === 'none'}
								class:text-white={selectedCenterMark === 'none'}
								class:border={selectedCenterMark !== 'none'}
								class:border-gray-300={selectedCenterMark !== 'none'}
								class:text-gray-600={selectedCenterMark !== 'none'}
								class:hover:bg-gray-50={selectedCenterMark !== 'none'}>None</button
							>
						</div>
					</div>
				</div>
			{/if}

			{#if selectedFormat === 'stl'}
				<div class="mt-4">
					<p class="text-sm text-gray-500">3D mesh for printing.</p>

					<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label
							class="flex flex-col gap-1 text-xs font-medium text-gray-600"
							for="disc-thickness-mm"
						>
							<span>Disc thickness (mm)</span>
							<input
								id="disc-thickness-mm"
								bind:value={discThicknessMm}
								type="number"
								min="0.1"
								step="0.1"
								class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
							/>
						</label>

						<label
							class="flex flex-col gap-1 text-xs font-medium text-gray-600"
							for="mark-thickness-mm"
						>
							<span>Mark thickness (mm)</span>
							<input
								id="mark-thickness-mm"
								bind:value={markThicknessMm}
								type="number"
								min="0.1"
								step="0.1"
								class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
							/>
						</label>
					</div>

					<div class="mt-4">
						<span class="text-xs font-medium text-gray-600">Mark style</span>
						<div class="mt-1 flex gap-2">
							<button
								type="button"
								onclick={() => (raised = true)}
								class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
								class:bg-indigo-600={raised}
								class:text-white={raised}
								class:border={!raised}
								class:border-gray-300={!raised}
								class:text-gray-600={!raised}
								class:hover:bg-gray-50={!raised}>Raised</button
							>
							<button
								type="button"
								onclick={() => (raised = false)}
								class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
								class:bg-indigo-600={!raised}
								class:text-white={!raised}
								class:border={raised}
								class:border-gray-300={raised}
								class:text-gray-600={raised}
								class:hover:bg-gray-50={raised}>Recessed</button
							>
						</div>
					</div>
				</div>
			{/if}

			<div class="mt-5 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={closeDialog}
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
					>Cancel</button
				>
				<button
					type="button"
					onclick={handleExport}
					class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
					>Export</button
				>
			</div>
		</section>
	</div>
{/if}
