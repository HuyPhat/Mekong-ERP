import { z } from 'zod';
import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import {
  CustomerSchema,
  QuotationViewSchema,
  SalesOrderViewSchema,
  DeliverySchema,
  DeliveryViewSchema,
  CustomerInvoiceSchema,
  CustomerInvoiceViewSchema,
} from './sales-entities';
import { VatRateSchema } from './purchasing-entities';

const CustomerListResponseSchema = listResponseSchema(CustomerSchema);
const QuotationListResponseSchema = listResponseSchema(QuotationViewSchema);
const SalesOrderListResponseSchema = listResponseSchema(SalesOrderViewSchema);
const DeliveryListResponseSchema = listResponseSchema(DeliveryViewSchema);
const CustomerInvoiceListResponseSchema = listResponseSchema(CustomerInvoiceViewSchema);

export function fetchCustomers(params: ListParams) {
  return request(`/customers?${buildListQuery(params)}`, CustomerListResponseSchema);
}

export function fetchCustomer(id: string) {
  return request(`/customers/${id}`, CustomerSchema);
}

export interface QuotationLineInput {
  productId: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: z.infer<typeof VatRateSchema>;
}

export interface QuotationInput {
  customerId: string;
  warehouseId: string;
  validUntil: string;
  terms: string;
  lines: QuotationLineInput[];
}

export function fetchQuotations(params: ListParams) {
  return request(`/quotations?${buildListQuery(params)}`, QuotationListResponseSchema);
}

export function fetchQuotation(id: string) {
  return request(`/quotations/${id}`, QuotationViewSchema);
}

export function createQuotation(input: QuotationInput) {
  return request('/quotations', QuotationViewSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateQuotation(id: string, input: QuotationInput) {
  return request(`/quotations/${id}`, QuotationViewSchema, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function sendQuotation(id: string) {
  return request(`/quotations/${id}/send`, QuotationViewSchema, { method: 'POST' });
}

export function acceptQuotation(id: string) {
  return request(`/quotations/${id}/accept`, QuotationViewSchema, { method: 'POST' });
}

export function rejectQuotation(id: string) {
  return request(`/quotations/${id}/reject`, QuotationViewSchema, { method: 'POST' });
}

const ConvertToSoResponseSchema = z.object({
  quotation: QuotationViewSchema,
  salesOrder: SalesOrderViewSchema,
});

export function convertQuotationToSalesOrder(id: string) {
  return request(`/quotations/${id}/convert-to-so`, ConvertToSoResponseSchema, {
    method: 'POST',
  });
}

export function fetchSalesOrders(params: ListParams) {
  return request(`/sales-orders?${buildListQuery(params)}`, SalesOrderListResponseSchema);
}

export function fetchSalesOrder(id: string) {
  return request(`/sales-orders/${id}`, SalesOrderViewSchema);
}

export function confirmSalesOrder(id: string) {
  return request(`/sales-orders/${id}/confirm`, SalesOrderViewSchema, { method: 'POST' });
}

export function cancelSalesOrder(id: string) {
  return request(`/sales-orders/${id}/cancel`, SalesOrderViewSchema, { method: 'POST' });
}

export interface DeliverLineInput {
  soLineId: string;
  productId: string;
  deliveredQty: number;
}

const DeliverResponseSchema = z.object({
  delivery: DeliverySchema,
  salesOrder: SalesOrderViewSchema,
});

export function deliverSalesOrder(id: string, lines: DeliverLineInput[]) {
  return request(`/sales-orders/${id}/deliver`, DeliverResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ lines }),
  });
}

export function fetchDeliveries(params: ListParams) {
  return request(`/deliveries?${buildListQuery(params)}`, DeliveryListResponseSchema);
}

export function fetchDelivery(id: string) {
  return request(`/deliveries/${id}`, DeliveryViewSchema);
}

export function fetchCustomerInvoices(params: ListParams) {
  return request(`/customer-invoices?${buildListQuery(params)}`, CustomerInvoiceListResponseSchema);
}

export function fetchCustomerInvoice(id: string) {
  return request(`/customer-invoices/${id}`, CustomerInvoiceViewSchema);
}

export function createCustomerInvoice(soId: string) {
  return request('/customer-invoices', CustomerInvoiceViewSchema, {
    method: 'POST',
    body: JSON.stringify({ soId }),
  });
}

export function recordCustomerInvoicePayment(id: string) {
  return request(`/customer-invoices/${id}/record-payment`, CustomerInvoiceSchema, {
    method: 'POST',
  });
}
