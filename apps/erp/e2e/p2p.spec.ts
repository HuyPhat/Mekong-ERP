import { test, expect, expectStatus, loginAs, switchUser, gotoApp, PERSONAS } from './fixtures';

// PO -> submit -> approve -> receive (partial x2) -> bill -> match -> pay -> closed.
test('procure-to-pay: one PO from creation to closed', async ({ page }) => {
  test.slow();
  await loginAs(page, PERSONAS.purchasing);

  await gotoApp(page, '/purchasing/orders');
  await page.getByRole('link', { name: /New purchase order/i }).click();
  await expect(page).toHaveURL(/\/purchasing\/orders\/new/);

  // Step 1: supplier + warehouse
  await page.getByLabel('Supplier', { exact: true }).click();
  await page.getByPlaceholder(/Search suppliers/i).fill('a');
  await page.locator('[cmdk-item]').first().click();
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: /^Next$/ }).click();

  // Step 2: one line, 2 x 100,000 VND
  await page.getByRole('button', { name: /Search products/i }).click();
  await page.getByPlaceholder(/Search products/i).fill('a');
  await page.locator('[cmdk-item]').first().click();
  const numbers = page.locator('table input[type="number"]');
  await numbers.nth(0).fill('2');
  await numbers.nth(1).fill('100000');
  await page.getByRole('button', { name: /^Next$/ }).click();

  // Step 3: delivery & terms
  await page.locator('input[type="date"]').fill('2026-12-01');
  await page.locator('textarea').fill('Net 30 days');
  await page.getByRole('button', { name: /^Next$/ }).click();

  // Step 4: review + submit
  await expect(page.locator('body')).toContainText(/220[.,]000/);
  await page.getByRole('button', { name: /Create & submit for approval/i }).click();
  await expect(page).toHaveURL(/\/purchasing\/orders\/[a-f0-9-]+$/);
  await expectStatus(page, 'Pending approval');

  const poId = page.url().split('/').pop() ?? '';
  const poNumber = /PO-\d{4}-\d+/.exec(await page.locator('body').innerText())?.[0];
  expect(poNumber).toBeTruthy();

  // Approver acts on it from the inbox.
  await switchUser(page, PERSONAS.manager);
  await gotoApp(page, '/approvals');
  await page.getByPlaceholder(/Search by document number/i).fill(poNumber ?? '');
  // The search is debounced: until it applies, the list is the unfiltered,
  // oldest-first inbox and the first Approve button belongs to another
  // document. Act only on this PO's own row.
  const row = page.getByRole('row').filter({ hasText: poNumber ?? '' });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: /^Approve$/ }).click();
  // Wait for the decision to land before leaving the page; navigating away
  // mid-request would lose it.
  await expect(row.getByText('Approved', { exact: true })).toBeVisible();

  // Back as purchasing: approved, then two partial receipts.
  await switchUser(page, PERSONAS.purchasing);
  await gotoApp(page, `/purchasing/orders/${poId}`);
  await expectStatus(page, 'Approved');

  await page.getByRole('link', { name: /Receive goods/i }).click();
  await page.locator('table input[type="number"]').first().fill('1');
  await page.getByRole('button', { name: /Record receipt/i }).click();
  await expectStatus(page, 'Partially received');

  await page.getByRole('link', { name: /Receive goods/i }).click();
  await page.getByRole('button', { name: /Record receipt/i }).click();
  await expectStatus(page, 'Received');

  // Bill, three-way match, pay.
  await page.getByRole('link', { name: /Create vendor bill/i }).click();
  await page.getByRole('button', { name: /Create bill/i }).click();
  await expect(page).toHaveURL(/\/purchasing\/bills\/[a-f0-9-]+$/);
  await expect(page.locator('body')).toContainText(/matches within tolerance/i);

  await page.getByRole('button', { name: /Confirm match/i }).click();
  await expectStatus(page, 'Matched');
  await page.getByRole('button', { name: /Record payment/i }).click();
  await expectStatus(page, 'Paid');

  await gotoApp(page, `/purchasing/orders/${poId}`);
  await expectStatus(page, 'Closed');
});

test('a warehouse user cannot approve purchase orders', async ({ page }) => {
  await loginAs(page, PERSONAS.warehouse);
  await page.goto('/approvals');
  await expect(page.getByText('Access denied')).toBeVisible();
});
