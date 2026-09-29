import { z } from 'zod';
import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import {
  SupplierSchema,
  PurchaseOrderViewSchema,
  GoodsReceiptViewSchema,
  GoodsReceiptSchema,
  VendorBillSchema,
  VendorBillViewSchema,
  VatRateSchema,
} from './purchasing-entities';

const SupplierListResponseSchema = listResponseSchema(SupplierSchema);
const PurchaseOrderListResponseSchema = listResponseSchema(PurchaseOrderViewSchema);
const GoodsReceiptListResponseSchema = listResponseSchema(GoodsReceiptViewSchema);
const VendorBillListResponseSchema = listResponseSchema(VendorBillViewSchema);

export function fetchSuppliers(params: ListParams) {
  return request(`/suppliers?${buildListQuery(params)}`, SupplierListResponseSchema);
}

export function fetchSupplier(id: string) {
  return request(`/suppliers/${id}`, SupplierSchema);
}

export interface PurchaseOrderLineInput {
  productId: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: z.infer<typeof VatRateSchema>;
}

export interface PurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  deliveryDate: string;
  terms: string;
  lines: PurchaseOrderLineInput[];
}

export function fetchPurchaseOrders(params: ListParams) {
  return request(`/purchase-orders?${buildListQuery(params)}`, PurchaseOrderListResponseSchema);
}

export function fetchPurchaseOrder(id: string) {
  return request(`/purchase-orders/${id}`, PurchaseOrderViewSchema);
}

export function createPurchaseOrder(input: PurchaseOrderInput) {
  return request('/purchase-orders', PurchaseOrderViewSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updatePurchaseOrder(id: string, input: PurchaseOrderInput) {
  return request(`/purchase-orders/${id}`, PurchaseOrderViewSchema, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function submitPurchaseOrder(id: string) {
  return request(`/purchase-orders/${id}/submit`, PurchaseOrderViewSchema, { method: 'POST' });
}

export function cancelPurchaseOrder(id: string) {
  return request(`/purchase-orders/${id}/cancel`, PurchaseOrderViewSchema, { method: 'POST' });
}

export interface ReceiveLineInput {
  poLineId: string;
  productId: string;
  receivedQty: number;
}

const ReceiveResponseSchema = z.object({
  goodsReceipt: GoodsReceiptSchema,
  purchaseOrder: PurchaseOrderViewSchema,
});

export function receivePurchaseOrder(id: string, lines: ReceiveLineInput[]) {
  return request(`/purchase-orders/${id}/receive`, ReceiveResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ lines }),
  });
}

export function fetchGoodsReceipts(params: ListParams) {
  return request(`/goods-receipts?${buildListQuery(params)}`, GoodsReceiptListResponseSchema);
}

export function fetchGoodsReceipt(id: string) {
  return request(`/goods-receipts/${id}`, GoodsReceiptViewSchema);
}

export interface VendorBillLineInput {
  poLineId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  vatRate: z.infer<typeof VatRateSchema>;
}

export function fetchVendorBills(params: ListParams) {
  return request(`/vendor-bills?${buildListQuery(params)}`, VendorBillListResponseSchema);
}

export function fetchVendorBill(id: string) {
  return request(`/vendor-bills/${id}`, VendorBillViewSchema);
}

export function createVendorBill(poId: string, lines: VendorBillLineInput[]) {
  return request('/vendor-bills', VendorBillViewSchema, {
    method: 'POST',
    body: JSON.stringify({ poId, lines }),
  });
}

const MatchLineSchema = z.object({
  productId: z.string(),
  poQty: z.number(),
  poUnitPrice: z.number(),
  receivedQty: z.number(),
  billedQty: z.number().nullable(),
  billedUnitPrice: z.number().nullable(),
  status: z.enum(['matched', 'qty_variance', 'price_variance', 'not_received']),
});
const MatchResponseSchema = z.object({
  lines: z.array(MatchLineSchema),
  hasExceptions: z.boolean(),
});

export function fetchVendorBillMatch(id: string) {
  return request(`/vendor-bills/${id}/match`, MatchResponseSchema);
}

// These three actions return the bare bill (no denormalized poNumber/
// supplierName) since the caller already has that context from the detail page.
export function confirmVendorBillMatch(id: string) {
  return request(`/vendor-bills/${id}/confirm-match`, VendorBillSchema, { method: 'POST' });
}

export function overrideVendorBillMatch(id: string, reason: string) {
  return request(`/vendor-bills/${id}/override-match`, VendorBillSchema, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function payVendorBill(id: string) {
  return request(`/vendor-bills/${id}/pay`, VendorBillSchema, { method: 'POST' });
}
