import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Export', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('opens export dialog on button click', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('button:has-text("Export")')).toBeEnabled();

		await page.locator('button:has-text("Export")').click();
		await expect(page.getByRole('dialog', { name: 'Export dial' })).toBeVisible();
	});

	test('exports Laser SVG by default with segment selection', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await page.locator('button:has-text("Export")').click();
		await expect(page.getByRole('dialog', { name: 'Export dial' })).toBeVisible();

		await page.locator('button:has-text("Laser SVG")').click();

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.locator('button:has-text("Export")').last().click()
		]);
		expect(download.suggestedFilename()).toContain('.svg');
	});

	test('can select and export Preview SVG', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await page.locator('button:has-text("Export")').click();
		await expect(page.getByRole('dialog', { name: 'Export dial' })).toBeVisible();

		await page.locator('button:has-text("Preview SVG")').click();

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.locator('button:has-text("Export")').last().click()
		]);
		expect(download.suggestedFilename()).toContain('.svg');
	});

	test('can select and export 3D STL with custom options', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

		await fileInput.setInputFiles(sampleSvg);
		await page.locator('button:has-text("Export")').click();
		await expect(page.getByRole('dialog', { name: 'Export dial' })).toBeVisible();

		await page.locator('button:has-text("3D STL")').click();

		await page.getByLabel('Disc thickness (mm)').fill('4');
		await page.getByLabel('Mark thickness (mm)').fill('1');

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.locator('button:has-text("Export")').last().click()
		]);
		expect(download.suggestedFilename()).toContain('.stl');
	});
});
