import { faker } from '@faker-js/faker';
import type { Product, StockMovement } from '../entities';
import type {
  Customer,
  CustomerInvoice,
  CustomerInvoiceLine,
  Delivery,
  DeliveryLine,
  Quotation,
  SalesOrder,
  SalesOrderStatus,
} from '../sales-entities';
import type { AuditLogEntry } from '../audit-entities';
import type { JournalEntry } from '../accounting-entities';
import { computeDocumentTotals, roundVnd } from '../money';
import { generateDocumentNumber } from '../document-number';

type LifecycleOutcome =
  'draft' | 'cancelled' | 'confirmed' | 'partially_delivered' | 'delivered' | 'invoiced' | 'closed';

// COGS posts at delivery (Dr632/Cr156) but revenue only posts at invoicing
// (Dr131/Cr511) — mirroring the P2P side's GRN-vs-bill split exactly. That
// means every SO left sitting at partially_delivered/delivered has booked
// COGS with no matching revenue yet, which is correct for one order but, if
// too large a fraction of a whole *historical* 12-month snapshot lands
// there, drags the dashboard's aggregate gross margin permanently negative —
// unrealistic for a snapshot that's supposed to look like a healthy,
// mostly-settled trading history. Keeping "closed" dominant (most orders
// this old have long since been paid) with only a small delivered-not-yet-
// invoiced tail avoids that.
const OUTCOME_WEIGHTS: { outcome: LifecycleOutcome; weight: number }[] = [
  { outcome: 'draft', weight: 10 },
  { outcome: 'cancelled', weight: 5 },
  { outcome: 'confirmed', weight: 10 },
  { outcome: 'partially_delivered', weight: 8 },
  { outcome: 'delivered', weight: 7 },
  { outcome: 'invoiced', weight: 15 },
  { outcome: 'closed', weight: 45 },
];

type QuotationOutcome = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
const QUOTATION_OUTCOME_WEIGHTS: { outcome: QuotationOutcome; weight: number }[] = [
  { outcome: 'draft', weight: 20 },
  { outcome: 'sent', weight: 20 },
  { outcome: 'accepted', weight: 20 },
  { outcome: 'rejected', weight: 20 },
  { outcome: 'expired', weight: 20 },
];

export interface CommerceSeedResult {
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  deliveries: Delivery[];
  customerInvoices: CustomerInvoice[];
  journalEntries: JournalEntry[];
  auditLogEntries: AuditLogEntry[];
  stockMovements: StockMovement[];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function auditEntry(
  entityType: string,
  entityId: string,
  entityNumber: string,
  action: string,
  actorId: string,
  before: string,
  after: string,
  at: string,
): AuditLogEntry {
  return {
    id: faker.string.uuid(),
    entityType,
    entityId,
    entityNumber,
    action,
    actorId,
    before: { status: before },
    after: { status: after },
    at,
  };
}

export function generateCommerceData(
  soDrafts: SalesOrder[],
  standaloneQuotationDrafts: Quotation[],
  products: Product[],
  customers: Customer[],
): CommerceSeedResult {
  faker.seed(20260204);

  const costByProduct = new Map(products.map((product) => [product.id, product.costPrice]));
  const paymentTermsByCustomer = new Map(
    customers.map((customer) => [customer.id, customer.paymentTermsDays]),
  );

  const quotations: Quotation[] = [];
  const salesOrders: SalesOrder[] = [];
  const deliveries: Delivery[] = [];
  const customerInvoices: CustomerInvoice[] = [];
  const journalEntries: JournalEntry[] = [];
  const auditLogEntries: AuditLogEntry[] = [];
  const stockMovements: StockMovement[] = [];

  let deliverySeq = 0;
  let invoiceSeq = 0;
  let journalSeq = 0;

  // Standalone quotations: draft/sent/accepted/rejected/expired. None of
  // these convert — a converted quotation is always synthesized alongside
  // the SO it produced (below), so customer/lines/totals never disagree.
  for (const draft of standaloneQuotationDrafts) {
    const outcome = faker.helpers.weightedArrayElement(
      QUOTATION_OUTCOME_WEIGHTS.map((entry) => ({ weight: entry.weight, value: entry.outcome })),
    );
    const quoteDate = new Date(draft.quoteDate);

    if (outcome === 'draft') {
      quotations.push(draft);
      continue;
    }

    const sentAt = addDays(quoteDate, 1).toISOString();
    auditLogEntries.push(
      auditEntry(
        'quotation',
        draft.id,
        draft.number,
        'sent',
        draft.createdBy,
        'draft',
        'sent',
        sentAt,
      ),
    );

    if (outcome === 'sent') {
      quotations.push({ ...draft, status: 'sent', sentAt });
      continue;
    }

    const decidedAt = addDays(
      new Date(sentAt),
      faker.number.int({ min: 1, max: 10 }),
    ).toISOString();
    auditLogEntries.push(
      auditEntry('quotation', draft.id, draft.number, outcome, 'sales', 'sent', outcome, decidedAt),
    );
    quotations.push({ ...draft, status: outcome, sentAt, decidedAt });
  }

  // Sales orders: draft/cancelled/confirmed/partially_delivered/delivered/invoiced/closed.
  for (const draft of soDrafts) {
    const outcome = faker.helpers.weightedArrayElement(
      OUTCOME_WEIGHTS.map((entry) => ({ weight: entry.weight, value: entry.outcome })),
    );
    const orderDate = new Date(draft.orderDate);
    const year = orderDate.getFullYear();

    if (outcome === 'draft') {
      salesOrders.push(draft);
      continue;
    }

    if (outcome === 'cancelled') {
      salesOrders.push({ ...draft, status: 'cancelled' });
      auditLogEntries.push(
        auditEntry(
          'sales_order',
          draft.id,
          draft.number,
          'cancelled',
          'sales',
          'draft',
          'cancelled',
          orderDate.toISOString(),
        ),
      );
      continue;
    }

    const confirmedAt = addDays(orderDate, 1).toISOString();
    auditLogEntries.push(
      auditEntry(
        'sales_order',
        draft.id,
        draft.number,
        'confirmed',
        'sales',
        'draft',
        'confirmed',
        confirmedAt,
      ),
    );
    let so: SalesOrder = { ...draft, status: 'confirmed', confirmedAt };

    // ~40% of confirmed-and-beyond SOs get a matching quotation, synthesized
    // from the SO's own data so it can never disagree with what it produced.
    if (faker.number.int({ min: 1, max: 10 }) <= 4) {
      const quoteDate = addDays(orderDate, -faker.number.int({ min: 1, max: 7 }));
      const quotationId = faker.string.uuid();
      const quotationNumber = generateDocumentNumber(
        'QUO',
        quoteDate.getFullYear(),
        quotations.length + 1,
      );
      quotations.push({
        id: quotationId,
        number: quotationNumber,
        customerId: so.customerId,
        warehouseId: so.warehouseId,
        status: 'converted',
        quoteDate: quoteDate.toISOString(),
        validUntil: addDays(quoteDate, 30).toISOString(),
        terms: so.terms,
        lines: so.lines.map((line) => ({ ...line, id: faker.string.uuid() })),
        subtotal: so.subtotal,
        vatTotal: so.vatTotal,
        grandTotal: so.grandTotal,
        createdBy: so.createdBy,
        createdAt: quoteDate.toISOString(),
        sentAt: addDays(quoteDate, 1).toISOString(),
        decidedAt: confirmedAt,
        convertedToSoId: so.id,
      });
      so = { ...so, quotationId };
    }

    if (
      outcome === 'partially_delivered' ||
      outcome === 'delivered' ||
      outcome === 'invoiced' ||
      outcome === 'closed'
    ) {
      const isPartial = outcome === 'partially_delivered';
      const deliveredAt = addDays(
        new Date(confirmedAt),
        faker.number.int({ min: 1, max: 5 }),
      ).toISOString();

      const deliveryLines: DeliveryLine[] = so.lines.map((line) => ({
        id: faker.string.uuid(),
        soLineId: line.id,
        productId: line.productId,
        deliveredQty: isPartial
          ? Math.max(1, Math.round(line.qty * faker.number.float({ min: 0.3, max: 0.8 })))
          : line.qty,
      }));

      deliverySeq += 1;
      const deliveryNumber = generateDocumentNumber('DO', year, deliverySeq);
      const delivery: Delivery = {
        id: faker.string.uuid(),
        number: deliveryNumber,
        soId: so.id,
        warehouseId: so.warehouseId,
        lines: deliveryLines,
        deliveredAt,
        deliveredBy: 'warehouse',
      };
      deliveries.push(delivery);

      let cogsValue = 0;
      for (const line of deliveryLines) {
        stockMovements.push({
          id: faker.string.uuid(),
          productId: line.productId,
          warehouseId: so.warehouseId,
          type: 'out',
          quantity: line.deliveredQty,
          reference: deliveryNumber,
          occurredAt: deliveredAt,
        });
        cogsValue += roundVnd(line.deliveredQty * (costByProduct.get(line.productId) ?? 0));
      }

      journalSeq += 1;
      journalEntries.push({
        id: faker.string.uuid(),
        number: generateDocumentNumber('JE', year, journalSeq),
        date: deliveredAt,
        docType: 'delivery',
        docId: delivery.id,
        docNumber: delivery.number,
        description: `Xuất kho theo ${delivery.number}`,
        lines: [
          { accountCode: '632', accountName: 'Giá vốn hàng bán', debit: cogsValue, credit: 0 },
          { accountCode: '156', accountName: 'Hàng hóa', debit: 0, credit: cogsValue },
        ],
        createdAt: deliveredAt,
      });

      const deliveredStatus: SalesOrderStatus = isPartial ? 'partially_delivered' : 'delivered';
      so = { ...so, status: deliveredStatus };
      auditLogEntries.push(
        auditEntry(
          'sales_order',
          so.id,
          so.number,
          'delivered',
          'warehouse',
          'confirmed',
          deliveredStatus,
          deliveredAt,
        ),
      );

      if (outcome === 'invoiced' || outcome === 'closed') {
        const issueDate = addDays(
          new Date(deliveredAt),
          faker.number.int({ min: 1, max: 3 }),
        ).toISOString();
        const invoiceLines: CustomerInvoiceLine[] = deliveryLines.map((deliveryLine) => {
          const soLine = so.lines.find((line) => line.id === deliveryLine.soLineId);
          const unitPrice = soLine?.unitPrice ?? 0;
          const vatRate = soLine?.vatRate ?? 0;
          return {
            id: faker.string.uuid(),
            soLineId: deliveryLine.soLineId,
            productId: deliveryLine.productId,
            qty: deliveryLine.deliveredQty,
            unitPrice,
            vatRate,
            lineTotal: roundVnd(deliveryLine.deliveredQty * unitPrice),
          };
        });
        const invoiceTotals = computeDocumentTotals(invoiceLines);
        invoiceSeq += 1;
        const invoiceNumber = generateDocumentNumber('INV', year, invoiceSeq);
        const paymentTermsDays = paymentTermsByCustomer.get(so.customerId) ?? 30;
        const dueDate = addDays(new Date(issueDate), paymentTermsDays).toISOString();

        let invoiceStatus: 'unpaid' | 'paid' = 'unpaid';
        let paidAt: string | undefined;
        if (outcome === 'closed') {
          paidAt = addDays(
            new Date(issueDate),
            faker.number.int({ min: 1, max: paymentTermsDays + 15 }),
          ).toISOString();
          invoiceStatus = 'paid';
        }

        const invoice: CustomerInvoice = {
          id: faker.string.uuid(),
          number: invoiceNumber,
          symbol: `1C${String(year).slice(-2)}TAA`,
          customerId: so.customerId,
          soId: so.id,
          lines: invoiceLines,
          subtotal: invoiceTotals.subtotal,
          vatTotal: invoiceTotals.vatTotal,
          grandTotal: invoiceTotals.grandTotal,
          status: invoiceStatus,
          issueDate,
          dueDate,
          createdAt: issueDate,
          ...(paidAt ? { paidAt } : {}),
        };
        customerInvoices.push(invoice);

        journalSeq += 1;
        journalEntries.push({
          id: faker.string.uuid(),
          number: generateDocumentNumber('JE', year, journalSeq),
          date: issueDate,
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
          createdAt: issueDate,
        });

        so = { ...so, status: 'invoiced' };
        auditLogEntries.push(
          auditEntry(
            'sales_order',
            so.id,
            so.number,
            'invoiced',
            'sales',
            'delivered',
            'invoiced',
            issueDate,
          ),
        );

        if (outcome === 'closed' && paidAt) {
          journalSeq += 1;
          journalEntries.push({
            id: faker.string.uuid(),
            number: generateDocumentNumber('JE', year, journalSeq),
            date: paidAt,
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
            createdAt: paidAt,
          });
          auditLogEntries.push(
            auditEntry(
              'customer_invoice',
              invoice.id,
              invoice.number,
              'paid',
              'accountant',
              'unpaid',
              'paid',
              paidAt,
            ),
          );
          so = { ...so, status: 'closed' };
        }
      }
    }

    salesOrders.push(so);
  }

  return {
    quotations,
    salesOrders,
    deliveries,
    customerInvoices,
    journalEntries,
    auditLogEntries,
    stockMovements,
  };
}
