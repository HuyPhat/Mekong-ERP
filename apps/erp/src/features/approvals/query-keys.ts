import type { ListParams } from '@mekong-erp/contract';

export const approvalKeys = {
  list: (params: ListParams) => ['approvals', 'list', params] as const,
};
