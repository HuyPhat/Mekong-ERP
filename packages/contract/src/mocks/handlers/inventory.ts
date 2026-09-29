import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  productsStore,
  stockLevelsStore,
  stockMovementsStore,
  warehousesStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';
import { ProductSchema, ProductImportRowSchema, type Product } from '../../entities';

export const inventoryHandlers = [
  http.get('/api/warehouses', async () => {
    await ensureSeeded();
    return HttpResponse.json({ data: warehousesStore.list() });
  }),

  http.get('/api/products', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [{ field: 'name', direction: 'asc' }]);
    const categories = url.searchParams.get('filter[category]')?.split(',').filter(Boolean) ?? [];
    const unit = url.searchParams.get('filter[unit]');
    const priceMin = url.searchParams.get('filter[priceMin]');
    const priceMax = url.searchParams.get('filter[priceMax]');
    const createdFrom = url.searchParams.get('filter[createdFrom]');
    const createdTo = url.searchParams.get('filter[createdTo]');

    let items = productsStore.list();
    if (categories.length > 0)
      items = items.filter((product) => categories.includes(product.category));
    if (unit) items = items.filter((product) => product.unit === unit);
    if (priceMin) items = items.filter((product) => product.salePrice >= Number(priceMin));
    if (priceMax) items = items.filter((product) => product.salePrice <= Number(priceMax));
    if (createdFrom) items = items.filter((product) => product.createdAt >= createdFrom);
    if (createdTo)
      items = items.filter((product) => product.createdAt <= `${createdTo}T23:59:59.999Z`);
    items = items.filter((product) => matchesSearch(product, q, ['name', 'sku']));
    items = applySort(items, sort);

    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/products/:id', async ({ params }) => {
    await ensureSeeded();
    const product = productsStore.get(String(params.id));
    if (!product) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(product);
  }),

  http.patch('/api/products/:id', async ({ params, request }) => {
    await ensureSeeded();
    const existing = productsStore.get(String(params.id));
    if (!existing) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Partial<Product>;
    const parsed = ProductSchema.safeParse({ ...existing, ...body, id: existing.id });
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid product',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    await productsStore.put(parsed.data);
    return HttpResponse.json(parsed.data);
  }),

  // Bulk upsert-by-SKU for CSV import. Row-level Zod validation happens again
  // here even though the client already validated at preview time — the two
  // requests aren't guaranteed to be the same rows the user saw.
  http.post('/api/products/import', async ({ request }) => {
    await ensureSeeded();
    const body = (await request.json()) as { rows?: unknown[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const existingBySku = new Map(productsStore.list().map((product) => [product.sku, product]));
    let succeeded = 0;
    const errors: { rowNumber: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const parsed = ProductImportRowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        errors.push({
          rowNumber: i + 1,
          message: parsed.error.issues.map((issue) => issue.message).join('; '),
        });
        continue;
      }
      const existing = existingBySku.get(parsed.data.sku);
      const product: Product = {
        id: existing?.id ?? `prod-${crypto.randomUUID()}`,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        ...parsed.data,
      };
      await productsStore.put(product);
      existingBySku.set(product.sku, product);
      succeeded++;
    }

    return HttpResponse.json({ succeeded, failed: errors.length, errors });
  }),

  http.get('/api/stock-levels', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'productName', direction: 'asc' },
    ]);
    const warehouseIds =
      url.searchParams.get('filter[warehouseId]')?.split(',').filter(Boolean) ?? [];
    const qtyMin = url.searchParams.get('filter[qtyMin]');
    const qtyMax = url.searchParams.get('filter[qtyMax]');

    const products = new Map(productsStore.list().map((product) => [product.id, product]));
    const warehouses = new Map(
      warehousesStore.list().map((warehouse) => [warehouse.id, warehouse]),
    );
    let items = stockLevelsStore.list().map((level) => {
      const product = products.get(level.productId);
      return {
        ...level,
        productName: product?.name ?? '',
        productSku: product?.sku ?? '',
        warehouseName: warehouses.get(level.warehouseId)?.name ?? '',
        reorderPoint: product?.reorderPoint ?? 0,
      };
    });
    if (warehouseIds.length > 0)
      items = items.filter((level) => warehouseIds.includes(level.warehouseId));
    if (qtyMin) items = items.filter((level) => level.quantityOnHand >= Number(qtyMin));
    if (qtyMax) items = items.filter((level) => level.quantityOnHand <= Number(qtyMax));
    items = items.filter((level) => matchesSearch(level, q, ['productName', 'productSku']));
    items = applySort(items, sort);

    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  // Returned as one page: the movements view runs in the DataGrid's
  // virtualized client mode, not server-side pagination (PLAN.md §6).
  http.get('/api/stock-movements', async () => {
    await ensureSeeded();
    const products = new Map(productsStore.list().map((product) => [product.id, product]));
    const warehouses = new Map(
      warehousesStore.list().map((warehouse) => [warehouse.id, warehouse]),
    );
    const items = stockMovementsStore.list().map((movement) => ({
      ...movement,
      productName: products.get(movement.productId)?.name ?? '',
      productSku: products.get(movement.productId)?.sku ?? '',
      warehouseName: warehouses.get(movement.warehouseId)?.name ?? '',
    }));
    return HttpResponse.json({
      data: items,
      meta: { page: 1, pageSize: items.length, total: items.length, totalPages: 1 },
    });
  }),
];
