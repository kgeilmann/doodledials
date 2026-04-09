<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { parseSvgPaths } from '$lib/utils/doodledial';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function handleFileSelect(e: Event) {
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
			const parsedLayers = parseSvgPaths(raw);

			doodledialStore.clearLayers();
			parsedLayers.forEach((layer) => {
				doodledialStore.addLayer(layer.id, layer.name);
			});

			doodledialStore.setSvgContent({
				raw: parsedLayers[0]?.updatedSvg || raw,
				filename: file.name
			});
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Failed to load SVG');
		} finally {
			doodledialStore.setLoading(false);
		}
	}

	function openFilePicker() {
		fileInput?.click();
	}
</script>

<div
	class="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ease-out {isDragging
		? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
		: 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}"
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
