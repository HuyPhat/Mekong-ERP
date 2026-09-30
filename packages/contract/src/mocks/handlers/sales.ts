import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  customerInvoicesStore,
  customersStore,
  deliveriesStore,
  journalEntriesStore,
  productsStore,
  quotationsStore,
  salesOrdersStore,
  stockLevelsStore,
  stockMovementsStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';
import type { StockMovement } from '../../entities';
import { VatRateSchema } from '../../purchasing-entities';
import type {
  CustomerInvoice,
  CustomerInvoiceLine,
  Delivery,
  DeliveryLine,
  Quotation,
  QuotationLine,
  SalesOrder,
  SalesOrderLine,
} from '../../sales-entities';
import { computeDocumentTotals, computeLineTotal, roundVnd } from '../../money';
import { generateDocumentNumber } from '../../document-number';
import { writeAudit } from './audit';
import { broadcastEvent } from '../ws';

function currentYear(): number {
  return new Date().getFullYear();
}

function nextNumber(prefix: string, existingNumbers: string[]): string {
  const sequence = existingNumbers.length + 1;
  return generateDocumentNumber(prefix, currentYear(), sequence);
}

function customerName(customerId: string): string {
  return customersStore.get(customerId)?.name ?? '';
}

function quotationView(quotation: Quotation) {
  return { ...quotation, customerName: customerName(quotation.customerId) };
}

function soView(so: SalesOrder) {
  return { ...so, customerName: customerName(so.customerId) };
}

const CreateLineSchema = z.object({
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().min(0).max(100),
  vatRate: VatRateSchema,
});

const CreateQuotationSchema = z.object({
  customerId: z.string(),
  warehouseId: z.string(),
  validUntil: z.string(),
  terms: z.string(),
  lines: z.array(CreateLineSchema).min(1),
});

const CreateSalesOrderSchema = z.object({
  customerId: z.string(),
  warehouseId: z.string(),
  deliveryDate: z.string(),
  terms: z.string(),
  lines: z.array(CreateLineSchema).min(1),
});

function buildLines(input: z.infer<typeof CreateLineSchema>[]): (SalesOrderLine | QuotationLine)[] {
  return input.map((line) => ({
    id: crypto.randomUUID(),
    productId: line.productId,
    qty: line.qty,
    unitPrice: line.unitPrice,
    discountPct: line.discountPct,
    vatRate: line.vatRate,
    lineTotal: computeLineTotal(line.qty, line.unitPrice, line.discountPct),
  }));
}

const DeliverLineSchema = z.object({
  soLineId: z.string(),
  productId: z.string(),
  deliveredQty: z.number().int().positive(),
});
const DeliverSchema = z.object({ lines: z.array(DeliverLineSchema).min(1) });

function cumulativeDeliveredByProduct(soId: string): Map<string, number> {
  const byProduct = new Map<string, number>();
  for (const delivery of deliveriesStore.list()) {
    if (delivery.soId !== soId) continue;
    for (const line of delivery.lines) {
      byProduct.set(line.productId, (byProduct.get(line.productId) ?? 0) + line.deliveredQty);
    }
  }
  return byProduct;
}

function isFullyDelivered(so: SalesOrder, deliveredByProduct: Map<string, number>): boolean {
  return so.lines.every((line) => (deliveredByProduct.get(line.productId) ?? 0) >= line.qty);
}

export const salesHandlers = [
  http.get('/api/customers', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [{ field: 'name', direction: 'asc' }]);
    let items = customersStore.list();
    items = items.filter((customer) => matchesSearch(customer, q, ['name', 'code', 'taxCode']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/customers/:id', async ({ params }) => {
    await ensureSeeded();
    const customer = customersStore.get(String(params.id));
    if (!customer) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Customer not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(customer);
  }),

  http.get('/api/quotations', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'quoteDate', direction: 'desc' },
    ]);
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    let items = quotationsStore.list().map(quotationView);
    if (statuses.length > 0)
      items = items.filter((quotation) => statuses.includes(quotation.status));
    items = items.filter((quotation) => matchesSearch(quotation, q, ['number', 'customerName']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/quotations/:id', async ({ params }) => {
    await ensureSeeded();
    const quotation = quotationsStore.get(String(params.id));
    if (!quotation) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(quotationView(quotation));
  }),

  http.post('/api/quotations', async ({ request }) => {
    await ensureSeeded();
    const body: unknown = await request.json();
    const parsed = CreateQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quotation',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const lines = buildLines(parsed.data.lines) as QuotationLine[];
    const totals = computeDocumentTotals(lines);
    const quotation: Quotation = {
      id: crypto.randomUUID(),
      number: nextNumber(
        'QUO',
        quotationsStore.list().map((existing) => existing.number),
      ),
      customerId: parsed.data.customerId,
      warehouseId: parsed.data.warehouseId,
      status: 'draft',
      quoteDate: now,
      validUntil: parsed.data.validUntil,
      terms: parsed.data.terms,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'sales',
      createdAt: now,
    };
    await quotationsStore.put(quotation);
    await writeAudit(
      'quotation',
      quotation.id,
      quotation.number,
      'created',
      'sales',
      undefined,
      'draft',
      now,
    );
    return HttpResponse.json(quotationView(quotation), { status: 201 });
  }),

  http.patch('/api/quotations/:id', async ({ params, request }) => {
    await ensureSeeded();
    const existing = quotationsStore.get(String(params.id));
    if (!existing) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    if (existing.status !== 'draft') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only draft quotations can be edited' },
        { status: 409 },
      );
    }
    const body: unknown = await request.json();
    const parsed = CreateQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quotation',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const lines = buildLines(parsed.data.lines) as QuotationLine[];
    const totals = computeDocumentTotals(lines);
    const updated: Quotation = {
      ...existing,
      customerId: parsed.data.customerId,
      warehouseId: parsed.data.warehouseId,
      validUntil: parsed.data.validUntil,
      terms: parsed.data.terms,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
    };
    await quotationsStore.put(updated);
    return HttpResponse.json(quotationView(updated));
  }),

  http.post('/api/quotations/:id/send', async ({ params }) => {
    await ensureSeeded();
    const quotation = quotationsStore.get(String(params.id));
    if (!quotation) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    if (quotation.status !== 'draft') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only draft quotations can be sent' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: Quotation = { ...quotation, status: 'sent', sentAt: now };
    await quotationsStore.put(updated);
    await writeAudit(
      'quotation',
      quotation.id,
      quotation.number,
      'sent',
      'sales',
      'draft',
      'sent',
      now,
    );
    return HttpResponse.json(quotationView(updated));
  }),

  http.post('/api/quotations/:id/accept', async ({ params }) => {
    await ensureSeeded();
    const quotation = quotationsStore.get(String(params.id));
    if (!quotation) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    if (quotation.status !== 'sent') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only sent quotations can be accepted' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: Quotation = { ...quotation, status: 'accepted', decidedAt: now };
    await quotationsStore.put(updated);
    await writeAudit(
      'quotation',
      quotation.id,
      quotation.number,
      'accepted',
      'sales',
      'sent',
      'accepted',
      now,
    );
    return HttpResponse.json(quotationView(updated));
  }),

  http.post('/api/quotations/:id/reject', async ({ params }) => {
    await ensureSeeded();
    const quotation = quotationsStore.get(String(params.id));
    if (!quotation) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    if (quotation.status !== 'sent') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only sent quotations can be rejected' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: Quotation = { ...quotation, status: 'rejected', decidedAt: now };
    await quotationsStore.put(updated);
    await writeAudit(
      'quotation',
      quotation.id,
      quotation.number,
      'rejected',
      'sales',
      'sent',
      'rejected',
      now,
    );
    return HttpResponse.json(quotationView(updated));
  }),

  http.post('/api/quotations/:id/convert-to-so', async ({ params }) => {
    await ensureSeeded();
    const quotation = quotationsStore.get(String(params.id));
    if (!quotation) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Quotation not found' },
        { status: 404 },
      );
    }
    if (quotation.status !== 'accepted') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only accepted quotations can be converted' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const so: SalesOrder = {
      id: crypto.randomUUID(),
      number: nextNumber(
        'SO',
        salesOrdersStore.list().map((existing) => existing.number),
      ),
      customerId: quotation.customerId,
      warehouseId: quotation.warehouseId,
      status: 'confirmed',
      orderDate: now,
      deliveryDate: quotation.validUntil,
      terms: quotation.terms,
      lines: quotation.lines.map((line) => ({ ...line, id: crypto.randomUUID() })),
      subtotal: quotation.subtotal,
      vatTotal: quotation.vatTotal,
      grandTotal: quotation.grandTotal,
      quotationId: quotation.id,
      createdBy: 'sales',
      createdAt: now,
      confirmedAt: now,
    };
    await salesOrdersStore.put(so);
    const updatedQuotation: Quotation = {
      ...quotation,
      status: 'converted',
      convertedToSoId: so.id,
    };
    await quotationsStore.put(updatedQuotation);
    await writeAudit(
      'quotation',
      quotation.id,
      quotation.number,
      'converted',
      'sales',
      'accepted',
      'converted',
      now,
    );
    await writeAudit(
      'sales_order',
      so.id,
      so.number,
      'created',
      'sales',
      undefined,
      'confirmed',
      now,
    );
    return HttpResponse.json(
      { quotation: quotationView(updatedQuotation), salesOrder: soView(so) },
      { status: 201 },
    );
  }),

  http.get('/api/sales-orders', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'orderDate', direction: 'desc' },
    ]);
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const customerId = url.searchParams.get('filter[customerId]');

    let items = salesOrdersStore.list().map(soView);
    if (statuses.length > 0) items = items.filter((so) => statuses.includes(so.status));
    if (customerId) items = items.filter((so) => so.customerId === customerId);
    items = items.filter((so) => matchesSearch(so, q, ['number', 'customerName']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/sales-orders/:id', async ({ params }) => {
    await ensureSeeded();
    const so = salesOrdersStore.get(String(params.id));
    if (!so) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Sales order not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(soView(so));
  }),

  http.post('/api/sales-orders', async ({ request }) => {
    await ensureSeeded();
    const body: unknown = await request.json();
    const parsed = CreateSalesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sales order',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const lines = buildLines(parsed.data.lines) as SalesOrderLine[];
    const totals = computeDocumentTotals(lines);
    const so: SalesOrder = {
      id: crypto.randomUUID(),
      number: nextNumber(
        'SO',
        salesOrdersStore.list().map((existing) => existing.number),
      ),
      customerId: parsed.data.customerId,
      warehouseId: parsed.data.warehouseId,
      status: 'draft',
      orderDate: now,
      deliveryDate: parsed.data.deliveryDate,
      terms: parsed.data.terms,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'sales',
      createdAt: now,
    };
    await salesOrdersStore.put(so);
    await writeAudit('sales_order', so.id, so.number, 'created', 'sales', undefined, 'draft', now);
    return HttpResponse.json(soView(so), { status: 201 });
  }),

  http.post('/api/sales-orders/:id/confirm', async ({ params }) => {
    await ensureSeeded();
    const so = salesOrdersStore.get(String(params.id));
    if (!so) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Sales order not found' },
        { status: 404 },
      );
    }
    if (so.status !== 'draft') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only draft sales orders can be confirmed' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: SalesOrder = { ...so, status: 'confirmed', confirmedAt: now };
    await salesOrdersStore.put(updated);
    await writeAudit(
      'sales_order',
      so.id,
      so.number,
      'confirmed',
      'sales',
      'draft',
      'confirmed',
      now,
    );
    return HttpResponse.json(soView(updated));
  }),

  http.post('/api/sales-orders/:id/cancel', async ({ params }) => {
    await ensureSeeded();
    const so = salesOrdersStore.get(String(params.id));
    if (!so) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Sales order not found' },
        { status: 404 },
      );
    }
    if (so.status !== 'draft' && so.status !== 'confirmed') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'This sales order cannot be cancelled' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: SalesOrder = { ...so, status: 'cancelled' };
    await salesOrdersStore.put(updated);
    await writeAudit(
      'sales_order',
      so.id,
      so.number,
      'cancelled',
      'sales',
      so.status,
      'cancelled',
      now,
    );
    return HttpResponse.json(soView(updated));
  }),

  http.post('/api/sales-orders/:id/deliver', async ({ params, request }) => {
    await ensureSeeded();
    const so = salesOrdersStore.get(String(params.id));
    if (!so) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Sales order not found' },
        { status: 404 },
      );
    }
    if (so.status !== 'confirmed' && so.status !== 'partially_delivered') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only confirmed sales orders can be delivered' },
        { status: 409 },
      );
    }
    const body: unknown = await request.json();
    const parsed = DeliverSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid delivery',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();
    const deliveryLines: DeliveryLine[] = parsed.data.lines.map((line) => ({
      id: crypto.randomUUID(),
      soLineId: line.soLineId,
      productId: line.productId,
      deliveredQty: line.deliveredQty,
    }));
    const deliveryNumber = nextNumber(
      'DO',
      deliveriesStore.list().map((existing) => existing.number),
    );
    const delivery: Delivery = {
      id: crypto.randomUUID(),
      number: deliveryNumber,
      soId: so.id,
      warehouseId: so.warehouseId,
      lines: deliveryLines,
      deliveredAt: now,
      deliveredBy: 'warehouse',
    };
    await deliveriesStore.put(delivery);

    let cogsValue = 0;
    for (const line of deliveryLines) {
      const movement: StockMovement = {
        id: crypto.randomUUID(),
        productId: line.productId,
        warehouseId: so.warehouseId,
        type: 'out',
        quantity: line.deliveredQty,
        reference: deliveryNumber,
        occurredAt: now,
      };
      await stockMovementsStore.put(movement);

      const levelId = `${line.productId}:${so.warehouseId}`;
      const existingLevel = stockLevelsStore.get(levelId);
      const quantityOnHand = (existingLevel?.quantityOnHand ?? 0) - line.deliveredQty;
      await stockLevelsStore.put({
        id: levelId,
        productId: line.productId,
        warehouseId: so.warehouseId,
        quantityOnHand,
      });
      broadcastEvent({
        type: 'stock.changed',
        productId: line.productId,
        warehouseId: so.warehouseId,
        quantityOnHand,
      });

      const costPrice = productsStore.get(line.productId)?.costPrice ?? 0;
      cogsValue += roundVnd(line.deliveredQty * costPrice);
    }

    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
      docType: 'delivery',
      docId: delivery.id,
      docNumber: delivery.number,
      description: `Xuất kho theo ${delivery.number}`,
      lines: [
        { accountCode: '632', accountName: 'Giá vốn hàng bán', debit: cogsValue, credit: 0 },
        { accountCode: '156', accountName: 'Hàng hóa', debit: 0, credit: cogsValue },
      ],
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'delivery',
      docId: delivery.id,
      docNumber: delivery.number,
    });

    const deliveredByProduct = cumulativeDeliveredByProduct(so.id);
    const fullyDelivered = isFullyDelivered(so, deliveredByProduct);
    const newStatus = fullyDelivered ? 'delivered' : 'partially_delivered';
    const updated: SalesOrder = { ...so, status: newStatus };
    await salesOrdersStore.put(updated);
    await writeAudit(
      'sales_order',
      so.id,
      so.number,
      'delivered',
      'warehouse',
      so.status,
      newStatus,
      now,
    );

    return HttpResponse.json({ delivery, salesOrder: soView(updated) }, { status: 201 });
  }),

  http.get('/api/deliveries', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'deliveredAt', direction: 'desc' },
    ]);
    const soId = url.searchParams.get('filter[soId]');
    const salesOrders = new Map(salesOrdersStore.list().map((so) => [so.id, so]));
    let items = deliveriesStore.list().map((delivery) => {
      const so = salesOrders.get(delivery.soId);
      return {
        ...delivery,
        soNumber: so?.number ?? '',
        customerName: so ? customerName(so.customerId) : '',
      };
    });
    if (soId) items = items.filter((delivery) => delivery.soId === soId);
    items = items.filter((delivery) =>
      matchesSearch(delivery, q, ['number', 'soNumber', 'customerName']),
    );
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/deliveries/:id', async ({ params }) => {
    await ensureSeeded();
    const delivery = deliveriesStore.get(String(params.id));
    if (!delivery) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Delivery not found' },
        { status: 404 },
      );
    }
    const so = salesOrdersStore.get(delivery.soId);
    return HttpResponse.json({
      ...delivery,
      soNumber: so?.number ?? '',
      customerName: so ? customerName(so.customerId) : '',
    });
  }),

  http.get('/api/customer-invoices', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'createdAt', direction: 'desc' },
    ]);
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const soId = url.searchParams.get('filter[soId]');
    const salesOrders = new Map(salesOrdersStore.list().map((so) => [so.id, so]));
    let items = customerInvoicesStore.list().map((invoice) => {
      const so = salesOrders.get(invoice.soId);
      return {
        ...invoice,
        soNumber: so?.number ?? '',
        customerName: customerName(invoice.customerId),
      };
    });
    if (statuses.length > 0) items = items.filter((invoice) => statuses.includes(invoice.status));
    if (soId) items = items.filter((invoice) => invoice.soId === soId);
    items = items.filter((invoice) =>
      matchesSearch(invoice, q, ['number', 'soNumber', 'customerName']),
    );
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/customer-invoices/:id', async ({ params }) => {
    await ensureSeeded();
    const invoice = customerInvoicesStore.get(String(params.id));
    if (!invoice) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 },
      );
    }
    const so = salesOrdersStore.get(invoice.soId);
    return HttpResponse.json({
      ...invoice,
      soNumber: so?.number ?? '',
      customerName: customerName(invoice.customerId),
    });
  }),

  http.post('/api/customer-invoices', async ({ request }) => {
    await ensureSeeded();
    const body: unknown = await request.json();
    const parsed = z.object({ soId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'A sales order id is required' },
        { status: 422 },
      );
    }
    const so = salesOrdersStore.get(parsed.data.soId);
    if (!so) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Sales order not found' },
        { status: 404 },
      );
    }
    if (so.status !== 'delivered' && so.status !== 'partially_delivered') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'The sales order must have delivered quantity before invoicing',
        },
        { status: 409 },
      );
    }
    const deliveredByProduct = cumulativeDeliveredByProduct(so.id);
    const customer = customersStore.get(so.customerId);
    const now = new Date().toISOString();

    const invoiceLines: CustomerInvoiceLine[] = so.lines
      .filter((line) => (deliveredByProduct.get(line.productId) ?? 0) > 0)
      .map((line) => {
        const qty = deliveredByProduct.get(line.productId) ?? 0;
        return {
          id: crypto.randomUUID(),
          soLineId: line.id,
          productId: line.productId,
          qty,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          lineTotal: roundVnd(qty * line.unitPrice),
        };
      });
    const totals = computeDocumentTotals(invoiceLines);
    const year = currentYear();
    const invoiceNumber = nextNumber(
      'INV',
      customerInvoicesStore.list().map((existing) => existing.number),
    );
    const paymentTermsDays = customer?.paymentTermsDays ?? 30;
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const invoice: CustomerInvoice = {
      id: crypto.randomUUID(),
      number: invoiceNumber,
      symbol: `1C${String(year).slice(-2)}TAA`,
      customerId: so.customerId,
      soId: so.id,
      lines: invoiceLines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      status: 'unpaid',
      issueDate: now,
      dueDate: dueDate.toISOString(),
      createdAt: now,
    };
    await customerInvoicesStore.put(invoice);

    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
      docType: 'customer_invoice',
      docId: invoice.id,
      docNumber: invoice.number,
      description: `Xuất hóa đơn ${invoice.number}`,
      lines: [
        {
          accountCode: '131',
          accountName: 'Phải thu khách hàng',
          debit: invoice.grandTotal,
          credit: 0,
        },
        {
          accountCode: '511',
          accountName: 'Doanh thu bán hàng',
          debit: 0,
          credit: invoice.subtotal,
        },
        {
          accountCode: '3331',
          accountName: 'Thuế GTGT đầu ra',
          debit: 0,
          credit: invoice.vatTotal,
        },
      ],
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'customer_invoice',
      docId: invoice.id,
      docNumber: invoice.number,
    });

    const updatedSo: SalesOrder = { ...so, status: 'invoiced' };
    await salesOrdersStore.put(updatedSo);
    await writeAudit(
      'customer_invoice',
      invoice.id,
      invoice.number,
      'created',
      'sales',
      undefined,
      'unpaid',
      now,
    );

    return HttpResponse.json(
      { ...invoice, soNumber: so.number, customerName: customerName(so.customerId) },
      { status: 201 },
    );
  }),

  http.post('/api/customer-invoices/:id/record-payment', async ({ params }) => {
    await ensureSeeded();
    const invoice = customerInvoicesStore.get(String(params.id));
    if (!invoice) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 },
      );
    }
    if (invoice.status !== 'unpaid') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only unpaid invoices can be recorded as paid' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: CustomerInvoice = { ...invoice, status: 'paid', paidAt: now };
    await customerInvoicesStore.put(updated);

    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
      docType: 'customer_payment',
      docId: invoice.id,
      docNumber: invoice.number,
      description: `Thu tiền ${invoice.number}`,
      lines: [
        {
          accountCode: '112',
          accountName: 'Tiền gửi ngân hàng',
          debit: invoice.grandTotal,
          credit: 0,
        },
        {
          accountCode: '131',
          accountName: 'Phải thu khách hàng',
          debit: 0,
          credit: invoice.grandTotal,
        },
      ],
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'customer_payment',
      docId: invoice.id,
      docNumber: invoice.number,
    });

    const so = salesOrdersStore.get(invoice.soId);
    if (so) {
      await salesOrdersStore.put({ ...so, status: 'closed' });
    }
    await writeAudit(
      'customer_invoice',
      invoice.id,
      invoice.number,
      'paid',
      'accountant',
      invoice.status,
      'paid',
      now,
    );
    return HttpResponse.json(updated);
  }),
];
