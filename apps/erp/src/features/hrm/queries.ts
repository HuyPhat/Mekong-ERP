import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  fetchEmployees,
  fetchLeaveRequests,
  fetchLeaveRequest,
  fetchLeaveBalance,
  createLeaveRequest,
  reviseLeaveRequest,
  cancelLeaveRequest,
  type CreateLeaveRequestInput,
  type ListParams,
} from '@mekong-erp/contract';
import { hrmKeys } from './query-keys';

/** The employee record behind a demo login; `null` when the login has none. */
export function useMyEmployee(userId: string | undefined) {
  const id = userId ?? '';
  return useQuery({
    queryKey: hrmKeys.employees.byUser(id),
    queryFn: async () => {
      const found = await fetchEmployees({ page: 1, pageSize: 1, filters: { userId: id } });
      return found.data[0] ?? null;
    },
    enabled: id.length > 0,
  });
}

/** `enabled` is false while the filters aren't known yet, so a half-built query is never sent. */
export function useLeaveRequests(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: hrmKeys.leaveRequests.list(params),
    queryFn: () => fetchLeaveRequests(params),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: hrmKeys.leaveRequests.detail(id),
    queryFn: () => fetchLeaveRequest(id),
    enabled: id.length > 0,
  });
}

export function useLeaveBalance(employeeId: string | undefined, year: number) {
  const id = employeeId ?? '';
  return useQuery({
    queryKey: hrmKeys.leaveBalance(id, year),
    queryFn: () => fetchLeaveBalance(id, year),
    enabled: id.length > 0,
  });
}

// A change to a request moves the balance and, through the approval chain, the inbox.
function invalidateAfterChange(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['leave-requests', 'list'] });
  void queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
  void queryClient.invalidateQueries({ queryKey: ['approvals'] });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) => createLeaveRequest(input),
    onSuccess: (leave) => {
      queryClient.setQueryData(hrmKeys.leaveRequests.detail(leave.id), leave);
      invalidateAfterChange(queryClient);
    },
  });
}

export function useReviseLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateLeaveRequestInput }) =>
      reviseLeaveRequest(id, input),
    onSuccess: (leave) => {
      queryClient.setQueryData(hrmKeys.leaveRequests.detail(leave.id), leave);
      invalidateAfterChange(queryClient);
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: (leave) => {
      queryClient.setQueryData(hrmKeys.leaveRequests.detail(leave.id), leave);
      invalidateAfterChange(queryClient);
    },
  });
}
