<script lang="ts">
	import FileUpload from '$lib/components/FileUpload.svelte';
	import OffsetScaleControl from '$lib/components/OffsetScaleControl.svelte';
	import DialPreview from '$lib/components/DialPreview.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import LayerList from '$lib/components/LayerList.svelte';
	import GlobalConfigDialog from '$lib/components/GlobalConfigDialog.svelte';
	import SolverProgressOverlay from '$lib/components/SolverProgressOverlay.svelte';
	import SolverConfigDialog from '$lib/components/SolverConfigDialog.svelte';
	import BruteforceResultDialog from '$lib/components/BruteforceResultDialog.svelte';
	import CollapsibleCard from '$lib/components/CollapsibleCard.svelte';
	import { doodledialStore } from '$lib/stores/doodledial.svelte';
	import { globalConfig } from '$lib/stores/global-config.svelte';
	import { solverStore } from '$lib/stores/solver.svelte';

	let globalConfigDialogOpen = $state(false);
	let uploadOpen = $state(true);
	let settingsOpen = $state(true);
	let layersOpen = $state(true);
</script>

<svelte:head>
	<title>Doodle Dial Generator</title>
</svelte:head>

<main class="h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex">
	<div
		class="w-96 shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col gap-6 overflow-y-auto min-h-0 border-r border-gray-200"
	>
		<header class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-1">Doodledial Generator</h1>
			<p class="text-sm text-gray-500">Upload an SVG and create a dial to print</p>
		</header>

		<CollapsibleCard title="Upload SVG" bind:open={uploadOpen}>
			{#snippet icon()}
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
			{/snippet}
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
		</CollapsibleCard>

		<CollapsibleCard title="Dial Settings" bind:open={settingsOpen}>
			{#snippet icon()}
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
			{/snippet}
			<OffsetScaleControl />
		</CollapsibleCard>

		{#if doodledialStore.svgContent}
			<CollapsibleCard title="Layer Management" bind:open={layersOpen}>
				{#snippet icon()}
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
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
				{/snippet}
				<LayerList />
			</CollapsibleCard>
		{/if}
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex justify-end p-4 gap-3">
			<button
				onclick={() =>
					solverStore.handleOpenSolverDialog(
						globalConfig.forceDirectedSolverEnabled ? 'force-directed' : 'bruteforce'
					)}
				disabled={!doodledialStore.svgContent || solverStore.solverPending}
				class="px-5 py-2.5 bg-indigo-600 text-white border border-indigo-600 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out disabled:bg-indigo-300 disabled:border-indigo-300 disabled:cursor-not-allowed enabled:hover:bg-indigo-700 enabled:hover:border-indigo-700 enabled:active:scale-95"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				<span>{solverStore.solverPending ? 'Running Solver...' : 'Run Solver'}</span>
			</button>

			<button
				onclick={() => (globalConfigDialogOpen = true)}
				disabled={solverStore.solverPending}
				class="px-3 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ease-out hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
				aria-label="Open global settings"
				data-testid="global-config-gear-button"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>

			<ExportButton />
		</div>
		<div class="flex-1 p-4">
			<div class="relative h-full w-full">
				<div class="h-full flex items-center justify-center">
					<DialPreview />
				</div>
				<SolverProgressOverlay />
			</div>
		</div>
	</div>
	<SolverConfigDialog />
	<BruteforceResultDialog />
	<GlobalConfigDialog bind:open={globalConfigDialogOpen} />
</main>
