<script lang="ts">
	interface Props {
		value: number;
		onchange: (value: number) => void;
		label?: string;
	}

	let { value, onchange, label = 'Rotate' }: Props = $props();

	let dragging = $state(false);
	let startAngle = $state(0);
	let startValue = $state(0);
	let knobElement: HTMLElement | null = $state(null);

	function getAngle(clientX: number, clientY: number, element: HTMLElement): number {
		const rect = element.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = clientX - cx;
		const dy = clientY - cy;
		return Math.atan2(dy, dx) * (180 / Math.PI);
	}

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragging = true;
		knobElement = e.currentTarget as HTMLElement;
		startAngle = getAngle(e.clientX, e.clientY, knobElement);
		startValue = value;
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
		onchange(newValue);
		startAngle = currentAngle;
		startValue = newValue;
	}

	function handleMouseUp() {
		dragging = false;
		knobElement = null;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function handleDoubleClick() {
		const normalized = ((value % 360) + 360) % 360;
		const input = prompt('Enter rotation (degrees):', String(Math.round(normalized)));
		if (input !== null) {
			const parsed = parseFloat(input);
			if (!isNaN(parsed)) {
				onchange(parsed);
			}
		}
	}

	function formatRotation(deg: number): string {
		const normalized = ((deg % 360) + 360) % 360;
		return `${Math.round(normalized)}°`;
	}

	const normalizedValue = $derived(((value % 360) + 360) % 360);
	const circumference = 100.53;
	const dashOffset = $derived(circumference - (circumference * normalizedValue) / 360);
</script>

<div class="flex items-center gap-2 flex-shrink-0">
	<div
		class="relative w-8 h-8 cursor-grab active:cursor-grabbing"
		data-rotation-knob
		role="slider"
		aria-label={label}
		aria-valuenow={Math.round(normalizedValue)}
		tabindex="0"
		onmousedown={handleMouseDown}
		ondblclick={handleDoubleClick}
	>
		<svg viewBox="0 0 40 40" class="w-8 h-8">
			<circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" stroke-width="3" />
			<circle
				cx="20"
				cy="20"
				r="16"
				fill="none"
				stroke="#6366f1"
				stroke-width="3"
				stroke-dasharray={circumference}
				stroke-dashoffset={dashOffset}
				stroke-linecap="round"
			/>
			<line
				x1="20"
				y1="20"
				x2="34"
				y2="20"
				stroke="#6366f1"
				stroke-width="2"
				stroke-linecap="round"
				transform="rotate({normalizedValue}, 20, 20)"
			/>
		</svg>
	</div>
	<span class="text-[10px] text-gray-500 font-mono w-8 text-center">
		{formatRotation(value)}
	</span>
</div>
