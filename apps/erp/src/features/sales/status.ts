import type { TFunction } from 'i18next';
import type { StatusBadgeTone } from '@mekong-erp/ui';
import type {
  CustomerInvoiceStatus,
  QuotationStatus,
  SalesOrderStatus,
} from '@mekong-erp/contract';

const QUOTATION_STATUS_TONE: Record<QuotationStatus, StatusBadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'warning',
  converted: 'success',
};

export function quotationStatusTone(status: QuotationStatus): StatusBadgeTone {
  return QUOTATION_STATUS_TONE[status];
}

export function quotationStatusLabel(t: TFunction, status: QuotationStatus): string {
  return t(`sales.quotations.status.${status}`);
}

const SO_STATUS_TONE: Record<SalesOrderStatus, StatusBadgeTone> = {
  draft: 'neutral',
  confirmed: 'info',
  partially_delivered: 'info',
  delivered: 'success',
  invoiced: 'success',
  closed: 'neutral',
  cancelled: 'destructive',
};

export function soStatusTone(status: SalesOrderStatus): StatusBadgeTone {
  return SO_STATUS_TONE[status];
}

export function soStatusLabel(t: TFunction, status: SalesOrderStatus): string {
  return t(`sales.orders.status.${status}`);
}

const INVOICE_STATUS_TONE: Record<CustomerInvoiceStatus, StatusBadgeTone> = {
  unpaid: 'warning',
  paid: 'success',
  cancelled: 'destructive',
};

export function invoiceStatusTone(status: CustomerInvoiceStatus): StatusBadgeTone {
  return INVOICE_STATUS_TONE[status];
}

export function invoiceStatusLabel(t: TFunction, status: CustomerInvoiceStatus): string {
  return t(`sales.invoices.status.${status}`);
}

/** Unpaid + past due date — a derived display state, never stored (see CustomerInvoiceStatusSchema). */
export function isInvoiceOverdue(status: CustomerInvoiceStatus, dueDate: string): boolean {
  return status === 'unpaid' && new Date(dueDate).getTime() < Date.now();
}
