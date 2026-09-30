import type { Page } from '@playwright/test';
import { api } from './api';
import { addDays, anchorYear, freeWeek } from './dates';
import { test, expect, loginAs, PERSONAS } from './fixtures';

// Drives the leave endpoints from inside the page, the way the screens do, so the
// real MSW handlers, IndexedDB persistence and Zod-validated client are all in the
// loop. Kept as one flow: each step builds on the last one's data. Dates are worked
// out from today (see dates.ts) and balances are asserted as changes from the balance
// found at the start, so the flow doesn't depend on what the seed happened to book.

interface Failure {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
interface Leave {
  id: string;
  number: string;
  status: string;
  days: number;
  employeeName: string;
}
interface Step {
  id: string;
  sequence: number;
  approverRole: string;
  status: string;
  docType: string;
  subject: string;
  amount: number;
  unit: string;
}
interface Balance {
  employeeId: string;
  year: number;
  allowance: number;
  used: number;
  pending: number;
  remaining: number;
}
interface List<T> {
  data: T[];
}

const EMPLOYEE = 'emp-purchasing';
const YEAR = anchorYear();
// Five working days: the manager, then the director, decide.
const week = freeWeek(0);
const base = { employeeId: EMPLOYEE, type: 'annual', reason: 'Family trip' };
const balanceOf = (page: Page) =>
  api<Balance>(page, 'GET', `/leave-balances?employeeId=${EMPLOYEE}&year=${YEAR}`);

// The 4xx answers below are the point: the browser logs each one as a console error.
test.use({ allowedConsoleErrors: [/status of (403|404|409|422)/] });

test('leave requests: validation, balance, approval chain, revision and cancellation', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginAs(page, PERSONAS.purchasing);

  let start: Balance;
  await test.step('the demo login has an employee record and an allowance', async () => {
    const found = await api<List<{ id: string }>>(
      page,
      'GET',
      '/employees?filter[userId]=purchasing',
    );
    expect(found.json.data[0]?.id).toBe(EMPLOYEE);
    start = (await balanceOf(page)).json;
    expect(start).toMatchObject({ employeeId: EMPLOYEE, year: YEAR, allowance: 12 });
    expect(start.remaining).toBe(start.allowance - start.used - start.pending);
  });

  await test.step('rejects requests that break the rules, naming the field', async () => {
    const submit = (input: Record<string, unknown>) =>
      api<Failure>(page, 'POST', '/leave-requests', { ...base, ...input });

    const backwards = await submit({ startDate: week.fri, endDate: week.mon });
    expect(backwards.status).toBe(422);
    expect(backwards.json.fieldErrors?.['endDate']).toBeDefined();

    // Saturday and Sunday only.
    const weekend = await submit({ startDate: week.sat, endDate: week.sun });
    expect(weekend.status).toBe(422);
    expect(weekend.json.fieldErrors?.['startDate']?.[0]).toMatch(/no working days/);

    const twoYears = await submit({ startDate: `${YEAR}-12-30`, endDate: `${YEAR + 1}-01-03` });
    expect(twoYears.status).toBe(422);
    expect(twoYears.json.fieldErrors?.['endDate']?.[0]).toMatch(/two years/);

    // There is no 30 February in any year.
    const notADate = await submit({ startDate: `${YEAR}-02-30`, endDate: week.mon });
    expect(notADate.status).toBe(422);
    expect(notADate.json.fieldErrors?.['startDate']).toBeDefined();

    const noReason = await submit({ reason: '   ', startDate: week.mon, endDate: week.mon });
    expect(noReason.status).toBe(422);
    expect(noReason.json.fieldErrors?.['reason']).toBeDefined();

    const stranger = await submit({
      employeeId: 'emp-nobody',
      startDate: week.mon,
      endDate: week.mon,
    });
    expect(stranger.status).toBe(404);
  });

  const created =
    await test.step('submits a request: working days counted, chain resolved', async () => {
      const result = await api<Leave>(page, 'POST', '/leave-requests', {
        ...base,
        startDate: week.mon,
        endDate: week.fri,
      });
      expect(result.status).toBe(201);
      expect(result.json).toMatchObject({
        status: 'pending_approval',
        days: 5,
        employeeName: 'Nguyễn Văn An',
      });
      expect(result.json.number).toMatch(/^LV-\d{4}-\d{6}$/);

      const steps = await api<List<Step>>(
        page,
        'GET',
        `/approvals?filter[docId]=${result.json.id}`,
      );
      expect(steps.json.data.map((step) => step.approverRole)).toEqual([
        'approver_manager',
        'approver_director',
      ]);
      // The inbox view carries what to show: who, how much, in what unit.
      expect(steps.json.data[0]).toMatchObject({
        docType: 'leave_request',
        subject: 'Nguyễn Văn An',
        amount: 5,
        unit: 'days',
        status: 'pending',
      });
      return result.json;
    });

  await test.step('holds the pending days against the balance', async () => {
    expect((await balanceOf(page)).json).toMatchObject({
      used: start.used,
      pending: start.pending + 5,
      remaining: start.remaining - 5,
    });
  });

  await test.step('refuses overlapping leave and an overdrawn allowance', async () => {
    // From Thursday of the same week to the Monday after.
    const overlap = await api<Failure>(page, 'POST', '/leave-requests', {
      ...base,
      startDate: week.thu,
      endDate: addDays(week.fri, 3),
    });
    expect(overlap.status).toBe(409);
    expect(overlap.json.code).toBe('LEAVE_OVERLAP');
    expect(overlap.json.message).toContain(created.number);

    // Three weeks is more working days than the allowance, whatever is left of it.
    const later = freeWeek(4);
    const threeWeeks = { startDate: later.mon, endDate: addDays(later.mon, 18) };
    const overdrawn = await api<Failure>(page, 'POST', '/leave-requests', {
      ...base,
      ...threeWeeks,
    });
    expect(overdrawn.status).toBe(422);
    expect(overdrawn.json.code).toBe('INSUFFICIENT_BALANCE');

    // Sick leave doesn't draw on the annual allowance, however long.
    const sick = await api<Leave>(page, 'POST', '/leave-requests', {
      ...base,
      type: 'sick',
      ...threeWeeks,
    });
    expect(sick.status).toBe(201);
    expect((await balanceOf(page)).json.remaining).toBe(start.remaining - 5);
  });

  await test.step('a manager sending it back releases the balance', async () => {
    const steps = await api<List<Step>>(page, 'GET', `/approvals?filter[docId]=${created.id}`);
    const first = steps.json.data.find((step) => step.sequence === 1);
    const sentBack = await api<{ outcome: string }>(
      page,
      'POST',
      `/approvals/${first?.id ?? ''}/decide`,
      {
        decision: 'changes_requested',
        actorId: 'approver_manager',
        comment: 'Please move it a day later.',
      },
    );
    expect(sentBack.json.outcome).toBe('changes_requested');

    const leave = await api<Leave>(page, 'GET', `/leave-requests/${created.id}`);
    expect(leave.json.status).toBe('changes_requested');
    expect((await balanceOf(page)).json).toMatchObject({
      pending: start.pending,
      remaining: start.remaining,
    });
  });

  await test.step('only a sent-back request can be revised, and once', async () => {
    const revision = { ...base, startDate: week.tue, endDate: week.thu };
    const revised = await api<Leave>(page, 'PUT', `/leave-requests/${created.id}`, revision);
    expect(revised.status).toBe(200);
    expect(revised.json).toMatchObject({ status: 'pending_approval', days: 3 });
    // Same document, same number.
    expect(revised.json.number).toBe(created.number);

    const again = await api<Failure>(page, 'PUT', `/leave-requests/${created.id}`, revision);
    expect(again.status).toBe(409);
    expect(again.json.code).toBe('INVALID_STATUS');
  });

  await test.step('a resubmitted request is decided on its new chain, not its history', async () => {
    const all = await api<List<Step>>(page, 'GET', `/approvals?filter[docId]=${created.id}`);
    expect(all.json.data).toHaveLength(4); // 2 old steps kept as history + 2 new
    const fresh = all.json.data
      .filter((step) => step.status === 'pending')
      .sort((a, b) => a.sequence - b.sequence);
    expect(fresh).toHaveLength(2);

    // Regression guard: the old "changes requested" step used to decide the outcome of
    // the resubmission, halting it the moment the manager approved.
    const manager = await api<{ outcome: string }>(
      page,
      'POST',
      `/approvals/${fresh[0]?.id ?? ''}/decide`,
      { decision: 'approved', actorId: 'approver_manager' },
    );
    expect(manager.json.outcome).toBe('pending');
    const director = await api<{ outcome: string }>(
      page,
      'POST',
      `/approvals/${fresh[1]?.id ?? ''}/decide`,
      { decision: 'approved', actorId: 'approver_director' },
    );
    expect(director.json.outcome).toBe('approved');

    const leave = await api<Leave>(page, 'GET', `/leave-requests/${created.id}`);
    expect(leave.json.status).toBe('approved');
    expect((await balanceOf(page)).json).toMatchObject({
      used: start.used + 3,
      pending: start.pending,
      remaining: start.remaining - 3,
    });
  });

  await test.step('cancelling approved future leave returns the days', async () => {
    const cancelled = await api<Leave>(page, 'POST', `/leave-requests/${created.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.json.status).toBe('cancelled');
    expect((await balanceOf(page)).json.remaining).toBe(start.remaining);

    const twice = await api<Failure>(page, 'POST', `/leave-requests/${created.id}/cancel`);
    expect(twice.status).toBe(409);
  });

  await test.step('nobody decides their own request, but someone else can', async () => {
    // The manager login is an employee too. One working day, so the manager alone decides.
    const own = await api<Leave>(page, 'POST', '/leave-requests', {
      ...base,
      employeeId: 'emp-approver_manager',
      startDate: freeWeek(2).tue,
      endDate: freeWeek(2).tue,
    });
    expect(own.status).toBe(201);
    const steps = await api<List<Step>>(page, 'GET', `/approvals?filter[docId]=${own.json.id}`);
    const only = steps.json.data[0];
    expect(steps.json.data).toHaveLength(1);
    expect(only?.approverRole).toBe('approver_manager');

    const decide = (actorId: string) =>
      api<Failure & { outcome: string }>(page, 'POST', `/approvals/${only?.id ?? ''}/decide`, {
        decision: 'approved',
        actorId,
      });
    const refused = await decide('approver_manager');
    expect(refused.status).toBe(403);
    expect(refused.json.code).toBe('SELF_DECISION');
    // The refusal changed nothing.
    const waiting = await api<Leave>(page, 'GET', `/leave-requests/${own.json.id}`);
    expect(waiting.json.status).toBe('pending_approval');

    const allowed = await decide('admin');
    expect(allowed.status).toBe(200);
    expect(allowed.json.outcome).toBe('approved');
  });

  await test.step('every change is in the audit log, in order', async () => {
    const audit = await api<List<{ action: string; entityType: string }>>(
      page,
      'GET',
      `/audit-log?filter[entityId]=${created.id}&sort=at:asc&pageSize=50`,
    );
    expect(audit.json.data.map((entry) => entry.action)).toEqual([
      'submitted',
      'approval_changes_requested',
      'resubmitted',
      'approval_approved',
      'approval_approved',
      'cancelled',
    ]);
    expect(audit.json.data.every((entry) => entry.entityType === 'leave_request')).toBe(true);
  });
});
