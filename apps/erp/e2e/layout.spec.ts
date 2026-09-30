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
