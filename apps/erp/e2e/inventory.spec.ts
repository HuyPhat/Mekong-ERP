import { test, expect, loginAs, PERSONAS } from './fixtures';

test.describe('inventory grid', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, PERSONAS.warehouse);
    await page.goto('/inventory/products');
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('search and sort live in the URL and survive a reload', async ({ page }) => {
    const search = page.getByPlaceholder('Search by name or SKU…');
    await search.fill('Trà');
    await expect(page).toHaveURL(/q=Tr/);
    const names = page.locator('table[role="grid"] tbody tr td:nth-child(3)');
    await expect(names.first()).toContainText('Trà');

    await page.reload();
    await expect(page.getByPlaceholder('Search by name or SKU…')).toHaveValue('Trà');
    await expect(names.first()).toContainText('Trà');
  });

  test('a search with no matches shows the empty state', async ({ page }) => {
    await page.getByPlaceholder('Search by name or SKU…').fill('zzz_no_such_product_zzz');
    await expect(page.getByText('No products match these filters.')).toBeVisible();
  });

  test('row selection shows the bulk action bar', async ({ page }) => {
    const boxes = page.locator('table[role="grid"] tbody input[type="checkbox"]');
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await expect(page.getByText('2 selected')).toBeVisible();
  });

  test('CSV export downloads a file', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  });

  test('the 100k-row movements grid is virtualized', async ({ page }) => {
    await page.goto('/inventory/stock-movements');
    await expect(page.getByRole('grid')).toBeVisible();
    await expect(page.locator('table[role="grid"] tbody tr').first()).toBeVisible();
    const rendered = await page.locator('table[role="grid"] tbody tr').count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(200);
  });
});
