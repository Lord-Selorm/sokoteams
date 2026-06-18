import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/username/i).fill('admin');
    await page.getByPlaceholder(/password/i).first().fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/username/i).fill('wrong');
    await page.getByPlaceholder(/password/i).first().fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('text=Invalid').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigate to register page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible({ timeout: 5000 });
  });
});
