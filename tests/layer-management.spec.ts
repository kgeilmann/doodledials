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

		const layerListButtons = page.locator('.max-h-48 button:has(svg)');
		await expect(layerListButtons).toHaveCount(3);

		await layerListButtons.first().click();

		const visiblePaths = page.locator('.max-w-full svg path[visibility="visible"]');
		const hiddenPaths = page.locator('.max-w-full svg path[visibility="hidden"]');

		await expect(visiblePaths).toHaveCount(2);
		await expect(hiddenPaths).toHaveCount(1);
	});

	test('toggle layer visibility on shows layer in preview', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerListButtons = page.locator('.max-h-48 button:has(svg)');

		await layerListButtons.first().click();

		const visiblePaths = page.locator('.max-w-full svg path[visibility="visible"]');
		await expect(visiblePaths).toHaveCount(2);

		await layerListButtons.first().click();
		await expect(visiblePaths).toHaveCount(3);
	});

	test('export SVG excludes hidden layers', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerListButtons = page.locator('.max-h-48 button:has(svg)');
		await layerListButtons.first().click();

		const exportButton = page.locator('button:has-text("Export SVG")');
		await expect(exportButton).toBeEnabled();

		const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

		const filename = download.suggestedFilename();
		expect(filename).toContain('doodledial');
	});

	test('upload new SVG replaces layers with new ones', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		let layerItems = page.locator('[class*="hover:bg-gray-50"]');
		await expect(layerItems).toHaveCount(3);

		const anotherSvg = path.resolve(process.cwd(), 'samples/squares.svg');
		await fileInput.setInputFiles(anotherSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		layerItems = page.locator('[class*="hover:bg-gray-50"]');
		await expect(layerItems).toHaveCount(4);
	});

	test('Show All button makes all layers visible', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerListButtons = page.locator('.max-h-48 button:has(svg)');
		await layerListButtons.first().click();
		await layerListButtons.nth(1).click();

		const visibleBefore = page.locator('.max-w-full svg path[visibility="visible"]');
		await expect(visibleBefore).toHaveCount(1);

		await page.locator('button:has-text("Show All")').click();

		await expect(visibleBefore).toHaveCount(3);
	});

	test('Hide All button makes all layers hidden', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const visiblePaths = page.locator('.max-w-full svg path[visibility="visible"]');
		await expect(visiblePaths).toHaveCount(3);

		await page.locator('button:has-text("Hide All")').click();

		await expect(visiblePaths).toHaveCount(0);
	});
});
