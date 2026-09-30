import type { Page } from '@playwright/test';
import { addDays, anchorYear, freeWeek } from './dates';
import { test, expect, expectStatus, loginAs, switchUser, gotoApp, PERSONAS } from './fixtures';

// The HR screens, end to end, through the UI: a leave request, the two-step approval
// it needs, the balance that follows it, being sent back and resubmitted, and the
// rules the form and the server enforce. The API side and the approvals inbox have
// their own specs. Dates come from dates.ts, so the same specs pass on any day. The
// app is in English here: the profile restored from the seed says so.

/** Fills the request form's dates and reason; the caller submits. */
async function fillRequest(page: Page, first: string, last: string, reason: string) {
  await page.getByLabel('First day').fill(first);
  await page.getByLabel('Last day').fill(last);
  await page.getByLabel('Reason').fill(reason);
}

/** The "N of 12 days left" figure from the form's preview. */
async function daysLeft(page: Page): Promise<number> {
  const text = await page.getByText(/days left, /).innerText();
  const match = /(\d+) of \d+ days left/.exec(text);
  if (!match?.[1]) throw new Error(`No balance in the preview: ${text}`);
  return Number(match[1]);
}

/**
 * A document's rows in the approvals inbox, once the search has narrowed to it. The
 * inbox lists steps, so a request that went round twice has a row for each round.
 */
async function inboxRow(page: Page, number: string, rounds = 1) {
  await gotoApp(page, `/approvals?q=${number}`);
  const rows = page.getByRole('row').filter({ hasText: number });
  await expect(rows).toHaveCount(rounds);
  return rows;
}

/** The leave number shown on a request's page. */
async function numberOnPage(page: Page): Promise<string> {
  const number = /LV-\d{4}-\d+/.exec(await page.locator('body').innerText())?.[0] ?? '';
  expect(number).not.toBe('');
  return number;
}

test('leave request: preview, two approvals, balance, then cancelled', async ({ page }) => {
  test.setTimeout(240_000);
  const week = freeWeek(0);

  await loginAs(page, PERSONAS.purchasing);

  await test.step('HR opens on "My requests" with the balance tiles', async () => {
    await page.getByRole('link', { name: 'HR', exact: true }).click();
    await expect(page).toHaveURL(/\/hrm\/leave\?.*scope=mine/);
    await expect(page.getByText('Remaining', { exact: true })).toBeVisible();
    // Only approvers get the "Everyone" view.
    await expect(page.getByRole('button', { name: 'Everyone' })).toHaveCount(0);
  });

  let before = 0;
  await test.step('the form previews working days and the balance before anything is sent', async () => {
    await page.getByRole('link', { name: 'New request' }).click();
    await expect(page.getByRole('heading', { name: 'New leave request' })).toBeVisible();
    await page.getByLabel('First day').fill(week.mon);
    await page.getByLabel('Last day').fill(week.fri);
    await expect(page.getByText('5 working days')).toBeVisible();
    before = await daysLeft(page);
    await expect(page.getByText(new RegExp(`${before - 5} after this request`))).toBeVisible();
  });

  let number = '';
  let leaveId = '';
  await test.step('submitting lands on the request, waiting on a manager then a director', async () => {
    await page.getByLabel('Reason').fill('Family trip');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page).toHaveURL(/\/hrm\/leave\/[a-f0-9-]+$/);
    await expectStatus(page, 'Awaiting approval');
    leaveId = page.url().split('/').pop() ?? '';
    number = await numberOnPage(page);
    await expect(page.getByText('Purchasing Manager — Pending')).toBeVisible();
    await expect(page.getByText('Director — Pending')).toBeVisible();
    // The requester can withdraw it, but has no decision to make.
    await expect(page.getByRole('button', { name: 'Cancel request' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Review in approvals inbox' })).toHaveCount(0);
  });

  await test.step('the days are held against the balance while it waits', async () => {
    await page.getByRole('link', { name: '← Leave requests' }).click();
    await page.getByRole('link', { name: 'New request' }).click();
    await page.getByLabel('First day').fill(week.mon);
    await page.getByLabel('Last day').fill(week.mon);
    expect(await daysLeft(page)).toBe(before - 5);
  });

  await test.step('the manager reaches it from the request and approves; then the director', async () => {
    await switchUser(page, PERSONAS.manager);
    await gotoApp(page, `/hrm/leave/${leaveId}`);
    await page.getByRole('link', { name: 'Review in approvals inbox' }).click();
    await expect(page).toHaveURL(/\/approvals\?/);
    const managerRow = page.getByRole('row').filter({ hasText: number });
    await expect(managerRow).toHaveCount(1);
    await expect(managerRow).toContainText('Nguyễn Văn An');
    // The number in the inbox leads back to the request.
    await expect(managerRow.getByRole('link', { name: number })).toHaveAttribute(
      'href',
      new RegExp(`/hrm/leave/${leaveId}$`),
    );
    await managerRow.getByRole('button', { name: /^Approve$/ }).click();
    await expect(managerRow.getByText('Approved', { exact: true })).toBeVisible();

    await switchUser(page, PERSONAS.director);
    const directorRow = await inboxRow(page, number);
    await directorRow.getByRole('button', { name: /^Approve$/ }).click();
    await expect(directorRow.getByText('Approved', { exact: true })).toBeVisible();
  });

  await test.step('approved: both steps in the history', async () => {
    await switchUser(page, PERSONAS.purchasing);
    await gotoApp(page, `/hrm/leave/${leaveId}`);
    await expectStatus(page, 'Approved');
    await expect(page.getByText('Purchasing Manager — Approved')).toBeVisible();
    await expect(page.getByText('Director — Approved')).toBeVisible();
  });

  await test.step('cancelling approved leave that has not started returns the days', async () => {
    await page.getByRole('button', { name: 'Cancel request' }).click();
    await expectStatus(page, 'Cancelled');
    await expect(page.getByRole('button', { name: 'Cancel request' })).toHaveCount(0);

    await page.getByRole('link', { name: '← Leave requests' }).click();
    await page.getByRole('link', { name: 'New request' }).click();
    await page.getByLabel('First day').fill(week.mon);
    await page.getByLabel('Last day').fill(week.mon);
    expect(await daysLeft(page)).toBe(before);
  });
});

test('leave request: sent back for changes, edited, resubmitted, approved', async ({ page }) => {
  test.setTimeout(240_000);
  const week = freeWeek(2);

  await loginAs(page, PERSONAS.purchasing);
  await gotoApp(page, '/hrm/leave/new');
  // Two days: the manager alone decides.
  await fillRequest(page, week.mon, week.tue, 'Moving house');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page).toHaveURL(/\/hrm\/leave\/[a-f0-9-]+$/);
  const leaveId = page.url().split('/').pop() ?? '';
  const number = await numberOnPage(page);
  await expect(page.getByText('Purchasing Manager — Pending')).toBeVisible();
  await expect(page.getByText('Director')).toHaveCount(0);

  await test.step('the manager asks for changes, with a comment', async () => {
    await switchUser(page, PERSONAS.manager);
    const row = await inboxRow(page, number);
    await row.getByRole('button', { name: 'Request changes' }).click();
    await page.getByLabel('Comment').fill('Please take Wednesday too, we need you on Tuesday.');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(row.getByText('Changes requested', { exact: true })).toBeVisible();
  });

  await test.step('the requester sees why, and can only edit and resubmit', async () => {
    await switchUser(page, PERSONAS.purchasing);
    await gotoApp(page, `/hrm/leave/${leaveId}`);
    await expectStatus(page, 'Changes requested');
    await expect(page.getByText('Please take Wednesday too')).toBeVisible();
    await expect(page.getByText(/Your approver asked for changes/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel request' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Edit and resubmit' }).click();

    await expect(page.getByRole('heading', { name: `Edit ${number} and resubmit` })).toBeVisible();
    // The form starts from what was sent.
    await expect(page.getByLabel('Last day')).toHaveValue(week.tue);
    await page.getByLabel('Last day').fill(week.wed);
    await expect(page.getByText('3 working days')).toBeVisible();
    await page.getByRole('button', { name: 'Resubmit' }).click();
    await expect(page).toHaveURL(new RegExp(`/hrm/leave/${leaveId}$`));
  });

  await test.step('resubmitted: same number, a new chain, and the first round kept as history', async () => {
    await expectStatus(page, 'Awaiting approval');
    expect(await numberOnPage(page)).toBe(number);
    // Three days now, so the director joins the chain. Two rounds, in order.
    const history = page.getByRole('list').filter({ hasText: 'Submission 1' });
    await expect(
      history.getByText('Submission 1 · Purchasing Manager — Changes requested'),
    ).toBeVisible();
    await expect(history.getByText('Submission 2 · Purchasing Manager — Pending')).toBeVisible();
    await expect(history.getByText('Submission 2 · Director — Pending')).toBeVisible();
  });

  await test.step('the manager and director approve the new chain', async () => {
    await switchUser(page, PERSONAS.manager);
    // Two rows for the manager: the first round's, already decided, and this one's.
    const managerRows = await inboxRow(page, number, 2);
    await managerRows
      .filter({ hasText: 'Pending' })
      .getByRole('button', { name: /^Approve$/ })
      .click();
    await expect(managerRows.getByText('Approved', { exact: true })).toBeVisible();

    await switchUser(page, PERSONAS.director);
    const directorRow = await inboxRow(page, number);
    await directorRow.getByRole('button', { name: /^Approve$/ }).click();
    await expect(directorRow.getByText('Approved', { exact: true })).toBeVisible();

    await switchUser(page, PERSONAS.purchasing);
    await gotoApp(page, `/hrm/leave/${leaveId}`);
    await expectStatus(page, 'Approved');
  });
});

// The 4xx answers below are the point: the browser logs each one as a console error.
test.describe('the rules', () => {
  test.use({ allowedConsoleErrors: [/status of (403|409|422)/] });

  test('the form and the server refuse what leave rules forbid', async ({ page }) => {
    test.setTimeout(240_000);
    const week = freeWeek(4);
    const year = anchorYear();

    await loginAs(page, PERSONAS.purchasing);
    await gotoApp(page, '/hrm/leave/new');

    await test.step('the form says what is wrong before anything is sent', async () => {
      await fillRequest(page, week.tue, week.mon, '');
      await expect(
        page.getByText("The last day can't be before the first day.").first(),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Submit request' }).click();
      await expect(page.getByText('Enter a reason.')).toBeVisible();

      await fillRequest(page, week.sat, week.sun, 'Weekend');
      await expect(page.getByText(/no working days/).first()).toBeVisible();

      // Leave that runs into a new year is two requests.
      await page.getByLabel('First day').fill(`${year}-12-30`);
      await page.getByLabel('Last day').fill(`${year + 1}-01-02`);
      await expect(page.getByText(/needs two requests/).first()).toBeVisible();
    });

    await test.step('annual leave beyond the allowance is refused, other kinds are not', async () => {
      // Five weeks of annual leave is more than 12 days, in any year.
      await page.getByLabel('First day').fill(week.mon);
      await page.getByLabel('Last day').fill(addDays(week.mon, 34));
      await expect(page.getByText(/Not enough annual leave/)).toBeVisible();
      await page.getByLabel('Reason').fill('Long trip');
      await page.getByRole('button', { name: 'Submit request' }).click();
      await expect(page.getByRole('alert')).toContainText("You don't have enough annual leave");

      await page.getByLabel('Type of leave').selectOption('sick');
      await expect(
        page.getByText("This type of leave doesn't use your annual allowance."),
      ).toBeVisible();
    });

    let number = '';
    await test.step('an accepted request, then one that overlaps it', async () => {
      await page.getByLabel('Type of leave').selectOption('annual');
      await fillRequest(page, week.mon, week.fri, 'Holiday');
      await page.getByRole('button', { name: 'Submit request' }).click();
      await expect(page).toHaveURL(/\/hrm\/leave\/[a-f0-9-]+$/);
      number = await numberOnPage(page);

      await gotoApp(page, '/hrm/leave/new');
      await fillRequest(page, week.fri, week.fri, 'Same day again');
      await page.getByRole('button', { name: 'Submit request' }).click();
      await expect(page.getByRole('alert')).toContainText(`These dates overlap ${number}`);
    });

    await test.step('an approver can look at everyone’s leave, and search it', async () => {
      await switchUser(page, PERSONAS.manager);
      await gotoApp(page, '/hrm/leave');
      await page.getByRole('button', { name: 'Everyone' }).click();
      await expect(page).toHaveURL(/scope=all/);
      await expect(page.getByRole('columnheader', { name: 'Employee' })).toBeVisible();
      await page.getByPlaceholder(/Search by number or employee/).fill(number);
      const row = page.getByRole('row').filter({ hasText: number });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('Nguyễn Văn An');
      // Someone else's request has a shortcut to the inbox, where it is decided.
      await row.getByRole('link', { name: number }).click();
      await expect(page.getByRole('link', { name: 'Review in approvals inbox' })).toBeVisible();
    });
  });
});
