import type { Page } from '@playwright/test';
import { test, expect, loginAs, PERSONAS } from './fixtures';

async function openDemoTools(page: Page) {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('demo-tools-item').click();
  await expect(page.getByRole('dialog', { name: 'Demo tools' })).toBeVisible();
}

test.describe('injected failures', () => {
  // The browser logs every failed fetch as a console error; provoking them is the point here.
  test.use({ allowedConsoleErrors: [/status of 503/] });

  test('a 100% simulated failure rate surfaces the error state, and 0% recovers', async ({
    page,
  }) => {
    await loginAs(page, PERSONAS.warehouse);
    await openDemoTools(page);
    await page.getByLabel('Random failure rate (%)').fill('100');
    await page.keyboard.press('Escape');

    await page.goto('/inventory/products');
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();

    await openDemoTools(page);
    await page.getByLabel('Random failure rate (%)').fill('0');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /retry|try again/i }).click();
    await expect(page.getByRole('grid')).toBeVisible();
  });
});

test('reset demo data requires confirmation and reseeds', async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, PERSONAS.admin);
  await openDemoTools(page);
  await page.getByTestId('reset-demo-data').click();
  // Nothing has happened yet: the destructive button is a second, explicit step.
  await expect(page.getByRole('button', { name: 'Yes, reset everything' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, reset everything' }).click();
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible({ timeout: 180_000 });
  await expect(page).toHaveURL(/\/$/);
});
