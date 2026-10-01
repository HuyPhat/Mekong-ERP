import type { TFunction } from 'i18next';
import type { StatusBadgeTone } from '@mekong-erp/ui';
import type { ApprovalStatus } from '@mekong-erp/contract';

const APPROVAL_STATUS_TONE: Record<ApprovalStatus, StatusBadgeTone> = {
  pending: 'info',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'warning',
  skipped: 'neutral',
};

export function approvalStatusTone(status: ApprovalStatus): StatusBadgeTone {
  return APPROVAL_STATUS_TONE[status];
}

export function approvalStatusLabel(t: TFunction, status: ApprovalStatus): string {
  return t(`approvals.status.${status}`);
}
