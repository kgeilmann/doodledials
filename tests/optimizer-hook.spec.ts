import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Optimizer Hook', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('clicking Run Optimizer with brute force default runs brute force optimizer', async ({
		page
	}) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const optimizeButton = page.getByRole('button', { name: 'Run Optimizer' });
		await expect(optimizeButton).toBeEnabled();

		const optimizerApiRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/optimizer')) {
				optimizerApiRequests.push(request.url());
			}
		});

		const frontendLogPromise = page.waitForEvent('console', {
			predicate: (msg) =>
				msg.type() === 'log' &&
				msg.text().includes('[optimizer] Frontend brute-force optimizer called:')
		});

		await optimizeButton.click();
		await expect(page.getByTestId('optimizer-config-dialog')).toBeVisible();
		await page.getByTestId('optimizer-dialog-run-button').click();
		await expect(page.getByTestId('optimizer-progress-track')).toBeVisible();
		await expect(page.getByTestId('optimizer-progress-message')).toContainText('Combinations');
		await expect(page.getByTestId('optimizer-time-counter')).toContainText('Elapsed');
		await expect(page.getByTestId('optimizer-time-counter')).toContainText('Max');
		await frontendLogPromise;
		await page.waitForLoadState('networkidle');

		expect(optimizerApiRequests).toHaveLength(0);
		await expect(page.getByTestId('optimizer-review-panel')).toHaveCount(0);
	});

	test('clicking Run Optimizer with force directed enabled runs force directed optimizer', async ({
		page
	}) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await page.getByTestId('global-config-gear-button').click();
		await page.getByTestId('toggle-force-directed-optimizer').click();
		await page.getByTestId('global-config-ok-button').click();

		const optimizeButton = page.getByRole('button', { name: 'Run Optimizer' });
		await expect(optimizeButton).toBeEnabled();

		const optimizerApiRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/optimizer')) {
				optimizerApiRequests.push(request.url());
			}
		});

		const frontendLogPromise = page.waitForEvent('console', {
			predicate: (msg) =>
				msg.type() === 'log' && msg.text().includes('[optimizer] Frontend optimizer called:')
		});

		await optimizeButton.click();
		await expect(page.getByTestId('optimizer-config-dialog')).toBeVisible();
		await page.getByTestId('optimizer-dialog-run-button').click();
		await expect(page.getByTestId('optimizer-progress-track')).toBeVisible();
		await expect(page.getByTestId('optimizer-progress-message')).toContainText('Iterations');
		await frontendLogPromise;
		await page.waitForLoadState('networkidle');

		expect(optimizerApiRequests).toHaveLength(0);
		await expect(page.getByTestId('optimizer-review-panel')).toHaveCount(0);
	});
});
