import { describe, expect, it } from 'vitest';
import { ApiError, DEMO_USERS, type ApprovalView, type User } from '@mekong-erp/contract';
import {
  canDecide,
  classifyDecisionError,
  decidableSteps,
  isQueued,
  summarizeBulk,
} from './decisions';

function user(id: string): User {
  const found = DEMO_USERS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No demo user ${id}`);
  return found;
}

function step(overrides: Partial<ApprovalView> = {}): ApprovalView {
  return {
    id: 'step-1',
    docType: 'purchase_order',
    docId: 'po-1',
    docNumber: 'PO-2026-000001',
    sequence: 1,
    approverRole: 'approver_manager',
    status: 'pending',
    createdAt: '2026-03-01T09:00:00.000Z',
    subject: 'Supplier',
    amount: 1_000_000,
    unit: 'vnd',
    actionable: true,
    ...overrides,
  };
}

describe('canDecide', () => {
  it('lets a manager decide a pending purchase order or leave request', () => {
    expect(canDecide(user('approver_manager'), step())).toBe(true);
    expect(canDecide(user('approver_manager'), step({ docType: 'leave_request' }))).toBe(true);
  });

  it('is only for a step that is still waiting', () => {
    for (const status of ['approved', 'rejected', 'changes_requested', 'skipped'] as const) {
      expect(canDecide(user('approver_manager'), step({ status }))).toBe(false);
    }
  });

  it('follows the permission for the kind of document', () => {
    // Finance approves purchase orders but takes no part in leave.
    expect(canDecide(user('approver_finance'), step())).toBe(true);
    expect(canDecide(user('approver_finance'), step({ docType: 'leave_request' }))).toBe(false);
  });

  it('is for admin whatever the document, and for nobody who is not signed in', () => {
    expect(canDecide(user('admin'), step({ docType: 'leave_request' }))).toBe(true);
    expect(canDecide(null, step())).toBe(false);
    expect(canDecide(undefined, step())).toBe(false);
  });

  it('is not for a login without any approval permission', () => {
    expect(canDecide(user('warehouse'), step())).toBe(false);
  });
});

describe('a step queued behind an earlier approver', () => {
  const queued = step({ actionable: false });

  it('cannot be decided yet, even by someone holding the permission', () => {
    expect(canDecide(user('approver_manager'), queued)).toBe(false);
    expect(canDecide(user('admin'), queued)).toBe(false);
  });

  it('is reported as queued for a login that could decide it, and for nobody else', () => {
    expect(isQueued(user('approver_manager'), queued)).toBe(true);
    expect(isQueued(user('warehouse'), queued)).toBe(false);
    expect(isQueued(user('approver_manager'), step())).toBe(false);
    expect(
      isQueued(user('approver_manager'), step({ status: 'approved', actionable: false })),
    ).toBe(false);
  });
});

describe('decidableSteps', () => {
  it('keeps the steps the login can decide', () => {
    const steps = [
      step({ id: 'a' }),
      step({ id: 'b', status: 'approved' }),
      step({ id: 'c', docType: 'leave_request' }),
    ];
    expect(decidableSteps(user('approver_finance'), steps).map((s) => s.id)).toEqual(['a']);
    expect(decidableSteps(user('approver_manager'), steps).map((s) => s.id)).toEqual(['a', 'c']);
  });
});

describe('summarizeBulk', () => {
  it('counts what went through and what did not', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: new Error('x') },
      { status: 'fulfilled', value: 2 },
    ];
    expect(summarizeBulk(results)).toEqual({ succeeded: 2, failed: 1 });
    expect(summarizeBulk([])).toEqual({ succeeded: 0, failed: 0 });
  });
});

describe('classifyDecisionError', () => {
  it('tells a refused self-decision from a step that is not yet up', () => {
    expect(classifyDecisionError(new ApiError(403, { code: 'SELF_DECISION', message: 'no' }))).toBe(
      'own-request',
    );
    expect(classifyDecisionError(new ApiError(409, { code: 'INVALID_STEP', message: 'no' }))).toBe(
      'not-your-turn',
    );
  });

  it('is "other" for everything else', () => {
    expect(classifyDecisionError(new ApiError(500, { code: 'BOOM', message: 'no' }))).toBe('other');
    expect(classifyDecisionError(new Error('network'))).toBe('other');
    expect(classifyDecisionError('nope')).toBe('other');
  });
});
