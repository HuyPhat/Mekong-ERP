import { faker } from '@faker-js/faker';
import type { Product, Warehouse } from '../entities';
import type { Customer } from '../sales-entities';
import type { SalesOrder, SalesOrderLine } from '../sales-entities';
import type { VatRate } from '../purchasing-entities';
import { computeDocumentTotals, computeLineTotal } from '../money';
import { generateDocumentNumber } from '../document-number';

const VAT_RATES: VatRate[] = [0, 5, 8, 10];
const TERMS = [
  'Thanh toán trong 15 ngày',
  'Thanh toán trong 30 ngày',
  'Thanh toán khi nhận hàng',
  'Công nợ theo hợp đồng phân phối',
];

/** Draft-shaped SOs with realistic lines/totals — the commerce orchestrator then progresses each through its lifecycle. */
export function generateSalesOrderDrafts(
  count: number,
  products: Product[],
  customers: Customer[],
  warehouses: Warehouse[],
): SalesOrder[] {
  faker.seed(20260202);
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);

  const orders: SalesOrder[] = [];
  for (let i = 0; i < count; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const warehouse = faker.helpers.arrayElement(warehouses);
    const orderDate = faker.date.between({ from: start, to: now });
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 2, max: 14 }));

    const lineCount = faker.number.int({ min: 1, max: 6 });
    const lineProducts = faker.helpers.arrayElements(products, lineCount);
    const lines: SalesOrderLine[] = lineProducts.map((product) => {
      const qty = faker.number.int({ min: 5, max: 200 });
      const unitPrice = product.salePrice;
      const discountPct = faker.helpers.arrayElement([0, 0, 0, 3, 5, 10]);
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
      id: `so-${i + 1}`,
      number: generateDocumentNumber('SO', orderDate.getFullYear(), i + 1),
      customerId: customer.id,
      warehouseId: warehouse.id,
      status: 'draft',
      orderDate: orderDate.toISOString(),
      deliveryDate: deliveryDate.toISOString(),
      terms: faker.helpers.arrayElement(TERMS),
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'sales',
      createdAt: orderDate.toISOString(),
    });
  }
  return orders;
}
