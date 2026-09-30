import { describe, expect, it } from 'vitest';
import {
  resolveApprovalRoles,
  createApprovalChain,
  currentApprovalStep,
  chainOutcome,
  decideApproval,
  latestChain,
} from './approval-engine';
import type { Approval, ApprovalRule } from './approval-entities';
import { generateApprovalRules } from './seed/approval-rules';

const RULES: ApprovalRule[] = [
  {
    id: 'r1',
    docType: 'purchase_order',
    minAmount: 0,
    maxAmount: 49_999_999,
    approverRoles: ['approver_manager'],
  },
  {
    id: 'r2',
    docType: 'purchase_order',
    minAmount: 50_000_000,
    maxAmount: 499_999_999,
    approverRoles: ['approver_manager', 'approver_finance'],
  },
  {
    id: 'r3',
    docType: 'purchase_order',
    minAmount: 500_000_000,
    maxAmount: null,
    approverRoles: ['approver_manager', 'approver_finance', 'approver_director'],
  },
];

describe('resolveApprovalRoles', () => {
  it('resolves the lowest tier for a small amount', () => {
    expect(resolveApprovalRoles(RULES, 'purchase_order', 10_000_000)).toEqual(['approver_manager']);
  });

  it('resolves the middle tier for a mid-range amount, including its boundary', () => {
    expect(resolveApprovalRoles(RULES, 'purchase_order', 50_000_000)).toEqual([
      'approver_manager',
      'approver_finance',
    ]);
    expect(resolveApprovalRoles(RULES, 'purchase_order', 499_999_999)).toEqual([
      'approver_manager',
      'approver_finance',
    ]);
  });

  it('resolves the top tier for a large amount with no upper bound', () => {
    expect(resolveApprovalRoles(RULES, 'purchase_order', 500_000_000)).toEqual([
      'approver_manager',
      'approver_finance',
      'approver_director',
    ]);
    expect(resolveApprovalRoles(RULES, 'purchase_order', 10_000_000_000)).toEqual([
      'approver_manager',
      'approver_finance',
      'approver_director',
    ]);
  });

  it('returns an empty array when no rule covers the amount', () => {
    expect(resolveApprovalRoles(RULES, 'purchase_order', -1)).toEqual([]);
  });
});

describe('createApprovalChain', () => {
  it('materializes one pending step per role, in sequence order', () => {
    let counter = 0;
    const chain = createApprovalChain(
      'purchase_order',
      'po-1',
      'PO-2026-000001',
      ['approver_manager', 'approver_finance'],
      () => `id-${++counter}`,
      '2026-01-01T00:00:00.000Z',
    );

    expect(chain).toEqual([
      {
        id: 'id-1',
        docType: 'purchase_order',
        docId: 'po-1',
        docNumber: 'PO-2026-000001',
        sequence: 1,
        approverRole: 'approver_manager',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'id-2',
        docType: 'purchase_order',
        docId: 'po-1',
        docNumber: 'PO-2026-000001',
        sequence: 2,
        approverRole: 'approver_finance',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('returns an empty chain for no roles', () => {
    expect(createApprovalChain('purchase_order', 'po-1', 'PO-1', [], () => 'x', 'now')).toEqual([]);
  });
});

function approval(overrides: Partial<Approval>): Approval {
  return {
    id: 'a1',
    docType: 'purchase_order',
    docId: 'po-1',
    docNumber: 'PO-2026-000001',
    sequence: 1,
    approverRole: 'approver_manager',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('currentApprovalStep', () => {
  it('returns the lowest-sequence pending step regardless of input order', () => {
    const chain = [
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
      approval({ id: 'a1', sequence: 1, status: 'approved' }),
      approval({ id: 'a3', sequence: 3, status: 'pending' }),
    ];
    expect(currentApprovalStep(chain)?.id).toBe('a2');
  });

  it('returns undefined when every step has been decided', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'approved' }),
      approval({ id: 'a2', sequence: 2, status: 'approved' }),
    ];
    expect(currentApprovalStep(chain)).toBeUndefined();
  });
});

describe('chainOutcome', () => {
  it('is "approved" once every step is approved', () => {
    const chain = [approval({ status: 'approved' }), approval({ status: 'approved' })];
    expect(chainOutcome(chain)).toBe('approved');
  });

  it('is "rejected" if any step was rejected, even with others still pending', () => {
    const chain = [approval({ status: 'rejected' }), approval({ status: 'pending' })];
    expect(chainOutcome(chain)).toBe('rejected');
  });

  it('is "changes_requested" if any step requested changes and none were rejected', () => {
    const chain = [approval({ status: 'changes_requested' }), approval({ status: 'pending' })];
    expect(chainOutcome(chain)).toBe('changes_requested');
  });

  it('is "pending" while any step is still undecided and nothing failed', () => {
    const chain = [approval({ status: 'approved' }), approval({ status: 'pending' })];
    expect(chainOutcome(chain)).toBe('pending');
  });
});

describe('decideApproval', () => {
  it('approving a non-final step keeps the chain pending overall', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'pending' }),
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
    ];
    const result = decideApproval(chain, 'a1', 'approved', 'user-1', '2026-01-02T00:00:00.000Z');

    expect(result.outcome).toBe('pending');
    expect(result.chain.find((step) => step.id === 'a1')).toMatchObject({
      status: 'approved',
      decidedBy: 'user-1',
      decidedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(result.chain.find((step) => step.id === 'a2')?.status).toBe('pending');
  });

  it('approving the final step resolves the chain as approved', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'approved' }),
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
    ];
    const result = decideApproval(chain, 'a2', 'approved', 'user-2', '2026-01-03T00:00:00.000Z');
    expect(result.outcome).toBe('approved');
  });

  it('rejecting the current step halts the chain and skips the remaining steps', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'pending' }),
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
      approval({ id: 'a3', sequence: 3, status: 'pending' }),
    ];
    const result = decideApproval(
      chain,
      'a1',
      'rejected',
      'user-1',
      '2026-01-02T00:00:00.000Z',
      'Price too high',
    );

    expect(result.outcome).toBe('rejected');
    expect(result.chain.find((step) => step.id === 'a1')).toMatchObject({
      status: 'rejected',
      comment: 'Price too high',
    });
    expect(result.chain.find((step) => step.id === 'a2')?.status).toBe('skipped');
    expect(result.chain.find((step) => step.id === 'a3')?.status).toBe('skipped');
  });

  it('a changes-requested decision also skips the remaining steps', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'pending' }),
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
    ];
    const result = decideApproval(
      chain,
      'a1',
      'changes_requested',
      'user-1',
      '2026-01-02T00:00:00.000Z',
    );
    expect(result.outcome).toBe('changes_requested');
    expect(result.chain.find((step) => step.id === 'a2')?.status).toBe('skipped');
  });

  it('throws when the approval id is not part of the chain', () => {
    const chain = [approval({ id: 'a1' })];
    expect(() => decideApproval(chain, 'missing', 'approved', 'user-1', 'now')).toThrow();
  });

  it('throws when deciding a step that is not the current pending one', () => {
    const chain = [
      approval({ id: 'a1', sequence: 1, status: 'pending' }),
      approval({ id: 'a2', sequence: 2, status: 'pending' }),
    ];
    expect(() => decideApproval(chain, 'a2', 'approved', 'user-1', 'now')).toThrow();
  });
});

describe('resolveApprovalRoles for leave requests (keyed on working days)', () => {
  const rules = generateApprovalRules();

  it('sends one or two days to the manager alone', () => {
    expect(resolveApprovalRoles(rules, 'leave_request', 1)).toEqual(['approver_manager']);
    expect(resolveApprovalRoles(rules, 'leave_request', 2)).toEqual(['approver_manager']);
  });

  it('adds the director from three days, with no upper bound', () => {
    expect(resolveApprovalRoles(rules, 'leave_request', 3)).toEqual([
      'approver_manager',
      'approver_director',
    ]);
    expect(resolveApprovalRoles(rules, 'leave_request', 12)).toEqual([
      'approver_manager',
      'approver_director',
    ]);
  });

  it("never applies a purchase order's VND tiers to leave, or the reverse", () => {
    // 60 days must not land in the 50M-VND purchase-order tier (which adds finance).
    expect(resolveApprovalRoles(rules, 'leave_request', 60)).toEqual([
      'approver_manager',
      'approver_director',
    ]);
    // And 60M VND is a purchase order: it gets the finance tier, not the leave chain.
    expect(resolveApprovalRoles(rules, 'purchase_order', 60_000_000)).toEqual([
      'approver_manager',
      'approver_finance',
    ]);
  });

  it('runs a leave chain through the engine like any other document', () => {
    const roles = resolveApprovalRoles(rules, 'leave_request', 4);
    let n = 0;
    const chain = createApprovalChain(
      'leave_request',
      'leave-1',
      'LV-2026-000001',
      roles,
      () => `step-${(n += 1)}`,
      '2026-03-01T00:00:00.000Z',
    );
    const afterManager = decideApproval(
      chain,
      'step-1',
      'approved',
      'approver_manager',
      '2026-03-02T00:00:00.000Z',
    );
    expect(afterManager.outcome).toBe('pending');
    expect(currentApprovalStep(afterManager.chain)?.approverRole).toBe('approver_director');
    const afterDirector = decideApproval(
      afterManager.chain,
      'step-2',
      'approved',
      'approver_director',
      '2026-03-03T00:00:00.000Z',
    );
    expect(afterDirector.outcome).toBe('approved');
  });
});

describe('latestChain: a resubmitted document', () => {
  const at = (day: number) => `2026-03-0${day}T09:00:00.000Z`;
  const step = (
    id: string,
    sequence: number,
    status: Approval['status'],
    createdAt: string,
  ): Approval => ({
    id,
    docType: 'leave_request',
    docId: 'leave-1',
    docNumber: 'LV-2026-000001',
    sequence,
    approverRole: sequence === 1 ? 'approver_manager' : 'approver_director',
    status,
    createdAt,
  });
  const history = [
    step('old-1', 1, 'changes_requested', at(1)),
    step('old-2', 2, 'skipped', at(1)),
    step('new-1', 1, 'pending', at(3)),
    step('new-2', 2, 'pending', at(3)),
  ];

  it('is the steps of the newest submission, in any order', () => {
    expect(latestChain(history).map((s) => s.id)).toEqual(['new-1', 'new-2']);
    expect(latestChain([...history].reverse()).map((s) => s.id)).toEqual(['new-2', 'new-1']);
    expect(latestChain([])).toEqual([]);
  });

  it('keeps a first submission whole', () => {
    expect(latestChain(history.slice(0, 2)).map((s) => s.id)).toEqual(['old-1', 'old-2']);
  });

  it('is what stops an old "changes requested" step deciding the new submission', () => {
    // Deciding against the whole history: the stale step wins and the new chain is halted.
    const wrong = decideApproval(history, 'new-1', 'approved', 'approver_manager', at(4));
    expect(wrong.outcome).toBe('changes_requested');
    // Deciding against the newest chain: the manager's approval simply moves it on.
    const right = decideApproval(
      latestChain(history),
      'new-1',
      'approved',
      'approver_manager',
      at(4),
    );
    expect(right.outcome).toBe('pending');
    expect(currentApprovalStep(right.chain)?.id).toBe('new-2');
  });
});
