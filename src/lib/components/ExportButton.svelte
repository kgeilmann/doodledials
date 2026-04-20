<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { exportDoodledial } from '$lib/utils/doodledial';

	function handleExport() {
		if (!doodledialStore.svgContent) return;

		try {
			const svg = exportDoodledial(
				doodledialStore.svgContent,
				doodledialStore.config,
				doodledialStore.layers
			);
			const blob = new Blob([svg], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `doodledial-${doodledialStore.config.diameter}mm.svg`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			doodledialStore.setError(err instanceof Error ? err.message : 'Export failed');
		}
	}
</script>

<button
	onclick={handleExport}
	disabled={!doodledialStore.svgContent}
	class="group relative px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-gray-300 disabled:cursor-not-allowed enabled:hover:bg-indigo-700 enabled:hover:shadow-lg enabled:hover:shadow-indigo-200 enabled:active:scale-95 enabled:shadow-md enabled:shadow-indigo-100"
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
	<span>Export SVG</span>
</button>
<button
	onclick={() => doodledialStore.runSolver()}
	disabled={!doodledialStore.svgContent || doodledialStore.solving}
	class="group relative px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-gray-300 disabled:cursor-not-allowed enabled:hover:bg-emerald-700 enabled:hover:shadow-lg enabled:hover:shadow-emerald-200 enabled:active:scale-95 enabled:shadow-md enabled:shadow-emerald-100"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fill-rule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
			clip-rule="evenodd"
		/>
	</svg>
	<span>Solve</span>
</button>
