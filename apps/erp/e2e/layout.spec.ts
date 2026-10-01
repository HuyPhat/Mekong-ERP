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

  // A tab stays marked on its own sub-pages. Their URLs carry no list search (page,
  // pageSize), which the tab's link does, and that used to unmark it.
  await gotoApp(page, '/purchasing/orders/new');
  expect(await underline('Purchase Orders')).not.toBe(transparent);
  expect(await underline('Suppliers')).toBe(transparent);
  await gotoApp(page, '/hrm/leave/new');
  expect(await underline('Leave requests')).not.toBe(transparent);
});

// The inbox's Actions column is wider than the room left on a 1400px screen, and used to
// scroll out of reach with the rest of the row. It is pinned to the right edge now: the
// decision buttons stay on screen while the other columns scroll beneath them.
test('the approvals inbox keeps its decision buttons in reach', async ({ page }) => {
  await loginAs(page, PERSONAS.manager);
  await gotoApp(page, '/approvals');
  // The cell of the first row that has something to decide.
  const actions = page
    .getByRole('button', { name: 'Approve', exact: true })
    .first()
    .locator('xpath=ancestor::td[1]');
  await expect(actions).toBeVisible();
  for (const name of ['Approve', 'Request changes', 'Reject']) {
    await expect(actions.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
  // Scrolling the grid sideways leaves them where they are.
  await page
    .getByRole('grid')
    .evaluate((grid) =>
      grid.closest('div[class*="overflow"]')?.scrollTo({ left: Number.MAX_SAFE_INTEGER }),
    );
  await expect(actions.getByRole('button', { name: 'Reject', exact: true })).toBeInViewport({
    ratio: 1,
  });
});
