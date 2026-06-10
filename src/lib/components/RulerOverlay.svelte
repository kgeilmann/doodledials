<script lang="ts">
	let {
		containerEl,
		scrollContainer,
		maxDiameter,
		show
	}: {
		containerEl: HTMLElement | null;
		scrollContainer: HTMLElement | null;
		maxDiameter: number;
		show: boolean;
	} = $props();

	const RULER_SIZE = 22;
	const TICK_1 = 4;
	const TICK_5 = 8;
	const TICK_10 = 13;

	let hCanvas: HTMLCanvasElement | undefined = $state();
	let vCanvas: HTMLCanvasElement | undefined = $state();

	function draw() {
		if (!hCanvas || !vCanvas || !show || !containerEl) return;

		const containerRect = containerEl.getBoundingClientRect();
		const cw = containerRect.width;
		const ch = containerRect.height;
		if (cw <= 0 || ch <= 0) return;

		const svgEl = containerEl.querySelector('svg');
		if (!svgEl) return;

		const svgRect = svgEl.getBoundingClientRect();

		const svgCenterX = svgRect.left + svgRect.width / 2 - containerRect.left;
		const svgCenterY = svgRect.top + svgRect.height / 2 - containerRect.top;
		const screenPxPerMm = svgRect.width / maxDiameter;

		const dpr = window.devicePixelRatio || 1;

		// Horizontal ruler
		{
			const ctx = hCanvas.getContext('2d')!;
			hCanvas.width = cw * dpr;
			hCanvas.height = RULER_SIZE * dpr;
			ctx.scale(dpr, dpr);

			ctx.clearRect(0, 0, cw, RULER_SIZE);

			ctx.fillStyle = 'rgba(255,255,255,0.88)';
			ctx.fillRect(0, 0, cw, RULER_SIZE);

			ctx.strokeStyle = '#cbd5e1';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, RULER_SIZE - 0.5);
			ctx.lineTo(cw, RULER_SIZE - 0.5);
			ctx.stroke();

			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.font = '9px sans-serif';

			const halfMm = Math.ceil(maxDiameter / 2);
			for (let mm = -halfMm; mm <= halfMm; mm++) {
				const px = svgCenterX + mm * screenPxPerMm;
				if (px < 0 || px > cw) continue;

				const absMm = Math.abs(mm);
				if (absMm % 10 === 0) {
					ctx.strokeStyle = '#334155';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(px + 0.5, RULER_SIZE - TICK_10);
					ctx.lineTo(px + 0.5, RULER_SIZE);
					ctx.stroke();

					if (mm !== 0) {
						ctx.fillStyle = '#334155';
						ctx.fillText(String(mm), px + 0.5, RULER_SIZE - TICK_10 - 2);
					}
				} else if (absMm % 5 === 0) {
					ctx.strokeStyle = '#64748b';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(px + 0.5, RULER_SIZE - TICK_5);
					ctx.lineTo(px + 0.5, RULER_SIZE);
					ctx.stroke();
				} else {
					ctx.strokeStyle = '#cbd5e1';
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					ctx.moveTo(px + 0.5, RULER_SIZE - TICK_1);
					ctx.lineTo(px + 0.5, RULER_SIZE);
					ctx.stroke();
				}
			}
		}

		// Vertical ruler
		{
			const ctx = vCanvas.getContext('2d')!;
			vCanvas.width = RULER_SIZE * dpr;
			vCanvas.height = ch * dpr;
			ctx.scale(dpr, dpr);

			ctx.clearRect(0, 0, RULER_SIZE, ch);

			ctx.fillStyle = 'rgba(255,255,255,0.88)';
			ctx.fillRect(0, 0, RULER_SIZE, ch);

			ctx.strokeStyle = '#cbd5e1';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(RULER_SIZE - 0.5, 0);
			ctx.lineTo(RULER_SIZE - 0.5, ch);
			ctx.stroke();

			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.font = '9px sans-serif';

			const halfMm = Math.ceil(maxDiameter / 2);
			for (let mm = -halfMm; mm <= halfMm; mm++) {
				const py = svgCenterY + mm * screenPxPerMm;
				if (py < 0 || py > ch) continue;

				const absMm = Math.abs(mm);
				if (absMm % 10 === 0) {
					ctx.strokeStyle = '#334155';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(RULER_SIZE - TICK_10, py + 0.5);
					ctx.lineTo(RULER_SIZE, py + 0.5);
					ctx.stroke();

					if (mm !== 0) {
						ctx.fillStyle = '#334155';
						ctx.fillText(String(mm), RULER_SIZE - TICK_10 - 2, py + 0.5);
					}
				} else if (absMm % 5 === 0) {
					ctx.strokeStyle = '#64748b';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(RULER_SIZE - TICK_5, py + 0.5);
					ctx.lineTo(RULER_SIZE, py + 0.5);
					ctx.stroke();
				} else {
					ctx.strokeStyle = '#cbd5e1';
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					ctx.moveTo(RULER_SIZE - TICK_1, py + 0.5);
					ctx.lineTo(RULER_SIZE, py + 0.5);
					ctx.stroke();
				}
			}
		}
	}

	function scheduleDraw() {
		if (show && containerEl) {
			requestAnimationFrame(draw);
		}
	}

	$effect(() => {
		void show;
		void containerEl;
		void maxDiameter;

		if (!show || !containerEl || !scrollContainer) return;

		scheduleDraw();

		const onScroll = () => scheduleDraw();
		scrollContainer.addEventListener('scroll', onScroll);

		const ro = new ResizeObserver(() => scheduleDraw());
		ro.observe(containerEl);
		ro.observe(scrollContainer);

		return () => {
			scrollContainer.removeEventListener('scroll', onScroll);
			ro.disconnect();
		};
	});

	$effect(() => {
		void hCanvas;
		void vCanvas;
		if (show && hCanvas && vCanvas) scheduleDraw();
	});
</script>

{#if show}
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		bind:this={hCanvas}
		style="position: absolute; top: 0; left: 0; width: 100%; height: {RULER_SIZE}px; pointer-events: none; z-index: 20;"
		role="img"
		aria-label="Horizontal ruler showing millimeters"
	></canvas>
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		bind:this={vCanvas}
		style="position: absolute; top: 0; left: 0; width: {RULER_SIZE}px; height: 100%; pointer-events: none; z-index: 20;"
		role="img"
		aria-label="Vertical ruler showing millimeters"
	></canvas>
{/if}
