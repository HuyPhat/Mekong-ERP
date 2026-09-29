import type { ListParams } from '@mekong-erp/contract';

export const purchasingKeys = {
  suppliers: {
    list: (params: ListParams) => ['suppliers', 'list', params] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
  },
  purchaseOrders: {
    list: (params: ListParams) => ['purchase-orders', 'list', params] as const,
    detail: (id: string) => ['purchase-orders', 'detail', id] as const,
  },
  goodsReceipts: {
    list: (params: ListParams) => ['goods-receipts', 'list', params] as const,
    detail: (id: string) => ['goods-receipts', 'detail', id] as const,
  },
  vendorBills: {
    list: (params: ListParams) => ['vendor-bills', 'list', params] as const,
    detail: (id: string) => ['vendor-bills', 'detail', id] as const,
    match: (id: string) => ['vendor-bills', 'match', id] as const,
  },
  approvals: {
    list: (params: ListParams) => ['approvals', 'list', params] as const,
  },
  auditLog: {
    list: (params: ListParams) => ['audit-log', 'list', params] as const,
  },
};
