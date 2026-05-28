import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Optimizer Hook', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('clicking optimize calls frontend optimizer stub only', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const optimizeButton = page.getByRole('button', { name: 'Run Optimizer' });
		await expect(optimizeButton).toBeEnabled();

		let optimizerApiCalled = false;
		page.on('request', (request) => {
			if (request.url().includes('/api/optimizer')) {
				optimizerApiCalled = true;
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
		await expect(page.getByTestId('optimizer-iteration-counter')).toContainText('Iterations');
		await expect(page.getByTestId('optimizer-progress-message')).toContainText('Iterations');
		await frontendLogPromise;

		expect(optimizerApiCalled).toBe(false);
		await expect(page.getByTestId('optimizer-review-panel')).toHaveCount(0);
	});
});
