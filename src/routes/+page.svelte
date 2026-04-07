<script lang="ts">
	import FileUpload from '$lib/components/FileUpload.svelte';
	import DiameterControl from '$lib/components/DiameterControl.svelte';
	import DialPreview from '$lib/components/DialPreview.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
</script>

<svelte:head>
	<title>Doodledial Generator</title>
</svelte:head>

<main class="h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex">
	<div
		class="w-80 shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col gap-6 overflow-y-auto border-r border-gray-200"
	>
		<header class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-1">Doodledial Generator</h1>
			<p class="text-sm text-gray-500">Upload an SVG and create a dial to print</p>
		</header>

		<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-indigo-100 rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-indigo-600"
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
				<h2 class="text-lg font-semibold text-gray-800">Upload SVG</h2>
			</div>
			<FileUpload />
			{#if doodledialStore.error}
				<p class="mt-3 text-sm text-red-600 flex items-center gap-1">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					{doodledialStore.error}
				</p>
			{/if}
		</section>

		<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-indigo-100 rounded-lg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-semibold text-gray-800">Disc Settings</h2>
			</div>
			<DiameterControl />
		</section>
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex justify-end p-4">
			<ExportButton />
		</div>
		<div class="flex-1 flex items-center justify-center p-4">
			<DialPreview />
		</div>
	</div>
</main>
