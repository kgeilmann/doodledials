import { describe, expect, it } from 'vitest';

import { detectCutoutLabelOverlapPixels } from './overlap-detection';

const combinedSvgFixture = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
	<g id="layer-1">
		<rect class="cutout" x="20" y="20" width="30" height="20" fill="white" />
	</g>
	<g id="layer-2">
		<rect class="cutout" x="70" y="70" width="20" height="20" fill="white" />
	</g>
</svg>`;

describe('cutout-label raster collision', () => {
	it('returns overlap pixels when label polygon covers visible cutout pixels', async () => {
		const overlap = await detectCutoutLabelOverlapPixels({
			combinedSvg: combinedSvgFixture,
			labelCorners: [
				{ x: 25, y: 25 },
				{ x: 45, y: 25 },
				{ x: 45, y: 35 },
				{ x: 25, y: 35 }
			],
			visibleLayerIds: ['layer-1']
		});

		expect(overlap).toBeGreaterThan(0);
	});

	it('ignores cutouts from hidden layers', async () => {
		const overlap = await detectCutoutLabelOverlapPixels({
			combinedSvg: combinedSvgFixture,
			labelCorners: [
				{ x: 25, y: 25 },
				{ x: 45, y: 25 },
				{ x: 45, y: 35 },
				{ x: 25, y: 35 }
			],
			visibleLayerIds: ['layer-2']
		});

		expect(overlap).toBe(0);
	});
});
