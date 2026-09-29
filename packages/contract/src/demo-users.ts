import type { User } from './schemas';

export const PERMISSIONS = {
  dashboardRead: 'dashboard:read',
  inventoryRead: 'inventory:read',
  inventoryWrite: 'inventory:write',
  purchasingRead: 'purchasing:read',
  purchasingWrite: 'purchasing:write',
  salesRead: 'sales:read',
  accountingRead: 'accounting:read',
  approvalsRead: 'approvals:read',
  adminRead: 'admin:read',
  purchaseOrderApprove: 'purchase_order:approve',
  journalPost: 'journal:post',
  vendorBillOverrideMatch: 'vendor_bill:override_match',
} as const;

export const DEMO_USERS: User[] = [
  { id: 'admin', name: 'Admin', role: 'admin', permissions: ['*'] },
  {
    id: 'purchasing',
    name: 'Nguyễn Văn An',
    role: 'purchasing',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.inventoryRead,
      PERMISSIONS.purchasingRead,
      PERMISSIONS.purchasingWrite,
    ],
  },
  {
    id: 'warehouse',
    name: 'Trần Thị Bình',
    role: 'warehouse',
    permissions: [PERMISSIONS.dashboardRead, PERMISSIONS.inventoryRead, PERMISSIONS.inventoryWrite],
  },
  {
    id: 'accountant',
    name: 'Lê Thị Cúc',
    role: 'accountant',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.inventoryRead,
      PERMISSIONS.accountingRead,
      PERMISSIONS.purchasingRead,
      PERMISSIONS.vendorBillOverrideMatch,
    ],
  },
  {
    id: 'approver_manager',
    name: 'Phạm Văn Đức',
    role: 'approver_manager',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.approvalsRead,
      PERMISSIONS.purchaseOrderApprove,
    ],
  },
  {
    id: 'approver_finance',
    name: 'Ngô Thị Hoa',
    role: 'approver_finance',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.approvalsRead,
      PERMISSIONS.purchaseOrderApprove,
      PERMISSIONS.accountingRead,
    ],
  },
  {
    id: 'approver_director',
    name: 'Hoàng Thị Em',
    role: 'approver_director',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.approvalsRead,
      PERMISSIONS.purchaseOrderApprove,
      PERMISSIONS.journalPost,
      PERMISSIONS.accountingRead,
    ],
  },
];

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}
