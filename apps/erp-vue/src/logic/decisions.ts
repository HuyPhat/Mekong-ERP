import {
  ApiError,
  PERMISSIONS,
  hasPermission,
  type ApprovalDocType,
  type ApprovalView,
  type User,
} from '@mekong-erp/contract';

// Each kind of document is decided under its own permission. (UX gating, like every
// permission in this project: the mock server decides nothing by it.)
const DECIDE_PERMISSION: Record<ApprovalDocType, string> = {
  purchase_order: PERMISSIONS.purchaseOrderApprove,
  leave_request: PERMISSIONS.leaveRequestApprove,
};

/** Whether this login may decide this step: it is waiting, and the login holds the permission. */
export function canDecide(user: User | null | undefined, step: ApprovalView): boolean {
  return step.status === 'pending' && hasPermission(user ?? null, DECIDE_PERMISSION[step.docType]);
}

export function decidableSteps(
  user: User | null | undefined,
  steps: ApprovalView[],
): ApprovalView[] {
  return steps.filter((step) => canDecide(user, step));
}

export interface BulkOutcome {
  succeeded: number;
  failed: number;
}

export function summarizeBulk(results: PromiseSettledResult<unknown>[]): BulkOutcome {
  const succeeded = results.filter((result) => result.status === 'fulfilled').length;
  return { succeeded, failed: results.length - succeeded };
}

/** Why a decision was refused, in the terms the screen words differently. */
export type DecisionFailure = 'own-request' | 'not-your-turn' | 'other';

export function classifyDecisionError(error: unknown): DecisionFailure {
  if (error instanceof ApiError) {
    if (error.code === 'SELF_DECISION') return 'own-request';
    if (error.code === 'INVALID_STEP') return 'not-your-turn';
  }
  return 'other';
}
