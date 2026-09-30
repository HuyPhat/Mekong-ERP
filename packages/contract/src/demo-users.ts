import type { User } from './schemas';

export const PERMISSIONS = {
  dashboardRead: 'dashboard:read',
  inventoryRead: 'inventory:read',
  inventoryWrite: 'inventory:write',
  purchasingRead: 'purchasing:read',
  purchasingWrite: 'purchasing:write',
  salesRead: 'sales:read',
  salesWrite: 'sales:write',
  accountingRead: 'accounting:read',
  approvalsRead: 'approvals:read',
  adminRead: 'admin:read',
  purchaseOrderApprove: 'purchase_order:approve',
  journalPost: 'journal:post',
  vendorBillOverrideMatch: 'vendor_bill:override_match',
  // Everyone is an employee: hrm:read/write cover their own leave. Approving
  // someone else's request is a separate permission (ADR-0015).
  hrmRead: 'hrm:read',
  hrmWrite: 'hrm:write',
  leaveRequestApprove: 'leave_request:approve',
} as const;

const EMPLOYEE_PERMISSIONS = [PERMISSIONS.hrmRead, PERMISSIONS.hrmWrite];

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
      ...EMPLOYEE_PERMISSIONS,
    ],
  },
  {
    id: 'warehouse',
    name: 'Trần Thị Bình',
    role: 'warehouse',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.inventoryRead,
      PERMISSIONS.inventoryWrite,
      ...EMPLOYEE_PERMISSIONS,
    ],
  },
  {
    id: 'sales',
    name: 'Đỗ Thị Giang',
    role: 'sales',
    permissions: [
      PERMISSIONS.dashboardRead,
      PERMISSIONS.inventoryRead,
      PERMISSIONS.salesRead,
      PERMISSIONS.salesWrite,
      ...EMPLOYEE_PERMISSIONS,
    ],
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
      PERMISSIONS.salesRead,
      PERMISSIONS.vendorBillOverrideMatch,
      ...EMPLOYEE_PERMISSIONS,
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
      PERMISSIONS.leaveRequestApprove,
      ...EMPLOYEE_PERMISSIONS,
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
      ...EMPLOYEE_PERMISSIONS,
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
      PERMISSIONS.leaveRequestApprove,
      ...EMPLOYEE_PERMISSIONS,
    ],
  },
];

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}
