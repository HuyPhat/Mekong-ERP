import type { ListParams } from '@mekong-erp/contract';

export const hrmKeys = {
  employees: {
    byUser: (userId: string) => ['employees', 'by-user', userId] as const,
  },
  leaveRequests: {
    list: (params: ListParams) => ['leave-requests', 'list', params] as const,
    detail: (id: string) => ['leave-requests', 'detail', id] as const,
  },
  leaveBalance: (employeeId: string, year: number) => ['leave-balance', employeeId, year] as const,
};
