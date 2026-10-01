import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApprovals, submitApprovalDecision, type ListParams } from '@mekong-erp/contract';
import { approvalKeys } from './query-keys';

// The approval engine serves every kind of document (purchase orders, leave), so its
// hooks live here and not with any one of them.

export function useApprovals(params: ListParams) {
  return useQuery({
    queryKey: approvalKeys.list(params),
    queryFn: () => fetchApprovals(params),
    placeholderData: (previous) => previous,
  });
}

export function useSubmitApprovalDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      actorId,
      comment,
    }: {
      id: string;
      decision: 'approved' | 'rejected' | 'changes_requested';
      actorId: string;
      comment?: string;
    }) => submitApprovalDecision(id, decision, actorId, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'list'] });
    },
  });
}
