<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleOffsetXInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetX(value);
	}

	function handleOffsetYInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetY(value);
	}

	function handleScaleInput(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value) || 1;
		doodledialStore.setScale(value);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<label for="offsetX-input" class="text-sm font-medium text-gray-700">X Offset</label>
		<div class="flex items-center gap-2">
			<input
				id="offsetX-input"
				type="number"
				value={doodledialStore.config.offsetX}
				oninput={handleOffsetXInput}
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			/>
			<span class="text-sm text-gray-500">mm</span>
		</div>
	</div>

	<div class="flex items-center justify-between">
		<label for="offsetY-input" class="text-sm font-medium text-gray-700">Y Offset</label>
		<div class="flex items-center gap-2">
			<input
				id="offsetY-input"
				type="number"
				value={doodledialStore.config.offsetY}
				oninput={handleOffsetYInput}
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			/>
			<span class="text-sm text-gray-500">mm</span>
		</div>
	</div>

	<div class="flex items-center justify-between">
		<label for="scale-input" class="text-sm font-medium text-gray-700">Scale</label>
		<input
			id="scale-input"
			type="number"
			step="0.05"
			value={doodledialStore.config.scale}
			oninput={handleScaleInput}
			class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
		/>
	</div>
</div>
