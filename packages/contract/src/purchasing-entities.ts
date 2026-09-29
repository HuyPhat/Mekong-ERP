import { z } from 'zod';

export const SupplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  taxCode: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  creditLimit: z.number().int(),
  paymentTermsDays: z.number().int(),
  createdAt: z.string(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const VatRateSchema = z.union([z.literal(0), z.literal(5), z.literal(8), z.literal(10)]);
export type VatRate = z.infer<typeof VatRateSchema>;

export const PurchaseOrderLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().min(0).max(100),
  vatRate: VatRateSchema,
  lineTotal: z.number().int(),
});
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>;

export const PurchaseOrderStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'changes_requested',
  'approved',
  'rejected',
  'partially_received',
  'received',
  'billed',
  'closed',
  'cancelled',
]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  supplierId: z.string(),
  warehouseId: z.string(),
  status: PurchaseOrderStatusSchema,
  orderDate: z.string(),
  deliveryDate: z.string(),
  terms: z.string(),
  lines: z.array(PurchaseOrderLineSchema),
  subtotal: z.number().int(),
  vatTotal: z.number().int(),
  grandTotal: z.number().int(),
  createdBy: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().optional(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseOrderViewSchema = PurchaseOrderSchema.extend({
  supplierName: z.string(),
});
export type PurchaseOrderView = z.infer<typeof PurchaseOrderViewSchema>;

export const GoodsReceiptLineSchema = z.object({
  id: z.string(),
  poLineId: z.string(),
  productId: z.string(),
  receivedQty: z.number().int().positive(),
});
export type GoodsReceiptLine = z.infer<typeof GoodsReceiptLineSchema>;

export const GoodsReceiptSchema = z.object({
  id: z.string(),
  number: z.string(),
  poId: z.string(),
  warehouseId: z.string(),
  lines: z.array(GoodsReceiptLineSchema),
  receivedAt: z.string(),
  receivedBy: z.string(),
});
export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>;

export const GoodsReceiptViewSchema = GoodsReceiptSchema.extend({
  poNumber: z.string(),
  supplierName: z.string(),
});
export type GoodsReceiptView = z.infer<typeof GoodsReceiptViewSchema>;

export const VendorBillLineSchema = z.object({
  id: z.string(),
  poLineId: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  vatRate: VatRateSchema,
  lineTotal: z.number().int(),
});
export type VendorBillLine = z.infer<typeof VendorBillLineSchema>;

export const VendorBillStatusSchema = z.enum([
  'pending_match',
  'matched',
  'match_override',
  'paid',
]);
export type VendorBillStatus = z.infer<typeof VendorBillStatusSchema>;

export const VendorBillSchema = z.object({
  id: z.string(),
  number: z.string(),
  supplierId: z.string(),
  poId: z.string(),
  lines: z.array(VendorBillLineSchema),
  subtotal: z.number().int(),
  vatTotal: z.number().int(),
  grandTotal: z.number().int(),
  status: VendorBillStatusSchema,
  dueDate: z.string(),
  createdAt: z.string(),
  paidAt: z.string().optional(),
  matchOverrideReason: z.string().optional(),
});
export type VendorBill = z.infer<typeof VendorBillSchema>;

export const VendorBillViewSchema = VendorBillSchema.extend({
  supplierName: z.string(),
  poNumber: z.string(),
});
export type VendorBillView = z.infer<typeof VendorBillViewSchema>;
