import type { TFunction } from 'i18next';
import type { StatusBadgeTone } from '@mekong-erp/ui';
import type { LeaveRequestStatus, LeaveType } from '@mekong-erp/contract';

const LEAVE_STATUS_TONE: Record<LeaveRequestStatus, StatusBadgeTone> = {
  pending_approval: 'info',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'warning',
  cancelled: 'neutral',
};

export function leaveStatusTone(status: LeaveRequestStatus): StatusBadgeTone {
  return LEAVE_STATUS_TONE[status];
}

export function leaveStatusLabel(t: TFunction, status: LeaveRequestStatus): string {
  return t(`hrm.leave.status.${status}`);
}

export function leaveTypeLabel(t: TFunction, type: LeaveType): string {
  return t(`hrm.leave.type.${type}`);
}
