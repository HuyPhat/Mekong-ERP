import { api } from './api';
import { freeWeek } from './dates';
import { test, expect, loginAs, switchUser, gotoApp, PERSONAS } from './fixtures';

// The approvals inbox holds leave beside purchase orders: each row says what it is,
// who it is about and in what unit, and nobody can decide their own request. The
// requests are filed through the API; the HR screens have their own spec.

interface Leave {
  id: string;
  number: string;
}

// The refusal below is a 403, which the browser logs as a console error.
test.use({ allowedConsoleErrors: [/status of 403/] });

test('the inbox lists leave, refuses self-approval, and lets someone else decide', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginAs(page, PERSONAS.manager);

  const week = freeWeek(0);
  const file = (employeeId: string, startDate: string, endDate: string) =>
    api<Leave>(page, 'POST', '/leave-requests', {
      employeeId,
      type: 'annual',
      startDate,
      endDate,
      reason: 'Inbox check',
    });
  // The manager's own day off, and an employee's working week (so a director follows).
  const own = (await file('emp-approver_manager', week.tue, week.tue)).json;
  const other = (await file('emp-purchasing', week.mon, week.fri)).json;

  /** One document's row in the inbox, once the search has narrowed to it. */
  async function rowFor(number: string) {
    await gotoApp(page, `/approvals?q=${number}`);
    const row = page.getByRole('row').filter({ hasText: number });
    await expect(row).toHaveCount(1);
    return row;
  }

  await test.step('a row says what it is, who it is for and in what unit', async () => {
    const row = await rowFor(other.number);
    await expect(row).toContainText('Leave request');
    await expect(row).toContainText('Nguyễn Văn An');
    await expect(row).toContainText('5 days');
  });

  await test.step('the type filter narrows the inbox to leave, and lives in the URL', async () => {
    await gotoApp(page, '/approvals?docType=leave_request');
    await expect(page.getByRole('row').filter({ hasText: 'Leave request' }).first()).toBeVisible();
    await expect(page.getByRole('grid')).not.toContainText('Purchase order');
  });

  await test.step('nobody decides their own request', async () => {
    const row = await rowFor(own.number);
    await row.getByRole('button', { name: /^Approve$/ }).click();
    await expect(page.getByText("You can't decide your own leave request.").first()).toBeVisible();
    await expect(row.getByText('Pending', { exact: true })).toBeVisible();
  });

  await test.step('the admin login sees every step, so another decider exists', async () => {
    await switchUser(page, PERSONAS.admin);
    const row = await rowFor(own.number);
    await row.getByRole('button', { name: /^Approve$/ }).click();
    await expect(row.getByText('Approved', { exact: true })).toBeVisible();
  });

  await test.step("someone else's request: approved, then waiting on the director", async () => {
    await switchUser(page, PERSONAS.manager);
    const row = await rowFor(other.number);
    await row.getByRole('button', { name: /^Approve$/ }).click();
    await expect(row.getByText('Approved', { exact: true })).toBeVisible();
    // The toast is announced twice: once shown, once in a live region for screen readers.
    await expect(page.getByText(`${other.number} is waiting on Director`).first()).toBeVisible();
  });
});
