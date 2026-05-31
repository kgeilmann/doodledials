import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Export', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('downloads laser SVG directly from export menu', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		await page.locator('button:has-text("Export")').click();
		const svgMenuItem = page.locator('button:has-text("Laser SVG")');
		await expect(svgMenuItem).toBeVisible();

		const [download] = await Promise.all([page.waitForEvent('download'), svgMenuItem.click()]);
		expect(download.suggestedFilename()).toContain('.svg');
	});

	test('can switch export format to STL and download an STL file', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		await page.locator('button:has-text("Export")').click();
		await page.locator('button:has-text("3D STL")').click();

		await expect(page.locator('text=STL Export Options')).toBeVisible();

		await page.getByLabel('Disc thickness (mm)').fill('4');
		await page.getByLabel('Mark thickness (mm)').fill('1');

		const exportButton = page.locator('button:has-text("Download STL")');
		await expect(exportButton).toBeEnabled();

		const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

		expect(download.suggestedFilename()).toContain('.stl');
	});
});
