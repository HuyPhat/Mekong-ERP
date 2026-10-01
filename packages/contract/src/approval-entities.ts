import { z } from './zod';

// A doc type is added when something actually creates an approval chain for it:
// purchase orders in Phase 3, leave requests in Phase 6 (ADR-0004, ADR-0015).
// Vendor bills go through the three-way-match gate instead (ADR-0005).
export const ApprovalDocTypeSchema = z.enum(['purchase_order', 'leave_request']);
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

/**
 * What the inbox lists: an approval step plus enough of its document to decide
 * on. The same shape serves every doc type, so one inbox (and one client, in any
 * framework) lists them together.
 */
export const ApprovalViewSchema = ApprovalSchema.extend({
  /** What the approval is about: the supplier for a purchase order, the employee for leave. */
  subject: z.string(),
  /** The magnitude the approval rules are keyed on, in `unit`. */
  amount: z.number().int(),
  /** VND for a purchase order, working days for a leave request. */
  unit: z.enum(['vnd', 'days']),
  /**
   * Whether someone can decide this step now: it is the next pending step of the
   * document's newest chain. A pending step behind an earlier approver's is not yet up.
   */
  actionable: z.boolean(),
});
export type ApprovalView = z.infer<typeof ApprovalViewSchema>;

/**
 * `minAmount`/`maxAmount` bound the document's magnitude, which is in VND for a
 * purchase order and in working days for a leave request.
 */
export const ApprovalRuleSchema = z.object({
  id: z.string(),
  docType: ApprovalDocTypeSchema,
  minAmount: z.number().int().nonnegative(),
  maxAmount: z.number().int().positive().nullable(),
  approverRoles: z.array(z.string()).min(1),
});
export type ApprovalRule = z.infer<typeof ApprovalRuleSchema>;
