import type { ListParams } from '@mekong-erp/contract';

export const inventoryKeys = {
  warehouses: () => ['warehouses'] as const,
  products: {
    list: (params: ListParams) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  stockLevels: {
    list: (params: ListParams) => ['stock-levels', 'list', params] as const,
  },
  stockMovements: {
    all: () => ['stock-movements', 'all'] as const,
  },
};
