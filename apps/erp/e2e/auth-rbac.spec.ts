import { test, expect, loginAs, startApp, switchUser, PERSONAS } from './fixtures';

test.describe('auth and RBAC', () => {
  test('defaults to Vietnamese on a fresh profile, not the browser locale', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('mekong-erp:lang'));
    await startApp(page, '/login');
    await expect(page.getByText('Chọn tài khoản demo')).toBeVisible();
  });

  test('a warehouse user cannot see or open Accounting', async ({ page }) => {
    await loginAs(page, PERSONAS.warehouse);
    await expect(page.getByRole('link', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Accounting' })).toHaveCount(0);

    await page.goto('/accounting/trial-balance');
    await expect(page.getByText('Access denied')).toBeVisible();
  });

  test('the session survives a reload, and switching user changes the nav', async ({ page }) => {
    await loginAs(page, PERSONAS.purchasing);
    await page.reload();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    await switchUser(page, PERSONAS.accountant);
    await expect(page.getByRole('link', { name: 'Accounting' })).toBeVisible();
  });

  test('an unknown route shows the 404 page', async ({ page }) => {
    await loginAs(page, PERSONAS.admin);
    await page.goto('/no-such-page');
    await expect(page.getByText('Page not found')).toBeVisible();
  });
});
