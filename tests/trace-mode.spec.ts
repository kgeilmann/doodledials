import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Trace Mode', () => {
	const strokePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		page.on('console', (msg) => console.log('BROWSER:', msg.text()));
		await page.goto('/');
	});

	test('convert button appears for each layer', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(strokePathsSvg);

		await expect(page.locator('text=Layer Management')).toBeVisible();

		const convertButtons = page.locator('button:has-text("Convert")');
		await expect(convertButtons).toHaveCount(3);
	});

	test('clicking convert traces path successfully', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(strokePathsSvg);

		const convertButton = page.locator('button:has-text("Convert")').first();
		await convertButton.click();

		await expect(convertButton).toContainText('Convert', { timeout: 10000 });
	});

	test('converted layer appears in SVG with correct styling', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(strokePathsSvg);

		const convertButton = page.locator('button:has-text("Convert")').first();
		await convertButton.click();

		await expect(convertButton).toContainText('Convert', { timeout: 10000 });

		await page.waitForTimeout(1000);

		const svgElement = page.locator('.max-w-full svg');
		await expect(svgElement).toBeVisible();

		const svgHtml = await svgElement.evaluate((el) => el.innerHTML);
		expect(svgHtml).toContain('fill: rgb(211, 211, 211)');
		expect(svgHtml).toContain('stroke: rgb(255, 0, 0)');
		expect(svgHtml).toContain('stroke-width: 0.5');
	});
});
