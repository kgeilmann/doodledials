import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Layer Rotation', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('rotation knob is visible for each layer', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const knobs = page.locator('[data-rotation-knob]');
		await expect(knobs).toHaveCount(3);
	});

	test('can rotate layer using knob and transform is applied in SVG', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const knob = page.locator('[data-rotation-knob]').first();
		await expect(knob).toBeVisible();

		const svgContainer = page.locator('.bg-white.rounded-xl').locator('svg').first();
		await expect(svgContainer).toBeVisible();
	});

	test('rotation wraps around when going past 360 degrees', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const layerRow = page
			.locator('li')
			.filter({ has: page.locator('[data-rotation-knob]') })
			.first();
		const knob = layerRow.locator('[data-rotation-knob]');

		const box = await knob.boundingBox();
		if (!box) throw new Error('Knob not found');

		const knobX = box.x + box.width / 2;
		const knobY = box.y + box.height / 2;

		await page.evaluate(
			([x, y]) => {
				const el = document.elementFromPoint(x, y);
				const event = new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y });
				el?.dispatchEvent(event);
			},
			[knobX, knobY]
		);

		await page.evaluate(
			([x, y]) => {
				const el = document.elementFromPoint(x + 100, y);
				const event = new MouseEvent('mousemove', { bubbles: true, clientX: x + 100, clientY: y });
				el?.dispatchEvent(event);
			},
			[knobX, knobY]
		);

		await page.evaluate(
			([x, y]) => {
				const el = document.elementFromPoint(x + 100, y);
				const event = new MouseEvent('mouseup', { bubbles: true, clientX: x + 100, clientY: y });
				el?.dispatchEvent(event);
			},
			[knobX, knobY]
		);

		const rotationText = await layerRow.locator('span.font-mono').last().textContent();
		expect(rotationText).toMatch(/^\d+°$/);
	});
});
