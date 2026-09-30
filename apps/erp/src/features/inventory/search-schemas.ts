import { z } from '@mekong-erp/contract';

export const ProductsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  // Comma-joined selected values — see packages/ui's ColumnFilterConfig (enum-multiselect).
  category: z.string().optional(),
  unit: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
});
export type ProductsSearch = z.infer<typeof ProductsSearchSchema>;

export const StockLevelsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  warehouseId: z.string().optional(),
  qtyMin: z.number().optional(),
  qtyMax: z.number().optional(),
});
export type StockLevelsSearch = z.infer<typeof StockLevelsSearchSchema>;

export const StockMovementsSearchSchema = z.object({
  sort: z.string().optional(),
  q: z.string().optional(),
  // Comma-joined selected values — see packages/ui's ColumnFilterConfig (enum-multiselect).
  type: z.string().optional(),
  occurredAtFrom: z.string().optional(),
  occurredAtTo: z.string().optional(),
});
export type StockMovementsSearch = z.infer<typeof StockMovementsSearchSchema>;
