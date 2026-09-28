import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Calculator,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { PERMISSIONS } from '@mekong-erp/contract';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  permission: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.dashboardRead,
  },
  {
    to: '/inventory',
    labelKey: 'nav.inventory',
    icon: Package,
    permission: PERMISSIONS.inventoryRead,
  },
  {
    to: '/purchasing',
    labelKey: 'nav.purchasing',
    icon: ShoppingCart,
    permission: PERMISSIONS.purchasingRead,
  },
  { to: '/sales', labelKey: 'nav.sales', icon: Receipt, permission: PERMISSIONS.salesRead },
  {
    to: '/accounting',
    labelKey: 'nav.accounting',
    icon: Calculator,
    permission: PERMISSIONS.accountingRead,
  },
  {
    to: '/approvals',
    labelKey: 'nav.approvals',
    icon: ClipboardCheck,
    permission: PERMISSIONS.approvalsRead,
  },
  { to: '/admin', labelKey: 'nav.admin', icon: ShieldCheck, permission: PERMISSIONS.adminRead },
];
