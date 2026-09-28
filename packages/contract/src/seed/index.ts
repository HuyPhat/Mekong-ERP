import { productsStore, stockLevelsStore, stockMovementsStore, warehousesStore } from '../db/store';
import { generateWarehouses } from './warehouses';
import { generateProducts } from './products';
import { generateStockMovements } from './stock-movements';
import { computeStockLevels } from './stock-levels';

const PRODUCT_COUNT = 3000;
const MOVEMENT_COUNT = 100_000;

async function generateAndSeed(): Promise<void> {
  const warehouses = generateWarehouses();
  const products = generateProducts(PRODUCT_COUNT);
  const movements = generateStockMovements(products, warehouses, MOVEMENT_COUNT);
  const levels = computeStockLevels(products, warehouses, movements);

  await warehousesStore.seed(warehouses);
  await productsStore.seed(products);
  await stockMovementsStore.seed(movements);
  await stockLevelsStore.seed(levels);
}

/** Hydrates from IndexedDB if seed data already exists, otherwise generates it fresh. */
export async function ensureSeeded(): Promise<void> {
  const hadProducts = await productsStore.hydrate();
  if (hadProducts) {
    await Promise.all([
      warehousesStore.hydrate(),
      stockLevelsStore.hydrate(),
      stockMovementsStore.hydrate(),
    ]);
    return;
  }
  await generateAndSeed();
}

/** Wipes persisted data and regenerates it from scratch (the "Reset demo data" action). */
export async function resetSeed(): Promise<void> {
  await Promise.all([
    warehousesStore.clear(),
    productsStore.clear(),
    stockLevelsStore.clear(),
    stockMovementsStore.clear(),
  ]);
  await generateAndSeed();
}
