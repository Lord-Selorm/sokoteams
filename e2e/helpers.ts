import { test as base, expect, Page } from '@playwright/test';

export async function loginAndDismissOverlays(page: Page) {
  // Pre-set localStorage so overlays never appear
  await page.addInitScript(() => {
    localStorage.setItem('sokoteams-email-prompted', 'true');
    localStorage.setItem('tutorial-store', JSON.stringify({ state: { hasCompletedTutorial: true }, version: 0 }));
  });

  await page.goto('/');
  await page.getByPlaceholder(/username/i).fill('admin');
  await page.getByPlaceholder(/password/i).first().fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Wait a moment for any overlay to appear and dismiss if needed
  await page.waitForTimeout(1000);

  // Dismiss tutorial if visible
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss email prompt if visible
  const closeBtn = page.locator('button[aria-label="Close"]').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
}
