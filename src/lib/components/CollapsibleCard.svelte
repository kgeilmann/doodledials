<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		icon,
		children,
		open = $bindable(true)
	}: {
		title: string;
		icon?: Snippet;
		children: Snippet;
		open?: boolean;
	} = $props();
</script>

<section class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
	<div class="flex items-center gap-3 mb-4">
		{#if icon}
			{@render icon()}
		{/if}
		<h2 class="text-lg font-semibold text-gray-800">{title}</h2>
		<div class="flex-1"></div>
		<button
			onclick={() => (open = !open)}
			class="p-2 rounded-lg transition-colors duration-150 shrink-0 cursor-pointer"
			class:bg-indigo-100={open}
			class:bg-gray-100={!open}
			aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
			aria-expanded={open}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 transition-transform duration-200"
				class:text-indigo-600={open}
				class:text-gray-400={!open}
				class:rotate-180={open}
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	</div>
	<div
		class="grid transition-[grid-template-rows] duration-200 ease-out"
		style={open ? 'grid-template-rows: 1fr' : 'grid-template-rows: 0fr'}
	>
		<div class="overflow-hidden min-h-0">
			{@render children()}
		</div>
	</div>
</section>
