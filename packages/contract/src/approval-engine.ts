import type { Approval, ApprovalDocType, ApprovalRule, ApprovalStatus } from './approval-entities';

/**
 * Each rule already lists the full, cumulative chain of roles for its amount
 * tier (e.g. the >=500M tier lists all three roles, not just the director) —
 * see ADR-0004. Resolving a chain is picking the one tier the amount falls
 * into, not merging tiers.
 */
export function resolveApprovalRoles(
  rules: ApprovalRule[],
  docType: ApprovalDocType,
  amount: number,
): string[] {
  const rule = rules.find(
    (candidate) =>
      candidate.docType === docType &&
      amount >= candidate.minAmount &&
      (candidate.maxAmount == null || amount <= candidate.maxAmount),
  );
  return rule?.approverRoles ?? [];
}

export function createApprovalChain(
  docType: ApprovalDocType,
  docId: string,
  docNumber: string,
  roles: string[],
  createId: () => string,
  now: string,
): Approval[] {
  return roles.map((approverRole, index) => ({
    id: createId(),
    docType,
    docId,
    docNumber,
    sequence: index + 1,
    approverRole,
    status: 'pending',
    createdAt: now,
  }));
}

/** The chain's next actionable step: the lowest-sequence approval still pending. */
export function currentApprovalStep(chain: Approval[]): Approval | undefined {
  return [...chain]
    .sort((a, b) => a.sequence - b.sequence)
    .find((step) => step.status === 'pending');
}

export type ChainOutcome = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export function chainOutcome(chain: Approval[]): ChainOutcome {
  if (chain.some((step) => step.status === 'rejected')) return 'rejected';
  if (chain.some((step) => step.status === 'changes_requested')) return 'changes_requested';
  if (chain.every((step) => step.status === 'approved')) return 'approved';
  return 'pending';
}

export interface DecideApprovalResult {
  chain: Approval[];
  outcome: ChainOutcome;
}

/**
 * Applies a decision to the chain's current step. A reject or
 * changes-requested decision halts the chain — every other still-pending
 * step is marked "skipped" rather than left dangling.
 */
export function decideApproval(
  chain: Approval[],
  approvalId: string,
  decision: Extract<ApprovalStatus, 'approved' | 'rejected' | 'changes_requested'>,
  decidedBy: string,
  now: string,
  comment?: string,
): DecideApprovalResult {
  const target = chain.find((step) => step.id === approvalId);
  if (!target) {
    throw new Error(`Approval step ${approvalId} not found in chain`);
  }
  const current = currentApprovalStep(chain);
  if (current?.id !== approvalId) {
    throw new Error('Only the current pending approval step can be decided');
  }

  const decided: Approval = {
    ...target,
    status: decision,
    decidedBy,
    decidedAt: now,
    ...(comment !== undefined ? { comment } : {}),
  };

  const next = chain.map((step) => (step.id === approvalId ? decided : step));
  const outcome = chainOutcome(next);

  const settled =
    outcome === 'rejected' || outcome === 'changes_requested'
      ? next.map((step) =>
          step.status === 'pending' ? { ...step, status: 'skipped' as const } : step,
        )
      : next;

  return { chain: settled, outcome };
}
