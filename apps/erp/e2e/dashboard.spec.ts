import { test, expect, loginAs, PERSONAS } from './fixtures';

test('dashboard renders KPI tiles and the three charts', async ({ page }) => {
  await loginAs(page, PERSONAS.accountant);
  for (const label of [
    'Revenue (this month)',
    'Gross margin',
    'Cash position',
    'Pending approvals',
  ]) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  }
  // (legend icons are svg.recharts-surface too, so count the chart wrappers)
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
  // Revenue/COGS trend: one x-axis tick per month for 12 months.
  await expect(
    page.locator('.recharts-xAxis').first().locator('.recharts-cartesian-axis-tick'),
  ).toHaveCount(12);
});

test('AR aging report is reachable from the dashboard', async ({ page }) => {
  await loginAs(page, PERSONAS.accountant);
  await page
    .getByRole('link', { name: /View full report/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/accounting\/(ar|ap)-aging/);
  await expect(page.getByRole('table')).toBeVisible();
});

test('a realtime approval toast appears when a PO is submitted', async ({ page }) => {
  await loginAs(page, PERSONAS.admin);
  await page.goto('/purchasing/orders?page=1&pageSize=50&status=draft');
  await page.locator('table tbody tr').first().locator('a').first().click();
  await page.getByRole('button', { name: /Submit/i }).click();
  await expect(page.getByText('Approval requested', { exact: true })).toBeVisible();
});
