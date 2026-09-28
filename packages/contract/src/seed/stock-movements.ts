import { faker } from '@faker-js/faker';
import type { MovementType, Product, StockMovement, Warehouse } from '../entities';

const REFERENCE_PREFIXES: Record<MovementType, string> = {
  in: 'GRN',
  out: 'SO',
  adjustment: 'ADJ',
};

export function generateStockMovements(
  products: Product[],
  warehouses: Warehouse[],
  count: number,
): StockMovement[] {
  faker.seed(20260102);
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);

  const movements: StockMovement[] = [];
  for (let i = 0; i < count; i++) {
    const product = faker.helpers.arrayElement(products);
    const warehouse = faker.helpers.arrayElement(warehouses);
    const type = faker.helpers.weightedArrayElement<MovementType>([
      { weight: 5, value: 'in' },
      { weight: 6, value: 'out' },
      { weight: 1, value: 'adjustment' },
    ]);
    const quantity =
      type === 'adjustment'
        ? faker.number.int({ min: 1, max: 20 })
        : faker.number.int({ min: 1, max: 100 });

    movements.push({
      id: `mov-${i + 1}`,
      productId: product.id,
      warehouseId: warehouse.id,
      type,
      quantity,
      reference: `${REFERENCE_PREFIXES[type]}-2026-${String((i % 999_999) + 1).padStart(6, '0')}`,
      occurredAt: faker.date.between({ from: start, to: now }).toISOString(),
    });
  }

  return movements.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
