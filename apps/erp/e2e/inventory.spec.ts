import { test, expect, loginAs, PERSONAS } from './fixtures';
import { readXlsxParts } from './zip';

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

  test('Excel export builds a valid workbook in a same-origin worker', async ({ page }) => {
    // The worker must be a same-origin script: the CSP allows `worker-src 'self'`,
    // not the blob: workers XLSX libraries spawn (their exports hang under it).
    const worker = page.waitForEvent('worker');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel' }).click();
    expect((await worker).url()).toMatch(/^http:\/\/localhost:\d+\/assets\/xlsx-worker-.*\.js$/);

    const file = await download;
    expect(file.suggestedFilename()).toBe('products.xlsx');
    const parts = await readXlsxParts(await file.path());

    expect(Object.keys(parts)).toContain('xl/worksheets/sheet1.xml');
    const sheet = parts['xl/worksheets/sheet1.xml'] ?? '';
    // 3,000 seeded products plus the header row, all eight columns.
    expect(sheet).toMatch(/<dimension ref="A1:H3\d{3}"\/>/);
    expect(sheet).toContain('<autoFilter ref="A1:H');
    // Bold header, then typed cells: text SKU, VND prices, an integer, a date.
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t>SKU</t></is></c>');
    expect(sheet).toMatch(/<c r="A2" s="0" t="inlineStr"><is><t>[^<]+<\/t><\/is><\/c>/);
    expect(sheet).toMatch(/<c r="E2" s="4"><v>\d+<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="G2" s="2"><v>\d+<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="H2" s="5"><v>\d{5}<\/v><\/c>/);
    expect(parts['xl/styles.xml']).toContain('formatCode="#,##0&quot; ₫&quot;"');
  });

  test('a 100k-row Excel export completes under the strict CSP', async ({ page }) => {
    // Regression guard: `write-excel-file` hung forever on sheets this size (its
    // compression runs in a blob: worker the CSP blocks), and nothing rejected.
    await page.goto('/inventory/stock-movements');
    // Export is disabled while the rows load (a click then would export nothing),
    // and Playwright's click waits for it to enable.
    const download = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name: 'Export Excel' }).click();

    const file = await download;
    expect(file.suggestedFilename()).toBe('stock-movements.xlsx');
    const parts = await readXlsxParts(await file.path());
    const sheet = parts['xl/worksheets/sheet1.xml'] ?? '';
    const rows = Number(/<dimension ref="A1:G(\d+)"\/>/.exec(sheet)?.[1]);
    expect(rows).toBeGreaterThan(100_000);
    // Timestamps are datetime cells (style 6) and quantities are integers (style 2).
    expect(sheet).toMatch(/<c r="A2" s="6"><v>\d{5}(\.\d+)?<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="F2" s="2"><v>-?\d+<\/v><\/c>/);
  });

  test('the 100k-row movements grid is virtualized', async ({ page }) => {
    await page.goto('/inventory/stock-movements');
    await expect(page.getByRole('grid')).toBeVisible();
    // Skeleton rows are rows too: wait until the data has replaced them.
    await expect(page.locator('table[role="grid"] tbody .animate-pulse')).toHaveCount(0);
    await expect(page.locator('table[role="grid"] tbody tr').first()).toBeVisible();
    const rendered = await page.locator('table[role="grid"] tbody tr').count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(200);
  });
});
