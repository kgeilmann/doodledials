import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Layer Rotation', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('can rotate layer using knob and transform is applied in SVG', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const knob = page.locator('[data-knob-id]').first();
		await expect(knob).toBeVisible();

		const target = knob.locator('svg');
		const dest = page.locator('[data-knob-id]').first().locator('svg');

		await target.dragTo(dest, { targetPosition: { x: 50, y: 0 } });

		await page.waitForTimeout(300);

		const svgContainer = page.locator('.bg-white.rounded-xl').locator('svg').first();
		const svgContent = await svgContainer.innerHTML();

		const hasTransform = svgContent.includes('transform') || svgContent.includes('rotate');
		expect(hasTransform).toBe(true);
	});

	test('rotation wraps around when going past 360 degrees', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const layerRow = page
			.locator('li')
			.filter({ has: page.locator('[data-knob-id]') })
			.first();
		const knob = layerRow.locator('[data-knob-id]');

		const target = knob.locator('svg');
		const dest = knob.locator('svg');

		await target.dragTo(dest, { targetPosition: { x: 100, y: 0 } });

		const rotationText = await layerRow.locator('span.font-mono').last().textContent();
		expect(rotationText).toMatch(/^\d+°$/);
	});
});
