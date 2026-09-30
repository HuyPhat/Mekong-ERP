import { test, expect, expectStatus, loginAs, switchUser, gotoApp, PERSONAS } from './fixtures';

// Quotation -> send -> accept -> SO -> deliver (partial x2) -> invoice -> pay -> closed,
// then the ledger must still balance.
test('order-to-cash: one quotation from creation to closed, ledger stays balanced', async ({
  page,
}) => {
  test.slow();
  await loginAs(page, PERSONAS.sales);

  await gotoApp(page, '/sales/quotations/new');
  await page.getByLabel('Customer', { exact: true }).click();
  await page.getByPlaceholder(/Search customers/i).fill('a');
  await page.locator('[cmdk-item]').first().click();
  await page.getByLabel('Warehouse', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: /Search products/i }).click();
  await page.getByPlaceholder(/Search products/i).fill('a');
  await page.locator('[cmdk-item]').first().click();
  const numbers = page.locator('table input[type="number"]');
  await numbers.nth(0).fill('20');
  await numbers.nth(1).fill('100000');
  const validUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(validUntil);
  await page.locator('textarea').fill('Net 30 days');
  // 20 x 100,000 = 2,000,000 + 10% VAT: the live totals must follow the typed values.
  await expect(page.locator('body')).toContainText(/2[.,]200[.,]000/);
  await page.getByRole('button', { name: /Create quotation/i }).click();

  await expect(page).toHaveURL(/\/sales\/quotations\/[a-f0-9-]+$/);
  await expectStatus(page, 'Draft');
  await page.getByRole('button', { name: /Send to customer/i }).click();
  await expectStatus(page, 'Sent');
  await page.getByRole('button', { name: /Mark accepted/i }).click();
  await expectStatus(page, 'Accepted');
  await page.getByRole('button', { name: /Convert to sales order/i }).click();

  await expect(page).toHaveURL(/\/sales\/orders\/[a-f0-9-]+$/);
  await expectStatus(page, 'Confirmed');
  const soNumber = /SO-\d{4}-\d+/.exec(await page.locator('body').innerText())?.[0];
  expect(soNumber).toBeTruthy();

  await page.getByRole('link', { name: /^Deliver$/ }).click();
  await page.locator('table input[type="number"]').first().fill('10');
  await page.getByRole('button', { name: /Record delivery/i }).click();
  await expectStatus(page, 'Partially delivered');

  await page.getByRole('link', { name: /^Deliver$/ }).click();
  await page.getByRole('button', { name: /Record delivery/i }).click();
  await expectStatus(page, 'Delivered');

  await page.getByRole('button', { name: /Create invoice/i }).click();
  await expect(page).toHaveURL(/\/sales\/invoices\/[a-f0-9-]+$/);
  await expectStatus(page, 'Unpaid');

  // E-invoice preview is clearly labelled as a demo and carries the amount in words.
  await page.getByRole('link', { name: /Preview \/ print/i }).click();
  await expect(page).toHaveURL(/\/preview$/);
  await expect(page.locator('body')).toContainText(/VAT Invoice/i);
  await expect(page.locator('body')).toContainText('Amount in words');
  await expect(page.locator('body')).toContainText('DEMO ONLY');

  await page.goBack();
  await page.getByRole('button', { name: /Record payment/i }).click();
  await expectStatus(page, 'Paid');

  await page
    .getByRole('link', { name: new RegExp(soNumber ?? '') })
    .first()
    .click();
  await expectStatus(page, 'Closed');

  await switchUser(page, PERSONAS.accountant);
  await gotoApp(page, '/accounting/trial-balance');
  await expect(page.getByText('Balanced', { exact: true })).toBeVisible();
});
