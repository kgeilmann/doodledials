import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Offset and Scale Reset on SVG Upload', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('resets offsetX, offsetY, and scale to defaults when uploading new SVG', async ({
		page
	}) => {
		const fileInput = page.locator('input[type="file"]');
		const offsetXInput = page.locator('#offsetX-input');
		const offsetYInput = page.locator('#offsetY-input');
		const scaleInput = page.locator('#scale-input');

		await fileInput.setInputFiles(threePathsSvg);
		await page.waitForTimeout(100);

		await expect(offsetXInput).toHaveValue('0');
		await expect(offsetYInput).toHaveValue('0');
		await expect(scaleInput).toHaveValue('1');

		await offsetXInput.fill('5');
		await offsetYInput.fill('-3');
		await scaleInput.fill('1.1');

		await expect(offsetXInput).toHaveValue('5');
		await expect(offsetYInput).toHaveValue('-3');
		await expect(scaleInput).toHaveValue('1.1');

		await fileInput.setInputFiles([]);
		await fileInput.setInputFiles(threePathsSvg);
		await page.waitForTimeout(100);

		await expect(offsetXInput).toHaveValue('0');
		await expect(offsetYInput).toHaveValue('0');
		await expect(scaleInput).toHaveValue('1');
	});
});
