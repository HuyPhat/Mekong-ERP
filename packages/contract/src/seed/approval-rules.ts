import type { ApprovalRule } from '../approval-entities';

// Thresholds and escalation from PLAN.md §6: PO < 50M → Purchasing Manager;
// >= 50M → + Finance Manager; >= 500M → + Director. Each tier lists the full
// cumulative chain (see ADR-0004), not just the newly-added approver.
export function generateApprovalRules(): ApprovalRule[] {
  return [
    {
      id: 'rule-po-1',
      docType: 'purchase_order',
      minAmount: 0,
      maxAmount: 49_999_999,
      approverRoles: ['approver_manager'],
    },
    {
      id: 'rule-po-2',
      docType: 'purchase_order',
      minAmount: 50_000_000,
      maxAmount: 499_999_999,
      approverRoles: ['approver_manager', 'approver_finance'],
    },
    {
      id: 'rule-po-3',
      docType: 'purchase_order',
      minAmount: 500_000_000,
      maxAmount: null,
      approverRoles: ['approver_manager', 'approver_finance', 'approver_director'],
    },
  ];
}
