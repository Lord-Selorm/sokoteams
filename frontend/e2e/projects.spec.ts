import { test, expect } from '@playwright/test';
import { loginAndDismissOverlays } from './helpers';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndDismissOverlays(page);
  });

  test('displays projects page', async ({ page }) => {
    await page.getByRole('link', { name: /projects/i }).first().click();
    await expect(page.locator('text=Projects').first()).toBeVisible({ timeout: 5000 });
  });

  test('can open create project modal', async ({ page }) => {
    await page.getByRole('link', { name: /projects/i }).first().click();
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('heading', { name: 'New Project' })).toBeVisible();
  });
});
