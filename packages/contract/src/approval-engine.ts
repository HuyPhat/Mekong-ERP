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

/**
 * A document resubmitted after changes were requested gets a fresh chain; the
 * old steps stay in the store as history. Every step of one submission shares a
 * timestamp, so the current chain is the steps carrying the newest one. Deciding
 * against the whole history instead would let an old "changes requested" step
 * decide the outcome of the new submission.
 */
export function latestChain(steps: Approval[]): Approval[] {
  let newest = '';
  for (const step of steps) if (step.createdAt > newest) newest = step.createdAt;
  return steps.filter((step) => step.createdAt === newest);
}

export interface ApprovalHistoryEntry {
  step: Approval;
  /** Which submission the step belongs to, counting from 1. */
  round: number;
  /** How many submissions the document has had, so a client can skip the label for one. */
  rounds: number;
}

/**
 * A document's approval steps as a history: oldest submission first, each round kept
 * together in chain order. Ordering by the step's place in the chain alone would
 * interleave the rounds of a document that was sent back and resubmitted.
 */
export function approvalHistory(steps: Approval[]): ApprovalHistoryEntry[] {
  const ordered = [...steps].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.sequence - b.sequence,
  );
  const submissions = [...new Set(ordered.map((step) => step.createdAt))];
  return ordered.map((step) => ({
    step,
    round: submissions.indexOf(step.createdAt) + 1,
    rounds: submissions.length,
  }));
}

/** The chain's next actionable step: the lowest-sequence approval still pending. */
export function currentApprovalStep(chain: Approval[]): Approval | undefined {
  return [...chain]
    .sort((a, b) => a.sequence - b.sequence)
    .find((step) => step.status === 'pending');
}

/**
 * The ids of the steps someone can decide now: for each document, the next pending step of
 * its newest chain. A step behind it (the director's, while the manager has not decided)
 * is pending but not yet up, and a step from an earlier submission is history.
 */
export function actionableStepIds(steps: Approval[]): Set<string> {
  const byDocument = new Map<string, Approval[]>();
  for (const step of steps) {
    const group = byDocument.get(step.docId);
    if (group) group.push(step);
    else byDocument.set(step.docId, [step]);
  }
  const ids = new Set<string>();
  for (const group of byDocument.values()) {
    const current = currentApprovalStep(latestChain(group));
    if (current) ids.add(current.id);
  }
  return ids;
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
