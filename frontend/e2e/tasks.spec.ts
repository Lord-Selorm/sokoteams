import { test, expect } from '@playwright/test';
import { loginAndDismissOverlays } from './helpers';

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndDismissOverlays(page);
  });

  test('displays tasks page', async ({ page }) => {
    await page.getByRole('link', { name: /tasks/i }).first().click();
    await expect(page.locator('text=All Tasks').or(page.locator('text=My Tasks'))).toBeVisible({ timeout: 5000 });
  });

  test('can switch to board view', async ({ page }) => {
    await page.getByRole('link', { name: /tasks/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Board' }).click();
    await page.waitForTimeout(1000);
    // Board view renders kanban columns - verify the view changed
    await expect(page.getByRole('button', { name: 'Board' })).toHaveClass(/bg-gray-100/);
  });

  test('opens create task modal', async ({ page }) => {
    await page.getByRole('link', { name: /tasks/i }).first().click();
    await page.getByRole('button', { name: /add task/i }).click();
    await expect(page.locator('text=New Task')).toBeVisible();
  });
});
