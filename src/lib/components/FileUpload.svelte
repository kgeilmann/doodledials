<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { optimizerStore } from '$lib/stores/optimizer.svelte';
	import { parseSvgPaths } from '$lib/utils/doodledial';
	import { extractMetadata } from '$lib/utils/doodledial-save';
	import type { LabelPlacementStatus } from '$lib/types/doodledial';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		if (optimizerStore.optimizerPending) return;
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		if (optimizerStore.optimizerPending) return;
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (optimizerStore.optimizerPending) return;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function handleFileSelect(e: Event) {
		if (optimizerStore.optimizerPending) return;
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			processFile(input.files[0]);
		}
	}

	async function processFile(file: File) {
		if (!file.name.toLowerCase().endsWith('.svg')) {
			doodledialStore.setError('Please upload an SVG file');
			return;
		}

		doodledialStore.setLoading(true);
		doodledialStore.setError(null);

		try {
			const raw = await file.text();

			if (restoreFromMetadata(raw)) {
				doodledialStore.setLoading(false);
				return;
			}

			doodledialStore.setOriginalRawSvg(raw);
			const parsed = parseSvgPaths(raw, doodledialStore.config.sizeToFit);

			doodledialStore.clearLayers();
			parsed.layers.forEach((layer) => {
				doodledialStore.addLayer(layer.id, layer.index, layer.name);
			});

			doodledialStore.setSvgContent({
				raw: parsed.updatedSvg || raw,
				filename: file.name
			});

			doodledialStore.setOffsetX(0);
			doodledialStore.setOffsetY(0);
			doodledialStore.setScale(1);
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Failed to load SVG');
		} finally {
			doodledialStore.setLoading(false);
		}
	}

	function restoreFromMetadata(raw: string) {
		const metadata = extractMetadata(raw);
		if (!metadata) return false;

		doodledialStore.setCombinedSvg(null);
		doodledialStore.clearLayers();
		for (const layer of metadata.layers) {
			doodledialStore.addLayer(layer.id, layer.index, layer.name);
			doodledialStore.setLayerRotation(layer.id, layer.rotation);
			if (!layer.visible) {
				doodledialStore.toggleVisibility(layer.id);
			}
			if (layer.labelOffsetX !== undefined && layer.labelOffsetY !== undefined) {
				doodledialStore.setLayerLabelOffsetAuto(layer.id, layer.labelOffsetX, layer.labelOffsetY);
			}
			if (layer.labelPlacementStatus) {
				doodledialStore.setLayerLabelPlacementStatus(
					layer.id,
					layer.labelPlacementStatus as LabelPlacementStatus
				);
			}
		}

		doodledialStore.setOriginalRawSvg(metadata.svgContent.originalRaw ?? null);
		doodledialStore.setDiameter(metadata.config.diameter);
		doodledialStore.setOffsetX(metadata.config.offsetX);
		doodledialStore.setOffsetY(metadata.config.offsetY);
		doodledialStore.setScale(metadata.config.scale);
		doodledialStore.setSizeToFit(metadata.config.sizeToFit ?? true);
		doodledialStore.setCenterHoleDiameter(metadata.config.centerHoleDiameter);
		doodledialStore.setOptimizerGapMm(metadata.config.optimizerGapMm);
		doodledialStore.setPathLabelFontSize(metadata.config.pathLabelFontSize);

		doodledialStore.setDiscTitle(metadata.discTitle);
		doodledialStore.setDiscTitlePosition(metadata.discTitleX, metadata.discTitleY);
		doodledialStore.setDiscTitleFontSize(metadata.discTitleFontSize);

		doodledialStore.setSvgContent({
			raw: metadata.svgContent.raw,
			filename: metadata.svgContent.filename
		});

		return true;
	}

	function openFilePicker() {
		if (optimizerStore.optimizerPending) return;
		fileInput?.click();
	}
</script>

<div
	class="relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-out {isDragging
		? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
		: optimizerStore.optimizerPending
			? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
			: 'border-gray-300 bg-gray-50 cursor-pointer hover:border-gray-400 hover:bg-gray-100'}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={openFilePicker}
	onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
	role="button"
	tabindex="0"
>
	<input
		bind:this={fileInput}
		type="file"
		accept=".svg"
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if doodledialStore.svgContent}
		<div class="flex flex-col items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-10 w-10 text-green-500"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<p class="font-medium text-gray-800">{doodledialStore.svgContent.filename}</p>
			<p class="text-sm text-gray-500">Click to replace</p>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-3">
			<div class="p-3 bg-white rounded-full shadow-sm">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-8 w-8 text-indigo-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
			</div>
			<div>
				<p class="text-gray-700">
					<span class="font-semibold">Drop an SVG file here</span> or click to browse
				</p>
			</div>
		</div>
	{/if}
</div>
