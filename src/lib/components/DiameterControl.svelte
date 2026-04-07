<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';

	function handleSliderChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		doodledialStore.setDiameter(value);
	}

	function handleInputChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		const { minDiameter, maxDiameter } = doodledialStore.config;
		const clamped = Math.min(Math.max(value, minDiameter), maxDiameter);
		doodledialStore.setDiameter(clamped);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<label for="diameter-input" class="text-sm font-medium text-gray-700">Disc Diameter</label>
		<div class="flex items-center gap-2">
			<input
				id="diameter-input"
				type="number"
				min={doodledialStore.config.minDiameter}
				max={doodledialStore.config.maxDiameter}
				value={doodledialStore.config.diameter}
				onchange={handleInputChange}
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
			/>
			<span class="text-sm text-gray-500">mm</span>
		</div>
	</div>
	<input
		type="range"
		min={doodledialStore.config.minDiameter}
		max={doodledialStore.config.maxDiameter}
		value={doodledialStore.config.diameter}
		oninput={handleSliderChange}
		class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
	/>
	<div class="flex justify-between text-xs text-gray-400">
		<span>{doodledialStore.config.minDiameter}mm</span>
		<span>{doodledialStore.config.maxDiameter}mm</span>
	</div>
</div>
