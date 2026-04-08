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

		const layerCheckboxes = page.locator('input[type="checkbox"]');
		await expect(layerCheckboxes).toHaveCount(3);

		await layerCheckboxes.first().uncheck();

		const visiblePaths = page.locator('.max-w-full svg path[visibility="visible"]');
		const hiddenPaths = page.locator('.max-w-full svg path[visibility="hidden"]');

		await expect(visiblePaths).toHaveCount(2);
		await expect(hiddenPaths).toHaveCount(1);
	});

	test('toggle layer visibility on shows layer in preview', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerCheckboxes = page.locator('input[type="checkbox"]');

		await layerCheckboxes.first().uncheck();
		await expect(layerCheckboxes.first()).not.toBeChecked();

		const visiblePaths = page.locator('.max-w-full svg path[visibility="visible"]');
		await expect(visiblePaths).toHaveCount(2);

		await layerCheckboxes.first().check();
		await expect(layerCheckboxes.first()).toBeChecked();
		await expect(visiblePaths).toHaveCount(3);
	});

	test('export SVG excludes hidden layers', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerCheckboxes = page.locator('input[type="checkbox"]');
		await layerCheckboxes.first().uncheck();

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

	test('Show All makes all layers visible', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerCheckboxes = page.locator('input[type="checkbox"]');
		await layerCheckboxes.first().uncheck();
		await layerCheckboxes.nth(1).uncheck();

		await expect(layerCheckboxes.first()).not.toBeChecked();
		await expect(layerCheckboxes.nth(1)).not.toBeChecked();

		await page.locator('text=Show All').click();

		await expect(layerCheckboxes.first()).toBeChecked();
		await expect(layerCheckboxes.nth(1)).toBeChecked();
		await expect(layerCheckboxes.nth(2)).toBeChecked();
	});

	test('Hide All makes all layers hidden', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const layerCheckboxes = page.locator('input[type="checkbox"]');
		await expect(layerCheckboxes.first()).toBeChecked();

		await page.locator('text=Hide All').click();

		await expect(layerCheckboxes.first()).not.toBeChecked();
		await expect(layerCheckboxes.nth(1)).not.toBeChecked();
		await expect(layerCheckboxes.nth(2)).not.toBeChecked();
	});
});
