import type { Product, StockLevel, StockMovement, Warehouse } from '../entities';

export function computeStockLevels(
  products: Product[],
  warehouses: Warehouse[],
  movements: StockMovement[],
): StockLevel[] {
  const quantities = new Map<string, number>();
  for (const movement of movements) {
    const key = `${movement.productId}:${movement.warehouseId}`;
    const delta = movement.type === 'out' ? -movement.quantity : movement.quantity;
    quantities.set(key, (quantities.get(key) ?? 0) + delta);
  }

  const levels: StockLevel[] = [];
  for (const product of products) {
    for (const warehouse of warehouses) {
      const key = `${product.id}:${warehouse.id}`;
      levels.push({
        id: key,
        productId: product.id,
        warehouseId: warehouse.id,
        quantityOnHand: Math.max(0, quantities.get(key) ?? 0),
      });
    }
  }
  return levels;
}
