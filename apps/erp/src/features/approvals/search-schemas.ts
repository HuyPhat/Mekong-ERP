import { z } from '@mekong-erp/contract';

export const ApprovalsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  docType: z.string().optional(),
});
export type ApprovalsSearch = z.infer<typeof ApprovalsSearchSchema>;
