import { z } from 'zod';
import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import { ApprovalSchema, ApprovalViewSchema, ApprovalStatusSchema } from './approval-entities';

const ApprovalListResponseSchema = listResponseSchema(ApprovalViewSchema);

export function fetchApprovals(params: ListParams) {
  return request(`/approvals?${buildListQuery(params)}`, ApprovalListResponseSchema);
}

const DecideApprovalResponseSchema = z.object({
  chain: z.array(ApprovalSchema),
  outcome: z.enum(['pending', 'approved', 'rejected', 'changes_requested']),
});

export function submitApprovalDecision(
  id: string,
  decision: Extract<
    z.infer<typeof ApprovalStatusSchema>,
    'approved' | 'rejected' | 'changes_requested'
  >,
  actorId: string,
  comment?: string,
) {
  return request(`/approvals/${id}/decide`, DecideApprovalResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ decision, actorId, ...(comment ? { comment } : {}) }),
  });
}
