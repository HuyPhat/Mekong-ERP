import { z } from '@mekong-erp/contract';

export const LeaveRequestsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  // "mine" is the signed-in employee's own requests; "all" is everyone's.
  scope: z.enum(['mine', 'all']).catch('mine'),
  // Comma-joined selected values — see packages/ui's ColumnFilterConfig (enum-multiselect).
  status: z.string().optional(),
  type: z.string().optional(),
});
export type LeaveRequestsSearch = z.infer<typeof LeaveRequestsSearchSchema>;
