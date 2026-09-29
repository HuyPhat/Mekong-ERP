import { z } from 'zod';
import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import {
  ProductSchema,
  WarehouseSchema,
  StockLevelViewSchema,
  StockMovementViewSchema,
  type Product,
  type ProductImportRow,
} from './entities';

const ProductListResponseSchema = listResponseSchema(ProductSchema);
const StockLevelListResponseSchema = listResponseSchema(StockLevelViewSchema);
const StockMovementListResponseSchema = listResponseSchema(StockMovementViewSchema);
const WarehouseListResponseSchema = z.object({ data: z.array(WarehouseSchema) });
const ProductImportResponseSchema = z.object({
  succeeded: z.number().int(),
  failed: z.number().int(),
  errors: z.array(z.object({ rowNumber: z.number().int(), message: z.string() })),
});

export function fetchProducts(params: ListParams) {
  return request(`/products?${buildListQuery(params)}`, ProductListResponseSchema);
}

export function fetchProduct(id: string) {
  return request(`/products/${id}`, ProductSchema);
}

export function updateProduct(id: string, patch: Partial<Product>) {
  return request(`/products/${id}`, ProductSchema, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function importProducts(rows: ProductImportRow[]) {
  return request('/products/import', ProductImportResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export function fetchWarehouses() {
  return request('/warehouses', WarehouseListResponseSchema);
}

export function fetchStockLevels(params: ListParams) {
  return request(`/stock-levels?${buildListQuery(params)}`, StockLevelListResponseSchema);
}

export function fetchStockMovements() {
  return request('/stock-movements', StockMovementListResponseSchema);
}
