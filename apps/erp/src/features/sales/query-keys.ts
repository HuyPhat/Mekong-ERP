import type { ListParams } from '@mekong-erp/contract';

export const salesKeys = {
  customers: {
    list: (params: ListParams) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  quotations: {
    list: (params: ListParams) => ['quotations', 'list', params] as const,
    detail: (id: string) => ['quotations', 'detail', id] as const,
  },
  salesOrders: {
    list: (params: ListParams) => ['sales-orders', 'list', params] as const,
    detail: (id: string) => ['sales-orders', 'detail', id] as const,
  },
  deliveries: {
    list: (params: ListParams) => ['deliveries', 'list', params] as const,
    detail: (id: string) => ['deliveries', 'detail', id] as const,
  },
  customerInvoices: {
    list: (params: ListParams) => ['customer-invoices', 'list', params] as const,
    detail: (id: string) => ['customer-invoices', 'detail', id] as const,
  },
};
