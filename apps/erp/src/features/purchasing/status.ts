import type { TFunction } from 'i18next';
import type { StatusBadgeTone } from '@mekong-erp/ui';
import type {
  ApprovalStatus,
  MatchLineStatus,
  PurchaseOrderStatus,
  VendorBillStatus,
} from '@mekong-erp/contract';

const PO_STATUS_TONE: Record<PurchaseOrderStatus, StatusBadgeTone> = {
  draft: 'neutral',
  pending_approval: 'info',
  changes_requested: 'warning',
  approved: 'success',
  rejected: 'destructive',
  partially_received: 'info',
  received: 'success',
  billed: 'success',
  closed: 'neutral',
  cancelled: 'destructive',
};

export function poStatusTone(status: PurchaseOrderStatus): StatusBadgeTone {
  return PO_STATUS_TONE[status];
}

export function poStatusLabel(t: TFunction, status: PurchaseOrderStatus): string {
  return t(`purchasing.orders.status.${status}`);
}

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

const BILL_STATUS_TONE: Record<VendorBillStatus, StatusBadgeTone> = {
  pending_match: 'warning',
  matched: 'success',
  match_override: 'info',
  paid: 'success',
};

export function billStatusTone(status: VendorBillStatus): StatusBadgeTone {
  return BILL_STATUS_TONE[status];
}

export function billStatusLabel(t: TFunction, status: VendorBillStatus): string {
  return t(`purchasing.bills.status.${status}`);
}

const MATCH_STATUS_TONE: Record<MatchLineStatus, StatusBadgeTone> = {
  matched: 'success',
  qty_variance: 'warning',
  price_variance: 'warning',
  not_received: 'neutral',
};

export function matchStatusTone(status: MatchLineStatus): StatusBadgeTone {
  return MATCH_STATUS_TONE[status];
}

export function matchStatusLabel(t: TFunction, status: MatchLineStatus): string {
  return t(`purchasing.bills.matchStatus.${status}`);
}
