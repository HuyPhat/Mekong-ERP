import { test, expect, loginAs, gotoApp, PERSONAS } from './fixtures';

// Every list screen is a wide grid. It has to scroll inside its own container:
// if the page itself grows past the viewport, the top bar (user menu, theme and
// language toggles) is pushed off-screen and the user can't reach it.
const GRID_PAGES = [
  '/inventory/products',
  '/inventory/stock-levels',
  '/purchasing/suppliers',
  '/purchasing/orders',
  '/purchasing/bills',
  '/sales/customers',
  '/sales/quotations',
  '/sales/orders',
  '/sales/invoices',
  '/approvals',
  '/hrm/leave',
  '/admin',
];

test('wide grids scroll inside their container instead of stretching the page', async ({
  page,
}) => {
  test.slow();
  await loginAs(page, PERSONAS.admin);
  for (const path of GRID_PAGES) {
    await gotoApp(page, path);
    await expect(page.getByRole('grid')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${path} is wider than the viewport`).toBeLessThanOrEqual(0);
    await expect(page.getByTestId('user-menu-trigger'), `${path} top bar`).toBeInViewport();
  }
});

// Each module's tabs mark the current one with an accent underline. An earlier
// version applied both the transparent and the accent border classes to the current
// tab, so the transparent one won and no tab looked selected anywhere.
test('the current module tab is marked and the others are not', async ({ page }) => {
  await loginAs(page, PERSONAS.admin);
  await gotoApp(page, '/purchasing/orders');
  const underline = (name: string) =>
    page
      .getByRole('link', { name, exact: true })
      .evaluate((link) => getComputedStyle(link).borderBottomColor);

  const transparent = 'rgba(0, 0, 0, 0)';
  expect(await underline('Suppliers')).toBe(transparent);
  expect(await underline('Purchase Orders')).not.toBe(transparent);
});
