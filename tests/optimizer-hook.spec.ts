import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Solver Hook', () => {
	const threePathsSvg = path.resolve(process.cwd(), 'tests/fixtures/three-paths.svg');

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('clicking Run Solver with brute force default runs brute force solver', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		const optimizeButton = page.getByRole('button', { name: 'Run Solver' });
		await expect(optimizeButton).toBeEnabled();

		const solverApiRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/solver')) {
				solverApiRequests.push(request.url());
			}
		});

		await optimizeButton.click();
		await expect(page.getByTestId('solver-config-dialog')).toBeVisible();
		await page.getByTestId('solver-dialog-run-button').click();
		await expect(page.getByTestId('solver-progress-track')).toBeVisible();
		await expect(page.getByTestId('solver-progress-message')).toContainText('Combinations');
		await expect(page.getByTestId('solver-time-counter')).toContainText('Elapsed');
		await expect(page.getByTestId('solver-time-counter')).toContainText('Max');
		await page.waitForLoadState('networkidle');

		expect(solverApiRequests).toHaveLength(0);
	});

	test('clicking Run Solver with force directed enabled runs force directed solver', async ({
		page
	}) => {
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(threePathsSvg);

		await page.getByTestId('global-config-gear-button').click();
		await page.getByTestId('toggle-force-directed-solver').click();
		await page.getByTestId('global-config-ok-button').click();

		const optimizeButton = page.getByRole('button', { name: 'Run Solver' });
		await expect(optimizeButton).toBeEnabled();

		const solverApiRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/solver')) {
				solverApiRequests.push(request.url());
			}
		});

		await optimizeButton.click();
		await expect(page.getByTestId('solver-config-dialog')).toBeVisible();
		await page.getByTestId('solver-dialog-run-button').click();
		await expect(page.getByTestId('solver-progress-track')).toBeVisible();
		await expect(page.getByTestId('solver-progress-message')).toContainText('Iterations');
		await page.waitForLoadState('networkidle');

		expect(solverApiRequests).toHaveLength(0);
	});
});
