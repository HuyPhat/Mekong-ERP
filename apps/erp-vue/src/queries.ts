import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  fetchApprovals,
  fetchLeaveRequest,
  fetchPurchaseOrder,
  fetchSession,
  loginAs,
  logout,
  submitApprovalDecision,
  type ListParams,
} from '@mekong-erp/contract';

// Server state lives in TanStack Query and nowhere else, keyed through one factory,
// exactly as in the React app: the contract's client functions are the same ones.
export const sessionKey = ['session'] as const;

export const queryKeys = {
  approvals: (params: ListParams) => ['approvals', 'list', params] as const,
  // Under 'approvals', so a decision refreshes it along with the lists.
  history: (docId: string) => ['approvals', 'history', docId] as const,
  purchaseOrder: (id: string) => ['purchase-orders', 'detail', id] as const,
  leaveRequest: (id: string) => ['leave-requests', 'detail', id] as const,
};

export function sessionQueryOptions() {
  return { queryKey: sessionKey, queryFn: fetchSession };
}

export function useSession() {
  return useQuery(sessionQueryOptions());
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginAs,
    onSuccess: (session) => queryClient.setQueryData(sessionKey, session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: (session) => queryClient.setQueryData(sessionKey, session),
  });
}

export function useApprovals(params: MaybeRefOrGetter<ListParams>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approvals(toValue(params))),
    queryFn: () => fetchApprovals(toValue(params)),
    // Paging or filtering keeps the old rows on screen until the new ones arrive.
    placeholderData: keepPreviousData,
  });
}

export function useApprovalHistory(docId: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => queryKeys.history(toValue(docId) ?? '')),
    queryFn: () => fetchApprovals({ page: 1, pageSize: 50, filters: { docId: toValue(docId) } }),
    enabled: computed(() => Boolean(toValue(docId))),
  });
}

export function usePurchaseOrder(id: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => queryKeys.purchaseOrder(toValue(id) ?? '')),
    queryFn: () => fetchPurchaseOrder(toValue(id) ?? ''),
    enabled: computed(() => Boolean(toValue(id))),
  });
}

export function useLeaveRequest(id: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => queryKeys.leaveRequest(toValue(id) ?? '')),
    queryFn: () => fetchLeaveRequest(toValue(id) ?? ''),
    enabled: computed(() => Boolean(toValue(id))),
  });
}

export interface DecisionInput {
  id: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  actorId: string;
  comment?: string;
}

export function useDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DecisionInput) =>
      submitApprovalDecision(input.id, input.decision, input.actorId, input.comment),
    onSuccess: () => {
      // A decision moves the step, the document behind it, and what the panel shows.
      for (const key of ['approvals', 'purchase-orders', 'leave-requests']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
