import type { ApprovalStatus } from '@mekong-erp/contract';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'destructive';

const APPROVAL_TONE: Record<ApprovalStatus, Tone> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'warning',
  skipped: 'neutral',
};

export function approvalTone(status: ApprovalStatus): Tone {
  return APPROVAL_TONE[status];
}

/**
 * The tone of a document's own status, for purchase orders and leave requests alike.
 * A status this doesn't know is neutral rather than an error: the panel still shows it.
 */
export function documentTone(status: string): Tone {
  switch (status) {
    case 'approved':
    case 'received':
    case 'billed':
      return 'success';
    case 'pending_approval':
    case 'partially_received':
      return 'info';
    case 'changes_requested':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'destructive';
    default:
      return 'neutral';
  }
}
