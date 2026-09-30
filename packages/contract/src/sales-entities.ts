import { z } from 'zod';
import { VatRateSchema } from './purchasing-entities';

export const CustomerSchema = z.object({
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
export type Customer = z.infer<typeof CustomerSchema>;

export const QuotationLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().min(0).max(100),
  vatRate: VatRateSchema,
  lineTotal: z.number().int(),
});
export type QuotationLine = z.infer<typeof QuotationLineSchema>;

export const QuotationStatusSchema = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted',
]);
export type QuotationStatus = z.infer<typeof QuotationStatusSchema>;

export const QuotationSchema = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string(),
  warehouseId: z.string(),
  status: QuotationStatusSchema,
  quoteDate: z.string(),
  validUntil: z.string(),
  terms: z.string(),
  lines: z.array(QuotationLineSchema),
  subtotal: z.number().int(),
  vatTotal: z.number().int(),
  grandTotal: z.number().int(),
  createdBy: z.string(),
  createdAt: z.string(),
  sentAt: z.string().optional(),
  decidedAt: z.string().optional(),
  convertedToSoId: z.string().optional(),
});
export type Quotation = z.infer<typeof QuotationSchema>;

export const QuotationViewSchema = QuotationSchema.extend({
  customerName: z.string(),
});
export type QuotationView = z.infer<typeof QuotationViewSchema>;

export const SalesOrderLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().min(0).max(100),
  vatRate: VatRateSchema,
  lineTotal: z.number().int(),
});
export type SalesOrderLine = z.infer<typeof SalesOrderLineSchema>;

export const SalesOrderStatusSchema = z.enum([
  'draft',
  'confirmed',
  'partially_delivered',
  'delivered',
  'invoiced',
  'closed',
  'cancelled',
]);
export type SalesOrderStatus = z.infer<typeof SalesOrderStatusSchema>;

export const SalesOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string(),
  warehouseId: z.string(),
  status: SalesOrderStatusSchema,
  orderDate: z.string(),
  deliveryDate: z.string(),
  terms: z.string(),
  lines: z.array(SalesOrderLineSchema),
  subtotal: z.number().int(),
  vatTotal: z.number().int(),
  grandTotal: z.number().int(),
  quotationId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  confirmedAt: z.string().optional(),
});
export type SalesOrder = z.infer<typeof SalesOrderSchema>;

export const SalesOrderViewSchema = SalesOrderSchema.extend({
  customerName: z.string(),
});
export type SalesOrderView = z.infer<typeof SalesOrderViewSchema>;

export const DeliveryLineSchema = z.object({
  id: z.string(),
  soLineId: z.string(),
  productId: z.string(),
  deliveredQty: z.number().int().positive(),
});
export type DeliveryLine = z.infer<typeof DeliveryLineSchema>;

export const DeliverySchema = z.object({
  id: z.string(),
  number: z.string(),
  soId: z.string(),
  warehouseId: z.string(),
  lines: z.array(DeliveryLineSchema),
  deliveredAt: z.string(),
  deliveredBy: z.string(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

export const DeliveryViewSchema = DeliverySchema.extend({
  soNumber: z.string(),
  customerName: z.string(),
});
export type DeliveryView = z.infer<typeof DeliveryViewSchema>;

export const CustomerInvoiceLineSchema = z.object({
  id: z.string(),
  soLineId: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  vatRate: VatRateSchema,
  lineTotal: z.number().int(),
});
export type CustomerInvoiceLine = z.infer<typeof CustomerInvoiceLineSchema>;

// No match-style gate on the sales side (there's no inbound three-way match
// equivalent) — unpaid/paid/cancelled is the whole lifecycle. "Overdue" is a
// derived display/aging state (unpaid + dueDate < now), not stored, so it
// can never drift from the date that actually defines it.
export const CustomerInvoiceStatusSchema = z.enum(['unpaid', 'paid', 'cancelled']);
export type CustomerInvoiceStatus = z.infer<typeof CustomerInvoiceStatusSchema>;

export const CustomerInvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  symbol: z.string(),
  customerId: z.string(),
  soId: z.string(),
  lines: z.array(CustomerInvoiceLineSchema),
  subtotal: z.number().int(),
  vatTotal: z.number().int(),
  grandTotal: z.number().int(),
  status: CustomerInvoiceStatusSchema,
  issueDate: z.string(),
  dueDate: z.string(),
  createdAt: z.string(),
  paidAt: z.string().optional(),
});
export type CustomerInvoice = z.infer<typeof CustomerInvoiceSchema>;

export const CustomerInvoiceViewSchema = CustomerInvoiceSchema.extend({
  customerName: z.string(),
  soNumber: z.string(),
});
export type CustomerInvoiceView = z.infer<typeof CustomerInvoiceViewSchema>;
