import { Collection } from './collection';
import type { Product, StockLevel, StockMovement, Warehouse } from '../entities';

export const warehousesStore = new Collection<Warehouse>('warehouses');
export const productsStore = new Collection<Product>('products');
export const stockLevelsStore = new Collection<StockLevel>('stockLevels');
export const stockMovementsStore = new Collection<StockMovement>('stockMovements');
