import { z } from 'zod';

export const SuppliersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
});
export type SuppliersSearch = z.infer<typeof SuppliersSearchSchema>;

export const PurchaseOrdersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  // Comma-joined selected values — see packages/ui's ColumnFilterConfig (enum-multiselect).
  status: z.string().optional(),
  supplierId: z.string().optional(),
  orderFrom: z.string().optional(),
  orderTo: z.string().optional(),
});
export type PurchaseOrdersSearch = z.infer<typeof PurchaseOrdersSearchSchema>;

export const VendorBillsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
});
export type VendorBillsSearch = z.infer<typeof VendorBillsSearchSchema>;

export const VendorBillNewSearchSchema = z.object({
  poId: z.string().optional(),
});
export type VendorBillNewSearch = z.infer<typeof VendorBillNewSearchSchema>;

export const ApprovalsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
});
export type ApprovalsSearch = z.infer<typeof ApprovalsSearchSchema>;

export const AuditLogSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  entityType: z.string().optional(),
});
export type AuditLogSearch = z.infer<typeof AuditLogSearchSchema>;
