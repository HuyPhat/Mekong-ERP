import { z } from 'zod';

// Only purchase orders go through the approval engine in Phase 3 — vendor
// bills are gated by three-way match instead (ADR-0005), not a second
// approval chain. Extend this enum only when something actually creates a
// chain for that doc type.
export const ApprovalDocTypeSchema = z.enum(['purchase_order']);
export type ApprovalDocType = z.infer<typeof ApprovalDocTypeSchema>;

export const ApprovalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'changes_requested',
  'skipped',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalSchema = z.object({
  id: z.string(),
  docType: ApprovalDocTypeSchema,
  docId: z.string(),
  docNumber: z.string(),
  sequence: z.number().int().positive(),
  approverRole: z.string(),
  status: ApprovalStatusSchema,
  decidedBy: z.string().optional(),
  decidedAt: z.string().optional(),
  comment: z.string().optional(),
  createdAt: z.string(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const ApprovalViewSchema = ApprovalSchema.extend({
  amount: z.number().int(),
  supplierName: z.string(),
});
export type ApprovalView = z.infer<typeof ApprovalViewSchema>;

export const ApprovalRuleSchema = z.object({
  id: z.string(),
  docType: ApprovalDocTypeSchema,
  minAmount: z.number().int().nonnegative(),
  maxAmount: z.number().int().positive().nullable(),
  approverRoles: z.array(z.string()).min(1),
});
export type ApprovalRule = z.infer<typeof ApprovalRuleSchema>;
