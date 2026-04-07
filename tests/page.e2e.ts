import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Doodle Dials', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('has expected title', async ({ page }) => {
		await expect(page).toHaveTitle('Doodle Dials');
	});

	test('shows main heading', async ({ page }) => {
		await expect(page.locator('h1')).toHaveText('Doodle Dials');
	});

	test('has file upload section', async ({ page }) => {
		await expect(page.locator('text=Drop SVG file here')).toBeVisible();
	});

	test('has size selector with presets', async ({ page }) => {
		await expect(page.locator('text=Disc Size')).toBeVisible();
		await expect(page.locator('button:has-text("Small")')).toBeVisible();
		await expect(page.locator('button:has-text("Medium")')).toBeVisible();
		await expect(page.locator('button:has-text("Large")')).toBeVisible();
	});

	test('has export section', async ({ page }) => {
		await expect(page.locator('text=Filename:')).toBeVisible();
		await expect(page.locator('button:has-text("Download SVG")')).toBeVisible();
	});

	test('has preview section', async ({ page }) => {
		await expect(page.locator('text=Preview')).toBeVisible();
	});

	test('can select different disc sizes', async ({ page }) => {
		await page.locator('button:has-text("Small")').click();
		await expect(page.locator('button:has-text("Small")')).toHaveClass(/active/);

		await page.locator('button:has-text("Large")').click();
		await expect(page.locator('button:has-text("Large")')).toHaveClass(/active/);
	});

	test('export button is disabled when no SVG loaded', async ({ page }) => {
		const exportButton = page.locator('button:has-text("Download SVG")');
		await expect(exportButton).toBeDisabled();
	});

	test('can upload SVG file', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		const sampleSvg = path.resolve(process.cwd(), 'samples/squares.svg');

		await fileInput.setInputFiles(sampleSvg);
		await expect(page.locator('text=SVG loaded successfully')).toBeVisible();
	});
});
