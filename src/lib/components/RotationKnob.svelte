<script lang="ts">
	interface Props {
		value: number;
		onchange: (value: number) => void;
		label?: string;
		disabled?: boolean;
		ondragstart?: () => void;
		ondragend?: () => void;
	}

	let {
		value,
		onchange,
		label = 'Rotate',
		disabled = false,
		ondragstart,
		ondragend
	}: Props = $props();

	let dragging = $state(false);
	let startAngle = $state(0);
	let startValue = $state(0);
	let knobElement: HTMLElement | null = $state(null);
	let editing = $state(false);
	let inputValue = $state('');
	let localValue = $state(value);

	$effect(() => {
		localValue = value;
	});

	function getAngle(clientX: number, clientY: number, element: HTMLElement): number {
		const rect = element.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = clientX - cx;
		const dy = clientY - cy;
		return Math.atan2(dy, dx) * (180 / Math.PI);
	}

	function handleMouseDown(e: MouseEvent) {
		if (editing || disabled) return;
		e.preventDefault();
		e.stopPropagation();
		dragging = true;
		knobElement = e.currentTarget as HTMLElement;
		startAngle = getAngle(e.clientX, e.clientY, knobElement);
		startValue = localValue;
		ondragstart?.();
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragging || !knobElement) return;
		const currentAngle = getAngle(e.clientX, e.clientY, knobElement);
		let delta = currentAngle - startAngle;

		if (delta > 180) delta -= 360;
		if (delta < -180) delta += 360;

		const newValue = startValue + delta;
		localValue = newValue;
		onchange(newValue);
		startAngle = currentAngle;
		startValue = newValue;
	}

	function handleMouseUp() {
		dragging = false;
		knobElement = null;
		ondragend?.();
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function handleDoubleClick() {
		if (disabled) return;
		editing = true;
		inputValue = String(Math.round(normalizedValue));
	}

	function handleInputBlur() {
		finishEditing();
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			finishEditing();
		} else if (e.key === 'Escape') {
			editing = false;
		}
	}

	function handleInputInput() {
		const parsed = parseFloat(inputValue);
		if (!isNaN(parsed)) {
			localValue = parsed;
			onchange(parsed);
		}
	}

	function finishEditing() {
		const parsed = parseFloat(inputValue);
		if (!isNaN(parsed)) {
			onchange(parsed);
		}
		editing = false;
	}

	function formatRotation(deg: number): string {
		const normalized = ((deg % 360) + 360) % 360;
		return `${Math.round(normalized)}°`;
	}

	const normalizedValue = $derived(((localValue % 360) + 360) % 360);
	const circumference = 2 * Math.PI * 16;
	const dashOffset = $derived(circumference - (circumference * normalizedValue) / 360);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex items-center gap-2 shrink-0 group"
	onclick={() => {
		if (editing) editing = false;
	}}
>
	{#if !editing}
		<div
			class="relative w-8 h-8 cursor-grab active:cursor-grabbing"
			class:opacity-50={disabled}
			class:cursor-not-allowed={disabled}
			data-rotation-knob
			role="slider"
			aria-label={label}
			aria-valuenow={Math.round(normalizedValue)}
			aria-disabled={disabled}
			tabindex={disabled ? -1 : 0}
			onmousedown={disabled ? undefined : handleMouseDown}
			ondblclick={disabled ? undefined : handleDoubleClick}
		>
			<svg viewBox="0 0 40 40" class="w-8 h-8" style="transform-origin: 20px 20px;">
				<circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" stroke-width="3" />
				<circle
					cx="20"
					cy="20"
					r="16"
					fill="none"
					stroke={disabled ? '#9ca3af' : '#6366f1'}
					stroke-width="3"
					stroke-dasharray={circumference}
					stroke-dashoffset={dashOffset}
					stroke-linecap="round"
					transform="rotate(-90, 20, 20)"
				/>
				<line
					x1="20"
					y1="20"
					x2="20"
					y2="6"
					stroke={disabled ? '#9ca3af' : '#6366f1'}
					stroke-width="2"
					stroke-linecap="round"
					transform="rotate({normalizedValue}, 20, 20)"
				/>
			</svg>
		</div>
		<button
			type="button"
			class="text-[10px] text-gray-500 font-mono w-8 text-center hover:text-indigo-600"
			{disabled}
			ondblclick={handleDoubleClick}
		>
			{formatRotation(value)}
		</button>
		<button
			type="button"
			class="w-4 h-4 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed"
			{disabled}
			onclick={() => onchange(0)}
			title="Reset to 0°"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="w-3 h-3"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
				/>
			</svg>
		</button>
	{:else}
		<input
			type="number"
			class="text-[10px] font-mono w-16 text-center bg-white border border-indigo-500 rounded px-1 py-0.5 outline-none"
			bind:value={inputValue}
			oninput={handleInputInput}
			onblur={handleInputBlur}
			onkeydown={handleInputKeydown}
			autofocus
		/>
	{/if}
</div>
