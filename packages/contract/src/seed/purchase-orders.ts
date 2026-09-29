import { faker } from '@faker-js/faker';
import type { Product, Warehouse } from '../entities';
import type { Supplier } from '../purchasing-entities';
import type { PurchaseOrder, PurchaseOrderLine, VatRate } from '../purchasing-entities';
import { computeDocumentTotals, computeLineTotal } from '../money';
import { generateDocumentNumber } from '../document-number';

const VAT_RATES: VatRate[] = [0, 5, 8, 10];
const TERMS = [
  'Thanh toán trong 30 ngày',
  'Thanh toán trong 45 ngày',
  'Thanh toán khi nhận hàng',
  'Chuyển khoản 50% trước',
];

/** Draft-shaped POs with realistic lines/totals — the seed orchestrator then progresses each through its lifecycle. */
export function generatePurchaseOrderDrafts(
  count: number,
  products: Product[],
  suppliers: Supplier[],
  warehouses: Warehouse[],
): PurchaseOrder[] {
  faker.seed(20260105);
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);

  const orders: PurchaseOrder[] = [];
  for (let i = 0; i < count; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const warehouse = faker.helpers.arrayElement(warehouses);
    const orderDate = faker.date.between({ from: start, to: now });
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 3, max: 21 }));

    const lineCount = faker.number.int({ min: 1, max: 8 });
    const lineProducts = faker.helpers.arrayElements(products, lineCount);
    const lines: PurchaseOrderLine[] = lineProducts.map((product) => {
      const qty = faker.number.int({ min: 10, max: 500 });
      const unitPrice = product.costPrice;
      const discountPct = faker.helpers.arrayElement([0, 0, 0, 2, 5]);
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

    orders.push({
      id: `po-${i + 1}`,
      number: generateDocumentNumber('PO', orderDate.getFullYear(), i + 1),
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      status: 'draft',
      orderDate: orderDate.toISOString(),
      deliveryDate: deliveryDate.toISOString(),
      terms: faker.helpers.arrayElement(TERMS),
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'purchasing',
      createdAt: orderDate.toISOString(),
    });
  }
  return orders;
}
