import { z } from 'zod';

export const WarehouseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  address: z.string(),
});
export type Warehouse = z.infer<typeof WarehouseSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  costPrice: z.number().int(),
  salePrice: z.number().int(),
  reorderPoint: z.number().int(),
  createdAt: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

// CSV import rows arrive as strings from the sheet; coerce the numeric fields
// rather than requiring the source file to already hold JS numbers.
export const ProductImportRowSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  costPrice: z.coerce.number().int().nonnegative(),
  salePrice: z.coerce.number().int().nonnegative(),
  reorderPoint: z.coerce.number().int().nonnegative(),
});
export type ProductImportRow = z.infer<typeof ProductImportRowSchema>;

export const StockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantityOnHand: z.number().int(),
});
export type StockLevel = z.infer<typeof StockLevelSchema>;

export const MovementTypeSchema = z.enum(['in', 'out', 'adjustment']);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const StockMovementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  type: MovementTypeSchema,
  quantity: z.number().int(),
  reference: z.string(),
  occurredAt: z.string(),
  note: z.string().optional(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

// "View" variants denormalize a display-friendly product/warehouse name onto
// the base entity, the way a real backend's list endpoint would join them.
export const StockLevelViewSchema = StockLevelSchema.extend({
  productName: z.string(),
  productSku: z.string(),
  warehouseName: z.string(),
  reorderPoint: z.number().int(),
});
export type StockLevelView = z.infer<typeof StockLevelViewSchema>;

export const StockMovementViewSchema = StockMovementSchema.extend({
  productName: z.string(),
  productSku: z.string(),
  warehouseName: z.string(),
});
export type StockMovementView = z.infer<typeof StockMovementViewSchema>;
