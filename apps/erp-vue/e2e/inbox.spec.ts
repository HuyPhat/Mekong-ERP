import type { Locator, Page } from '@playwright/test';
import { test, expect, loginAs, useEnglish, workingDay, PERSONAS } from './fixtures';

// The approvals inbox built with Vue, driven the way a person would, against the
// production build under the real CSP. Each test starts on a fresh browser profile, so
// each one seeds the light dataset itself (about a second).

const rows = (page: Page) => page.locator('tbody tr');
const numberIn = async (row: Locator) =>
  (await row.getByRole('button', { name: /^(PO|LV)-/ }).innerText()).trim();
const rowFor = (page: Page, number: string) => rows(page).filter({ hasText: number });

test.describe('in English', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglish(page);
  });

  test('only logins that decide approvals can sign in, and see what waits on their role', async ({
    page,
  }) => {
    // Not signed in: sent to choose an approver, and only approvers are offered.
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Choose an approver' })).toBeVisible();
    await expect(page.getByRole('list').getByRole('button')).toHaveCount(4);
    await expect(page.getByRole('button', { name: /Nguyễn Văn An/ })).toHaveCount(0);

    await loginAs(page, PERSONAS.manager);
    await expect(page).toHaveURL(/\/$/);
    await expect(rows(page).first()).toBeVisible();
    // The default view is what is waiting: pending steps, for the manager's role.
    await expect(rows(page).filter({ hasText: 'Pending' })).toHaveCount(await rows(page).count());
    await expect(rows(page).filter({ hasText: 'Purchasing Manager' })).toHaveCount(
      await rows(page).count(),
    );
    // Both kinds of document, in one inbox.
    await expect(rows(page).filter({ hasText: 'Purchase order' }).first()).toBeVisible();
    await page.getByLabel('Type', { exact: true }).selectOption('leave_request');
    await expect(rows(page).filter({ hasText: 'Leave request' }).first()).toBeVisible();

    // Signing out returns to the login screen.
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a login without approval rights is sent back to choose one', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mekong-erp:session-user-id', 'warehouse'));
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the address bar holds the view: filters, search, sort and page survive a reload', async ({
    page,
  }) => {
    await loginAs(page, PERSONAS.manager);
    await expect(rows(page).first()).toBeVisible();

    await page.getByLabel('Status', { exact: true }).selectOption('all');
    await expect(page).toHaveURL(/status=all/);
    await page.getByLabel('Type', { exact: true }).selectOption('purchase_order');
    await expect(page).toHaveURL(/type=purchase_order/);

    // Changing the order starts again from the first page.
    await page.getByRole('button', { name: /^Submitted/ }).click();
    await expect(page).toHaveURL(/sort=createdAt:desc/);
    await expect(page.getByRole('columnheader', { name: /Submitted/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    // More than a page of purchase orders across every status.
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('all');
    await expect(page.getByLabel('Type', { exact: true })).toHaveValue('purchase_order');
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Submitted/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    // A search waits for a pause in typing, then narrows the list and joins the address.
    await page.getByLabel('Search', { exact: true }).fill('PO-2026-0000');
    await expect(page).toHaveURL(/q=PO-2026-0000/);
    await expect(page).not.toHaveURL(/page=2/); // a new search starts from the first page
    await page.reload();
    await expect(page.getByLabel('Search', { exact: true })).toHaveValue('PO-2026-0000');

    // Junk in the address falls back to the defaults instead of breaking the page.
    await page.goto('/?status=nonsense&page=-4&sort=colour');
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('pending');
    await expect(rows(page).first()).toBeVisible();
  });

  test('a document opens beside the list with its history, and the link reopens it', async ({
    page,
  }) => {
    await loginAs(page, PERSONAS.manager);
    await page.getByLabel('Type', { exact: true }).selectOption('leave_request');
    const first = rows(page).first();
    const number = await numberIn(first);
    await first.getByRole('button', { name: number }).click();

    const panel = page.getByRole('region', { name: 'Leave request' });
    await expect(panel.getByRole('heading', { name: number })).toBeVisible();
    await expect(panel.getByText('Working days')).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Approval history' })).toBeVisible();
    await expect(panel.getByText('Purchasing Manager — Pending')).toBeVisible();
    await expect(page).toHaveURL(/open=leave_request:/);

    // The address alone is enough to get back to it.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Leave request' })).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page).not.toHaveURL(/open=/);

    // A purchase order shows its own facts.
    await page.getByLabel('Type', { exact: true }).selectOption('purchase_order');
    const order = rows(page).first();
    const orderNumber = await numberIn(order);
    await order.getByRole('button', { name: orderNumber }).click();
    const orderPanel = page.getByRole('region', { name: 'Purchase order' });
    await expect(orderPanel.getByRole('heading', { name: orderNumber })).toBeVisible();
    await expect(orderPanel.getByText('Supplier', { exact: true })).toBeVisible();
    await expect(orderPanel.getByText(/₫/)).toBeVisible();
  });

  test('approving a step takes it off the pending list and says so', async ({ page }) => {
    await loginAs(page, PERSONAS.manager);
    const first = rows(page).first();
    const number = await numberIn(first);
    await first.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByRole('status').getByText(`Approved ${number}`)).toBeVisible();
    await expect(rowFor(page, number)).toHaveCount(0);

    // It is still there among the approved ones, with its decision.
    await page.getByLabel('Status', { exact: true }).selectOption('approved');
    await expect(rowFor(page, number)).toContainText('Approved');
  });

  test('several steps can be approved at once', async ({ page }) => {
    await loginAs(page, PERSONAS.manager);
    await expect(rows(page).first()).toBeVisible();
    const numbers = [
      await numberIn(rows(page).nth(0)),
      await numberIn(rows(page).nth(1)),
      await numberIn(rows(page).nth(2)),
    ];
    for (const number of numbers) {
      await page.getByRole('checkbox', { name: `Select ${number}` }).check();
    }
    await expect(page.getByRole('toolbar')).toContainText('3 selected');
    await page.getByRole('button', { name: 'Approve selected' }).click();
    await expect(page.getByRole('status').getByText('Approved 3 of 3')).toBeVisible();
    for (const number of numbers) await expect(rowFor(page, number)).toHaveCount(0);
    await expect(page.getByRole('toolbar')).toHaveCount(0);
  });

  test('changing or rejecting needs a comment, and the comment is kept in the history', async ({
    page,
  }) => {
    await loginAs(page, PERSONAS.manager);
    const first = rows(page).first();
    const number = await numberIn(first);

    await first.getByRole('button', { name: 'Request changes' }).click();
    const dialog = page.getByRole('dialog', { name: `Request changes to ${number}` });
    await expect(dialog).toBeVisible();
    // Empty: refused, and the dialog stays.
    await dialog.getByRole('button', { name: 'Submit' }).click();
    await expect(dialog.getByText('A comment is required.')).toBeVisible();
    await dialog.getByLabel('Comment').fill('Please split this into two orders.');
    await dialog.getByRole('button', { name: 'Submit' }).click();
    await expect(
      page.getByRole('status').getByText(`Asked for changes to ${number}`),
    ).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(rowFor(page, number)).toHaveCount(0);

    // The next one is rejected instead.
    const next = rows(page).first();
    const nextNumber = await numberIn(next);
    await next.getByRole('button', { name: 'Reject' }).click();
    const rejectDialog = page.getByRole('dialog', { name: `Reject ${nextNumber}` });
    await rejectDialog.getByLabel('Comment').fill('Over budget.');
    await rejectDialog.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('status').getByText(`Rejected ${nextNumber}`)).toBeVisible();
    await expect(rowFor(page, nextNumber)).toHaveCount(0);

    // Escape closes the dialog without deciding anything.
    const another = rows(page).first();
    const anotherNumber = await numberIn(another);
    await another.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByRole('dialog', { name: `Reject ${anotherNumber}` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(rowFor(page, anotherNumber)).toHaveCount(1);

    // The first decision, with its comment, is in that document's history.
    await page.getByLabel('Status', { exact: true }).selectOption('changes_requested');
    const decided = rowFor(page, number);
    await decided.getByRole('button', { name: number }).click();
    await expect(page.getByText('Please split this into two orders.')).toBeVisible();
  });
});

test.describe('the rules', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglish(page);
  });
  // Refusals are 403s and 409s, which the browser logs as console errors.
  test.use({ allowedConsoleErrors: [/status of (403|409)/] });

  test('a batch that includes steps not yet up says what went through', async ({ page }) => {
    // The director's list holds steps whose earlier approver has not decided yet. They
    // can't be approved (the server answers 409), and the batch says how many went through.
    await loginAs(page, PERSONAS.director);
    await page.getByLabel('Type', { exact: true }).selectOption('leave_request');
    await expect(rows(page).first()).toBeVisible();
    await page.getByRole('checkbox', { name: /^Select every row/ }).check();
    await page.getByRole('button', { name: 'Approve selected' }).click();
    await expect(page.getByRole('status').getByText(/could not be approved yet/)).toBeVisible();
  });

  test('nobody decides their own leave request, and the admin login can', async ({ page }) => {
    await loginAs(page, PERSONAS.manager);
    const day = workingDay();
    // The manager is an employee too: file a one-day request for them.
    const number = await page.evaluate(async (date) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: 'emp-approver_manager',
          type: 'annual',
          startDate: date,
          endDate: date,
          reason: 'A day off',
        }),
      });
      return ((await response.json()) as { number: string }).number;
    }, day);
    expect(number).toMatch(/^LV-\d{4}-\d+$/);

    await page.reload();
    await page.getByLabel('Search', { exact: true }).fill(number);
    const row = rowFor(page, number);
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(
      page.getByRole('status').getByText("You can't decide your own leave request."),
    ).toBeVisible();
    await expect(row).toContainText('Pending');

    // Someone else holding the say can: the admin login sees every step.
    await page.getByRole('button', { name: 'Log out' }).click();
    // Wait for the sign-out to finish: a hard navigation now would abort its request.
    await expect(page).toHaveURL(/\/login$/);
    await loginAs(page, PERSONAS.admin);
    await page.getByLabel('Search', { exact: true }).fill(number);
    const adminRow = rowFor(page, number);
    await expect(adminRow).toHaveCount(1);
    await adminRow.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByRole('status').getByText(`Approved ${number}`)).toBeVisible();
  });
});

test('starts in Vietnamese, switches to English, and remembers the choice', async ({ page }) => {
  // No English preset here: this is the first visit of a fresh profile.
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Chọn người duyệt' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

  await loginAs(page, PERSONAS.manager);
  await expect(page.getByRole('heading', { level: 1, name: 'Hộp thư phê duyệt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true }).first()).toBeVisible();

  await page.getByTestId('language-toggle').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Approvals inbox' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Approvals inbox' })).toBeVisible();
});
