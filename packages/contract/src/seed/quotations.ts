import { faker } from '@faker-js/faker';
import type { Product, Warehouse } from '../entities';
import type { Customer, Quotation, QuotationLine } from '../sales-entities';
import type { VatRate } from '../purchasing-entities';
import { computeDocumentTotals, computeLineTotal } from '../money';
import { generateDocumentNumber } from '../document-number';

const VAT_RATES: VatRate[] = [0, 5, 8, 10];
const TERMS = ['Báo giá có hiệu lực 15 ngày', 'Báo giá có hiệu lực 30 ngày', 'Giá đã bao gồm VAT'];

/**
 * Standalone quotation drafts — these never convert to a sales order (the
 * commerce orchestrator synthesizes separate, already-linked quotations for
 * SOs that did convert, so a quotation's customer/lines never disagree with
 * the SO it claims to have produced). These exist purely to populate the
 * Quotations list with in-progress/closed-out quotes.
 */
export function generateStandaloneQuotationDrafts(
  count: number,
  products: Product[],
  customers: Customer[],
  warehouses: Warehouse[],
): Quotation[] {
  faker.seed(20260203);
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 6);

  const quotations: Quotation[] = [];
  for (let i = 0; i < count; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const warehouse = faker.helpers.arrayElement(warehouses);
    const quoteDate = faker.date.between({ from: start, to: now });
    const validUntil = new Date(quoteDate);
    validUntil.setDate(validUntil.getDate() + 30);

    const lineCount = faker.number.int({ min: 1, max: 5 });
    const lineProducts = faker.helpers.arrayElements(products, lineCount);
    const lines: QuotationLine[] = lineProducts.map((product) => {
      const qty = faker.number.int({ min: 5, max: 150 });
      const unitPrice = product.salePrice;
      const discountPct = faker.helpers.arrayElement([0, 0, 5, 10]);
      const vatRate = faker.helpers.arrayElement(VAT_RATES);
      return {
        id: faker.string.uuid(),
        productId: product.id,
        qty,
        unitPrice,
        discountPct,
        vatRate,
        lineTotal: computeLineTotal(qty, unitPrice, discountPct),
      };
    });

    const totals = computeDocumentTotals(lines);

    quotations.push({
      id: `quo-${i + 1}`,
      number: generateDocumentNumber('QUO', quoteDate.getFullYear(), i + 1),
      customerId: customer.id,
      warehouseId: warehouse.id,
      status: 'draft',
      quoteDate: quoteDate.toISOString(),
      validUntil: validUntil.toISOString(),
      terms: faker.helpers.arrayElement(TERMS),
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'sales',
      createdAt: quoteDate.toISOString(),
    });
  }
  return quotations;
}
