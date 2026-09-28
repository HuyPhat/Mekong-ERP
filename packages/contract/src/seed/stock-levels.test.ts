import { describe, expect, it } from 'vitest';
import { computeStockLevels } from './stock-levels';
import type { Product, StockMovement, Warehouse } from '../entities';

const warehouses: Warehouse[] = [
  { id: 'wh-1', code: 'WH1', name: 'Warehouse 1', address: '' },
  { id: 'wh-2', code: 'WH2', name: 'Warehouse 2', address: '' },
];

const products: Product[] = [
  {
    id: 'prod-1',
    sku: 'SKU-1',
    name: 'Product 1',
    category: 'Cat',
    unit: 'unit',
    costPrice: 1000,
    salePrice: 1500,
    reorderPoint: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function movement(overrides: Partial<StockMovement>): StockMovement {
  return {
    id: 'mov-1',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    type: 'in',
    quantity: 1,
    reference: 'REF-1',
    occurredAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeStockLevels', () => {
  it('produces one row per product x warehouse, even with no movements', () => {
    const levels = computeStockLevels(products, warehouses, []);
    expect(levels).toHaveLength(products.length * warehouses.length);
    expect(levels.every((level) => level.quantityOnHand === 0)).toBe(true);
  });

  it('adds "in" and "adjustment" movements to the on-hand quantity', () => {
    const levels = computeStockLevels(products, warehouses, [
      movement({ id: 'm1', type: 'in', quantity: 50 }),
      movement({ id: 'm2', type: 'adjustment', quantity: 5 }),
    ]);
    const level = levels.find((row) => row.productId === 'prod-1' && row.warehouseId === 'wh-1');
    expect(level?.quantityOnHand).toBe(55);
  });

  it('subtracts "out" movements from the on-hand quantity', () => {
    const levels = computeStockLevels(products, warehouses, [
      movement({ id: 'm1', type: 'in', quantity: 50 }),
      movement({ id: 'm2', type: 'out', quantity: 20 }),
    ]);
    const level = levels.find((row) => row.productId === 'prod-1' && row.warehouseId === 'wh-1');
    expect(level?.quantityOnHand).toBe(30);
  });

  it('floors the on-hand quantity at zero rather than going negative', () => {
    const levels = computeStockLevels(products, warehouses, [
      movement({ id: 'm1', type: 'out', quantity: 100 }),
    ]);
    const level = levels.find((row) => row.productId === 'prod-1' && row.warehouseId === 'wh-1');
    expect(level?.quantityOnHand).toBe(0);
  });

  it('keeps quantities isolated per warehouse', () => {
    const levels = computeStockLevels(products, warehouses, [
      movement({ id: 'm1', warehouseId: 'wh-1', type: 'in', quantity: 50 }),
      movement({ id: 'm2', warehouseId: 'wh-2', type: 'in', quantity: 5 }),
    ]);
    expect(levels.find((row) => row.warehouseId === 'wh-1')?.quantityOnHand).toBe(50);
    expect(levels.find((row) => row.warehouseId === 'wh-2')?.quantityOnHand).toBe(5);
  });
});
