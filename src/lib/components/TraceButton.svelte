<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { tracePath } from '$lib/utils/trace';
	import { getViewBox, updateLayerPathInSvg, getLayerPathData } from '$lib/utils/doodledial';

	interface Props {
		layerId: string;
		disabled?: boolean;
	}

	let { layerId, disabled = false }: Props = $props();

	let isTracing = $derived(doodledialStore.traceState.tracingLayerId === layerId);

	async function handleTrace() {
		const svgContent = doodledialStore.svgContent;
		if (!svgContent) return;

		doodledialStore.setTraceState(layerId);
		doodledialStore.setError(null);

		try {
			const viewBox = getViewBox(svgContent.raw);
			if (!viewBox) {
				throw new Error('Could not get viewBox from SVG');
			}

			const pathData = getLayerPathData(svgContent.raw, layerId);
			if (!pathData) {
				throw new Error('Could not get path data for layer');
			}

			console.log('Starting trace for path:', pathData);
			const result = await tracePath(pathData, viewBox);
			console.log('Trace result:', result);

			const updatedSvg = updateLayerPathInSvg(svgContent.raw, layerId, result.pathData);

			doodledialStore.updateLayerPathData(layerId, result.pathData, true);
			doodledialStore.setSvgContent({
				raw: updatedSvg,
				filename: svgContent.filename
			});
		} catch (err) {
			console.error('Trace error:', err);
			doodledialStore.setError(err instanceof Error ? err.message : 'Failed to trace path');
		} finally {
			doodledialStore.setTraceState(null);
		}
	}
</script>

<button
	type="button"
	onclick={handleTrace}
	disabled={disabled || isTracing}
	class="px-2 py-1 text-xs font-medium rounded transition-colors {isTracing
		? 'bg-gray-100 text-gray-400 cursor-wait'
		: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}"
>
	{isTracing ? 'Tracing...' : 'Convert'}
</button>
