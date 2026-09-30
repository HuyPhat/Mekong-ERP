import { http, HttpResponse } from 'msw';
import { z } from '../../zod';
import {
  approvalsStore,
  approvalRulesStore,
  employeesStore,
  leaveRequestsStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';
import {
  createApprovalChain,
  currentApprovalStep,
  latestChain,
  resolveApprovalRoles,
} from '../../approval-engine';
import {
  CreateLeaveRequestSchema,
  type CreateLeaveRequestInput,
  type Employee,
  type LeaveRequest,
  type LeaveRequestView,
} from '../../hrm-entities';
import { generateDocumentNumber } from '../../document-number';
import {
  computeLeaveBalance,
  countWorkingDays,
  drawsOnAllowance,
  findLeaveOverlap,
} from '../../leave';
import { writeAudit } from './audit';
import { broadcastEvent } from '../ws';

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function nextNumber(existingNumbers: string[]): string {
  return generateDocumentNumber('LV', new Date().getFullYear(), existingNumbers.length + 1);
}

function toView(request: LeaveRequest): LeaveRequestView {
  const employee = employeesStore.get(request.employeeId);
  return {
    ...request,
    employeeName: employee?.name ?? '',
    employeeCode: employee?.code ?? '',
    department: employee?.department ?? 'management',
  };
}

/** Audit entries name a person by their login where they have one. */
function actorOf(employee: Employee): string {
  return employee.userId ?? employee.id;
}

function fieldError(field: string, message: string) {
  return HttpResponse.json(
    {
      code: 'VALIDATION_ERROR',
      message: 'Invalid leave request',
      fieldErrors: { [field]: [message] },
    },
    { status: 422 },
  );
}

type Checked = { error: Response } | { employee: Employee; days: number; roles: string[] };

/**
 * The checks shared by creating a request and revising one that was sent back:
 * real dates in one year with at least one working day, no clash with the
 * employee's other active leave, annual leave within the allowance, and an
 * approval rule that covers the length. `ignoreId` leaves the request being
 * revised out of the clash and balance checks.
 */
function check(input: CreateLeaveRequestInput, ignoreId?: string): Checked {
  const employee = employeesStore.get(input.employeeId);
  if (!employee) {
    return {
      error: HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Employee not found' },
        { status: 404 },
      ),
    };
  }
  if (input.endDate < input.startDate) {
    return { error: fieldError('endDate', 'The end date must be on or after the start date.') };
  }
  if (input.startDate.slice(0, 4) !== input.endDate.slice(0, 4)) {
    return { error: fieldError('endDate', 'Split leave that spans two years into two requests.') };
  }
  const days = countWorkingDays(input.startDate, input.endDate);
  if (days === 0) {
    return { error: fieldError('startDate', 'These dates contain no working days.') };
  }

  const all = leaveRequestsStore.list();
  const clash = findLeaveOverlap(all, employee.id, input.startDate, input.endDate, ignoreId);
  if (clash) {
    return {
      error: HttpResponse.json(
        {
          code: 'LEAVE_OVERLAP',
          message: `These dates overlap ${clash.number} (${clash.startDate} to ${clash.endDate}).`,
        },
        { status: 409 },
      ),
    };
  }

  if (drawsOnAllowance(input.type)) {
    const year = Number(input.startDate.slice(0, 4));
    const balance = computeLeaveBalance(all, employee.id, employee.annualLeaveDays, year, ignoreId);
    if (days > balance.remaining) {
      return {
        error: HttpResponse.json(
          {
            code: 'INSUFFICIENT_BALANCE',
            message: `Only ${Math.max(0, balance.remaining)} annual leave day(s) remain for ${year}; this request needs ${days}.`,
          },
          { status: 422 },
        ),
      };
    }
  }

  const roles = resolveApprovalRoles(approvalRulesStore.list(), 'leave_request', days);
  if (roles.length === 0) {
    return {
      error: HttpResponse.json(
        { code: 'NO_APPROVAL_RULE', message: 'No approval rule matches this length of leave' },
        { status: 422 },
      ),
    };
  }
  return { employee, days, roles };
}

function invalidBody(error: z.ZodError) {
  return HttpResponse.json(
    {
      code: 'VALIDATION_ERROR',
      message: 'Invalid leave request',
      fieldErrors: z.flattenError(error).fieldErrors,
    },
    { status: 422 },
  );
}

async function startChain(leave: LeaveRequest, roles: string[], now: string): Promise<void> {
  const chain = createApprovalChain(
    'leave_request',
    leave.id,
    leave.number,
    roles,
    () => crypto.randomUUID(),
    now,
  );
  await approvalsStore.putMany(chain);
  const firstStep = currentApprovalStep(chain);
  if (firstStep) {
    broadcastEvent({
      type: 'approval.requested',
      docType: 'leave_request',
      docId: leave.id,
      docNumber: leave.number,
      approverRole: firstStep.approverRole,
    });
  }
}

export const hrmHandlers = [
  http.get('/api/employees', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [{ field: 'code', direction: 'asc' }]);
    const userId = url.searchParams.get('filter[userId]');
    const departments =
      url.searchParams.get('filter[department]')?.split(',').filter(Boolean) ?? [];

    let items = employeesStore.list();
    if (userId) items = items.filter((employee) => employee.userId === userId);
    if (departments.length > 0) {
      items = items.filter((employee) => departments.includes(employee.department));
    }
    items = items.filter((employee) => matchesSearch(employee, q, ['name', 'code', 'jobTitle']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/employees/:id', async ({ params }) => {
    await ensureSeeded();
    const employee = employeesStore.get(String(params.id));
    if (!employee) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Employee not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(employee);
  }),

  http.get('/api/leave-requests', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'submittedAt', direction: 'desc' },
    ]);
    const employeeId = url.searchParams.get('filter[employeeId]');
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const types = url.searchParams.get('filter[type]')?.split(',').filter(Boolean) ?? [];
    const departments =
      url.searchParams.get('filter[department]')?.split(',').filter(Boolean) ?? [];
    // Leave that overlaps the window, not just leave that starts inside it.
    const from = url.searchParams.get('filter[from]');
    const to = url.searchParams.get('filter[to]');

    let items = leaveRequestsStore.list().map(toView);
    if (employeeId) items = items.filter((leave) => leave.employeeId === employeeId);
    if (statuses.length > 0) items = items.filter((leave) => statuses.includes(leave.status));
    if (types.length > 0) items = items.filter((leave) => types.includes(leave.type));
    if (departments.length > 0) {
      items = items.filter((leave) => departments.includes(leave.department));
    }
    if (from) items = items.filter((leave) => leave.endDate >= from);
    if (to) items = items.filter((leave) => leave.startDate <= to);
    items = items.filter((leave) =>
      matchesSearch(leave, q, ['number', 'employeeName', 'employeeCode']),
    );
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/leave-requests/:id', async ({ params }) => {
    await ensureSeeded();
    const leave = leaveRequestsStore.get(String(params.id));
    if (!leave) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Leave request not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(toView(leave));
  }),

  // Creating a request submits it: there is no draft.
  http.post('/api/leave-requests', async ({ request }) => {
    await ensureSeeded();
    const parsed = CreateLeaveRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidBody(parsed.error);

    const checked = check(parsed.data);
    if ('error' in checked) return checked.error;

    const now = new Date().toISOString();
    const leave: LeaveRequest = {
      id: crypto.randomUUID(),
      number: nextNumber(leaveRequestsStore.list().map((existing) => existing.number)),
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      days: checked.days,
      reason: parsed.data.reason,
      status: 'pending_approval',
      createdAt: now,
      submittedAt: now,
    };
    await leaveRequestsStore.put(leave);
    await startChain(leave, checked.roles, now);
    await writeAudit(
      'leave_request',
      leave.id,
      leave.number,
      'submitted',
      actorOf(checked.employee),
      undefined,
      'pending_approval',
      now,
    );
    return HttpResponse.json(toView(leave), { status: 201 });
  }),

  // Revise a request that was sent back, and resubmit it with a fresh chain.
  http.put('/api/leave-requests/:id', async ({ params, request }) => {
    await ensureSeeded();
    const existing = leaveRequestsStore.get(String(params.id));
    if (!existing) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Leave request not found' },
        { status: 404 },
      );
    }
    if (existing.status !== 'changes_requested') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'Only a request that was sent back for changes can be revised',
        },
        { status: 409 },
      );
    }
    const parsed = CreateLeaveRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidBody(parsed.error);

    // Whose request it is doesn't change.
    const input = { ...parsed.data, employeeId: existing.employeeId };
    const checked = check(input, existing.id);
    if ('error' in checked) return checked.error;

    const now = new Date().toISOString();
    const revised: LeaveRequest = {
      ...existing,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days: checked.days,
      reason: input.reason,
      status: 'pending_approval',
      submittedAt: now,
    };
    await leaveRequestsStore.put(revised);
    await startChain(revised, checked.roles, now);
    await writeAudit(
      'leave_request',
      revised.id,
      revised.number,
      'resubmitted',
      actorOf(checked.employee),
      existing.status,
      'pending_approval',
      now,
    );
    return HttpResponse.json(toView(revised));
  }),

  http.post('/api/leave-requests/:id/cancel', async ({ params }) => {
    await ensureSeeded();
    const leave = leaveRequestsStore.get(String(params.id));
    if (!leave) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Leave request not found' },
        { status: 404 },
      );
    }
    if (leave.status !== 'pending_approval' && leave.status !== 'approved') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'Only a pending or approved request can be cancelled',
        },
        { status: 409 },
      );
    }
    if (leave.endDate < today()) {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Leave that has already ended cannot be cancelled' },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    // Withdrawing while it waits: nothing is left for the remaining approvers to do.
    const steps = latestChain(approvalsStore.list().filter((step) => step.docId === leave.id));
    await approvalsStore.putMany(
      steps.map((step) =>
        step.status === 'pending' ? { ...step, status: 'skipped' as const } : step,
      ),
    );
    const cancelled: LeaveRequest = { ...leave, status: 'cancelled' };
    await leaveRequestsStore.put(cancelled);
    const employee = employeesStore.get(leave.employeeId);
    await writeAudit(
      'leave_request',
      leave.id,
      leave.number,
      'cancelled',
      employee ? actorOf(employee) : leave.employeeId,
      leave.status,
      'cancelled',
      now,
    );
    return HttpResponse.json(toView(cancelled));
  }),

  http.get('/api/leave-balances', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const employee = employeesStore.get(url.searchParams.get('employeeId') ?? '');
    if (!employee) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Employee not found' },
        { status: 404 },
      );
    }
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    return HttpResponse.json(
      computeLeaveBalance(leaveRequestsStore.list(), employee.id, employee.annualLeaveDays, year),
    );
  }),
];
