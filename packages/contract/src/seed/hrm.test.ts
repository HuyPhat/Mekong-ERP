import { describe, expect, it } from 'vitest';
import { generateHrmData } from './hrm';
import { generateApprovalRules } from './approval-rules';
import { DEMO_USERS } from '../demo-users';
import { resolveApprovalRoles } from '../approval-engine';
import { computeLeaveBalance, countWorkingDays, findLeaveOverlap } from '../leave';

// Pinned, so the assertions don't depend on the day the tests run.
const NOW = new Date(2026, 8, 30, 12, 0, 0);
const rules = generateApprovalRules();
const data = generateHrmData(rules, NOW);
const byId = new Map(data.leaveRequests.map((request) => [request.id, request]));

function chainOf(requestId: string) {
  return data.approvals
    .filter((approval) => approval.docId === requestId)
    .sort((a, b) => a.sequence - b.sequence);
}

describe('generateHrmData: staff', () => {
  it('has 40 employees with unique ids and codes', () => {
    expect(data.employees).toHaveLength(40);
    expect(new Set(data.employees.map((e) => e.id)).size).toBe(40);
    expect(new Set(data.employees.map((e) => e.code)).size).toBe(40);
  });

  it('gives every demo login an employee record, so "my leave" always has someone behind it', () => {
    for (const user of DEMO_USERS) {
      const employee = data.employees.find((candidate) => candidate.userId === user.id);
      expect(employee, `employee for ${user.id}`).toBeDefined();
      expect(employee?.name).toBe(user.name);
    }
  });

  it('gives everyone the same illustrative allowance', () => {
    expect(new Set(data.employees.map((e) => e.annualLeaveDays))).toEqual(new Set([12]));
  });
});

describe('generateHrmData: leave requests obey the live rules', () => {
  it('produces a year of requests, numbered in submission order', () => {
    expect(data.leaveRequests.length).toBeGreaterThan(100);
    const numbers = data.leaveRequests.map((request) => request.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    const submitted = data.leaveRequests.map((request) => request.submittedAt);
    expect([...submitted].sort()).toEqual(submitted);
    expect(data.leaveRequests[0]?.number).toMatch(/^LV-\d{4}-000001$/);
  });

  it('counts whole working days, within one calendar year', () => {
    for (const request of data.leaveRequests) {
      expect(request.days).toBeGreaterThanOrEqual(1);
      expect(request.days).toBe(countWorkingDays(request.startDate, request.endDate));
      expect(request.startDate <= request.endDate).toBe(true);
      expect(request.startDate.slice(0, 4)).toBe(request.endDate.slice(0, 4));
    }
  });

  it('never double-books an employee: no overlap between pending or approved requests', () => {
    for (const request of data.leaveRequests) {
      if (request.status !== 'approved' && request.status !== 'pending_approval') continue;
      const clash = findLeaveOverlap(
        data.leaveRequests,
        request.employeeId,
        request.startDate,
        request.endDate,
        request.id,
      );
      expect(clash, `${request.number} overlaps ${clash?.number}`).toBeUndefined();
    }
  });

  it('never overdraws the annual allowance, in any year', () => {
    for (const employee of data.employees) {
      const years = new Set(
        data.leaveRequests
          .filter((request) => request.employeeId === employee.id)
          .map((request) => Number(request.startDate.slice(0, 4))),
      );
      for (const year of years) {
        const balance = computeLeaveBalance(
          data.leaveRequests,
          employee.id,
          employee.annualLeaveDays,
          year,
        );
        expect(balance.remaining, `${employee.code} ${year}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('submits every request in the past', () => {
    for (const request of data.leaveRequests) {
      expect(new Date(request.submittedAt).getTime()).toBeLessThan(NOW.getTime());
    }
  });

  it('covers every status, so every screen state has data', () => {
    const statuses = new Set(data.leaveRequests.map((request) => request.status));
    expect(statuses).toEqual(
      new Set(['pending_approval', 'approved', 'rejected', 'changes_requested', 'cancelled']),
    );
    const types = new Set(data.leaveRequests.map((request) => request.type));
    expect(types).toEqual(new Set(['annual', 'sick', 'special', 'unpaid']));
  });
});

describe('generateHrmData: approval chains', () => {
  it('resolves each chain from the rules by working days', () => {
    for (const request of data.leaveRequests) {
      const roles = chainOf(request.id).map((step) => step.approverRole);
      expect(roles).toEqual(resolveApprovalRoles(rules, 'leave_request', request.days));
    }
  });

  it('numbers steps from 1 and carries the request number', () => {
    for (const request of data.leaveRequests) {
      const chain = chainOf(request.id);
      expect(chain.map((step) => step.sequence)).toEqual(chain.map((_, i) => i + 1));
      for (const step of chain) expect(step.docNumber).toBe(request.number);
    }
  });

  it('leaves each chain in the state its request status implies', () => {
    for (const request of data.leaveRequests) {
      const statuses = chainOf(request.id).map((step) => step.status);
      switch (request.status) {
        case 'approved':
          expect(statuses.every((s) => s === 'approved')).toBe(true);
          break;
        case 'pending_approval':
          expect(statuses).toContain('pending');
          expect(statuses).not.toContain('rejected');
          expect(statuses).not.toContain('changes_requested');
          break;
        case 'rejected':
          expect(statuses.filter((s) => s === 'rejected')).toHaveLength(1);
          break;
        case 'changes_requested':
          expect(statuses.filter((s) => s === 'changes_requested')).toHaveLength(1);
          break;
        case 'cancelled':
          // Withdrawn or cancelled after approval: nothing is left waiting.
          expect(statuses).not.toContain('pending');
          break;
      }
    }
  });

  it('approves in order: a pending step never precedes a decided one', () => {
    for (const request of data.leaveRequests) {
      const statuses = chainOf(request.id).map((step) => step.status);
      const firstPending = statuses.indexOf('pending');
      if (firstPending === -1) continue;
      expect(statuses.slice(firstPending).every((s) => s === 'pending')).toBe(true);
    }
  });

  it('dates every decision after the request was submitted, and never in the future', () => {
    for (const step of data.approvals) {
      if (!step.decidedAt) continue;
      const request = byId.get(step.docId);
      expect(step.decidedAt >= (request?.submittedAt ?? '')).toBe(true);
      expect(new Date(step.decidedAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it('records a reason for every rejection and every request for changes', () => {
    for (const step of data.approvals) {
      if (step.status === 'rejected' || step.status === 'changes_requested') {
        expect(step.comment, `${step.docNumber} step ${step.sequence}`).toBeTruthy();
      }
    }
  });
});

describe('generateHrmData: audit trail', () => {
  it('starts every request with a submission entry, and ends a cancelled one with a cancellation', () => {
    for (const request of data.leaveRequests) {
      const entries = data.auditLogEntries.filter((entry) => entry.entityId === request.id);
      expect(entries.map((entry) => entry.action)).toContain('submitted');
      if (request.status === 'cancelled') {
        expect(entries.map((entry) => entry.action)).toContain('cancelled');
      }
      for (const entry of entries) {
        expect(entry.entityType).toBe('leave_request');
        expect(entry.entityNumber).toBe(request.number);
      }
    }
  });

  it("records the request's final status on its last status change", () => {
    for (const request of data.leaveRequests) {
      const last = data.auditLogEntries
        .filter((entry) => entry.entityId === request.id)
        .sort((a, b) => a.at.localeCompare(b.at))
        .at(-1);
      expect(last?.after?.['status'], request.number).toBe(request.status);
    }
  });
});

describe('generateHrmData: determinism', () => {
  it('produces identical data for the same pinned time', () => {
    expect(generateHrmData(rules, NOW)).toEqual(data);
  });
});
