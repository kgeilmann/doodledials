<script lang="ts">
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { solverStore } from '$lib/stores/solver.svelte';
	function handleOffsetXInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetX(value);
	}

	function handleOffsetYInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setOffsetY(value);
	}

	function handleDiameterInput(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		doodledialStore.setDiameter(value);
	}

	function handleScaleInput(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value) || 1;
		doodledialStore.setScale(value);
	}

	function handleSizeToFitToggle() {
		doodledialStore.setSizeToFit(!doodledialStore.config.sizeToFit);
	}
</script>

<div class="space-y-4">
	<!-- Dimensions -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dimensions</h3>
		<div class="flex items-center justify-between">
			<label for="diameter-input" class="text-sm font-medium text-gray-700">Diameter</label>
			<div class="flex items-center gap-2">
				<input
					id="diameter-input"
					type="number"
					min={doodledialStore.config.minDiameter}
					max={doodledialStore.config.maxDiameter}
					value={doodledialStore.config.diameter}
					oninput={handleDiameterInput}
					disabled={solverStore.solverPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>
	</div>

	<!-- Image -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Image</h3>
		<div class="flex items-center justify-between">
			<label for="offsetX-input" class="text-sm font-medium text-gray-700">X Offset</label>
			<div class="flex items-center gap-2">
				<input
					id="offsetX-input"
					type="number"
					value={doodledialStore.config.offsetX}
					oninput={handleOffsetXInput}
					disabled={solverStore.solverPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="offsetY-input" class="text-sm font-medium text-gray-700">Y Offset</label>
			<div class="flex items-center gap-2">
				<input
					id="offsetY-input"
					type="number"
					value={doodledialStore.config.offsetY}
					oninput={handleOffsetYInput}
					disabled={solverStore.solverPending}
					class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<span class="text-sm text-gray-500">mm</span>
			</div>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="scale-input" class="text-sm font-medium text-gray-700">Scale</label>
			<input
				id="scale-input"
				type="number"
				step="0.05"
				value={doodledialStore.config.scale}
				oninput={handleScaleInput}
				disabled={solverStore.solverPending}
				class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
			/>
		</div>

		<div class="flex items-center justify-between mt-3">
			<label for="size-to-fit-toggle" class="text-sm font-medium text-gray-700">Size to Fit</label>
			<button
				id="size-to-fit-toggle"
				type="button"
				role="switch"
				aria-checked={doodledialStore.config.sizeToFit}
				aria-label="Toggle size to fit"
				onclick={handleSizeToFitToggle}
				disabled={!doodledialStore.originalRawSvg || solverStore.solverPending}
				class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {doodledialStore
					.config.sizeToFit
					? 'bg-indigo-600'
					: 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span
					class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 {doodledialStore
						.config.sizeToFit
						? 'translate-x-[18px]'
						: 'translate-x-[3px]'}"
				></span>
			</button>
		</div>
	</div>

	<!-- Title -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Title</h3>

		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				<span>Dial Title</span>
				<input
					type="text"
					placeholder="Optional dial title..."
					value={doodledialStore.dialTitle}
					oninput={(e) => doodledialStore.setDialTitle(e.currentTarget.value)}
					disabled={solverStore.solverPending}
					class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				/>
			</label>
			<p class="text-xs text-gray-400">Drag title text on the dial to reposition it.</p>
		</div>
	</div>

	<!-- Grouping -->
	<div>
		<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Grouping</h3>
		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				<span>Numbering scheme</span>
				<select
					value={doodledialStore.config.numberingScheme}
					onchange={(e) =>
						doodledialStore.setNumberingScheme(
							(e.target as HTMLSelectElement).value as 'continuous' | 'independent'
						)}
					disabled={solverStore.solverPending || doodledialStore.groups.length <= 1}
					class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<option value="continuous">Continuous</option>
					<option value="independent">Independent</option>
				</select>
			</label>

			<label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
				<span>Title format</span>
				<select
					value={doodledialStore.config.titleFormat}
					onchange={(e) =>
						doodledialStore.setTitleFormat(
							(e.target as HTMLSelectElement).value as 'none' | 'name' | 'numbered' | 'both'
						)}
					disabled={solverStore.solverPending || doodledialStore.groups.length <= 1}
					class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<option value="none">None (As-is)</option>
					<option value="name">Name Only</option>
					<option value="numbered">Numbered Only</option>
					<option value="both">Name & Numbered</option>
				</select>
			</label>
		</div>
	</div>
</div>
