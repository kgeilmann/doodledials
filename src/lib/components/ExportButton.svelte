<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import { exportLaserSvg, exportStl, exportPreviewSvg } from '$lib/utils/export-formats';
	import type { CenterMarkType } from '$lib/types/doodledial';

	let menuOpen = $state(false);
	let discThicknessMm = $state('3');
	let markThicknessMm = $state('0.5');
	let raised = $state(true);
	let stlDialogEl: HTMLDialogElement | null = $state(null);

	function parseThickness(value: string, fallback: number): number {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}

	function makeFilename(base: string, ext: string): string {
		const title = doodledialStore.discTitle.trim();
		const suffix = title ? `-${title.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
		return `doodledial${suffix}.${ext}`;
	}

	function createDownload(svgOrStl: string, filename: string, mimeType: string) {
		const blob = new Blob([svgOrStl], { type: mimeType });
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

	function exportPreview() {
		if (!doodledialStore.combinedSvg) return;

		try {
			const svg = exportPreviewSvg(doodledialStore.combinedSvg);
			createDownload(svg, makeFilename('doodledial-preview', 'svg'), 'image/svg+xml');
			menuOpen = false;
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	function exportSvg(centerMarkOverride?: CenterMarkType) {
		if (!doodledialStore.svgContent) return;

		try {
			const svg = exportLaserSvg(
				doodledialStore.svgContent,
				doodledialStore.config,
				getVisibleLayers(),
				{ centerMarkType: centerMarkOverride }
			);
			createDownload(svg, makeFilename('doodledial', 'svg'), 'image/svg+xml');
			menuOpen = false;
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	function openStlDialog() {
		if (!doodledialStore.svgContent) return;
		menuOpen = false;
		stlDialogEl?.showModal();
	}

	function closeStlDialog() {
		stlDialogEl?.close();
	}

	function exportStlFromDialog() {
		if (!doodledialStore.svgContent) return;

		try {
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
			closeStlDialog();
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}

	function handleMainClick() {
		menuOpen = false;
		handleFormatSelect(globalConfig.defaultExportFormat);
	}

	function handleFormatSelect(format: 'preview-svg' | 'laser-svg' | 'stl') {
		if (format === 'preview-svg') {
			exportPreview();
		} else if (format === 'stl') {
			openStlDialog();
		} else {
			exportSvg();
		}
	}
</script>

<div class="relative inline-flex">
	<div class="flex rounded-xl shadow-md shadow-indigo-100">
		<button
			onclick={handleMainClick}
			disabled={!doodledialStore.svgContent || optimizerStore.optimizerPending}
			class="group flex items-center gap-2 rounded-l-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:bg-gray-300 enabled:hover:bg-indigo-700 enabled:hover:shadow-lg enabled:hover:shadow-indigo-200 enabled:active:scale-95"
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
			<span>
				Export
				{globalConfig.defaultExportFormat === 'preview-svg'
					? '(Preview SVG)'
					: globalConfig.defaultExportFormat === 'stl'
						? '(3D STL)'
						: '(Laser SVG)'}
			</span>
		</button>
		<button
			onclick={() => (menuOpen = !menuOpen)}
			disabled={!doodledialStore.svgContent || optimizerStore.optimizerPending}
			aria-expanded={menuOpen}
			aria-haspopup="menu"
			aria-label="Export options"
			class="rounded-r-xl border-l border-indigo-500 bg-indigo-600 px-3 py-2.5 font-medium text-white transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-300 enabled:hover:bg-indigo-700 enabled:active:scale-95"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-4 w-4"
			>
				<path
					fill-rule="evenodd"
					d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>

	{#if menuOpen}
		<div
			class="absolute right-0 top-full z-20 mt-2 min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
		>
			<button
				type="button"
				onclick={() => handleFormatSelect('preview-svg')}
				class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>Preview SVG</span>
			</button>
			<button
				type="button"
				onclick={() => handleFormatSelect('laser-svg')}
				class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>Laser SVG</span>
			</button>
			<button
				type="button"
				onclick={() => {
					exportSvg('crosshair');
					menuOpen = false;
				}}
				class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>Laser SVG (Crosshair)</span>
			</button>
			<button
				type="button"
				onclick={() => {
					exportSvg('none');
					menuOpen = false;
				}}
				class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>Laser SVG (No Center)</span>
			</button>
			<button
				type="button"
				onclick={() => handleFormatSelect('stl')}
				class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-indigo-50"
				role="menuitem"
			>
				<span>3D STL</span>
			</button>
		</div>
	{/if}
</div>

<dialog
	bind:this={stlDialogEl}
	class="w-full max-w-md rounded-2xl border border-gray-200 p-0 shadow-2xl backdrop:bg-black/40"
>
	<div class="p-5">
		<h3 class="text-lg font-semibold text-gray-900">STL Export Options</h3>
		<p class="mt-1 text-sm text-gray-500">Set thickness values before generating the STL file.</p>

		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="disc-thickness-mm">
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

			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600" for="mark-thickness-mm">
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
					class:hover:bg-gray-50={!raised}
				>
					Raised
				</button>
				<button
					type="button"
					onclick={() => (raised = false)}
					class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
					class:bg-indigo-600={!raised}
					class:text-white={!raised}
					class:border={raised}
					class:border-gray-300={raised}
					class:text-gray-600={raised}
					class:hover:bg-gray-50={raised}
				>
					Recessed
				</button>
			</div>
		</div>

		<div class="mt-5 flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={closeStlDialog}
				class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={exportStlFromDialog}
				class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
			>
				Download STL
			</button>
		</div>
	</div>
</dialog>
