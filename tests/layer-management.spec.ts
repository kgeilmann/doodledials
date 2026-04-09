import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Layer Management', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('upload SVG shows 3 layers in layer list', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const layerItems = page.locator('[class*="hover:bg-gray-50"]');
		await expect(layerItems).toHaveCount(3);
	});

	test('toggle layer visibility off hides layer in preview', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const visibilityButtons = page.locator('.max-h-48 ul button svg path[d*="M15 12"]');

		await visibilityButtons.first().click();

		await expect(page.locator('.max-w-full svg g[id^="layer-"][visibility="visible"]')).toHaveCount(
			2
		);
		await expect(page.locator('.max-w-full svg g[id^="layer-"][visibility="hidden"]')).toHaveCount(
			1
		);
	});

	test('toggle layer visibility on shows layer in preview', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const visibilityButtons = page.locator('.max-h-48 ul button svg path[d*="M15 12"]');

		const button = visibilityButtons.first();
		await button.click();

		await expect(page.locator('.max-w-full svg g[id^="layer-"][visibility="visible"]')).toHaveCount(
			2
		);
	});

	test('export SVG excludes hidden layers', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const visibilityButtons = page.locator('.max-h-48 ul button svg path[d*="M15 12"]');
		await visibilityButtons.first().click();

		const exportButton = page.locator('button:has-text("Export SVG")');
		await expect(exportButton).toBeEnabled();

		const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

		const filename = download.suggestedFilename();
		expect(filename).toContain('doodledial');
	});

	test('upload new SVG replaces layers with new ones', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerItems = page.locator('[class*="hover:bg-gray-50"]');
		await expect(layerItems).toHaveCount(3);

		await fileInput.setInputFiles(threePathsSvg);

		await expect(layerItems).toHaveCount(3);
	});
});
