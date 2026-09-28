import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts,
  fetchProduct,
  updateProduct,
  importProducts,
  fetchWarehouses,
  fetchStockLevels,
  fetchStockMovements,
  type ListParams,
  type Product,
  type ProductImportRow,
} from '@mekong-erp/contract';
import { inventoryKeys } from './query-keys';

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: fetchWarehouses,
    staleTime: Infinity,
  });
}

export function useProducts(params: ListParams) {
  return useQuery({
    queryKey: inventoryKeys.products.list(params),
    queryFn: () => fetchProducts(params),
    placeholderData: (previous) => previous,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.products.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: id.length > 0,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Product> }) =>
      updateProduct(id, patch),
    onSuccess: (product) => {
      queryClient.setQueryData(inventoryKeys.products.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: ProductImportRow[]) => importProducts(rows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });
}

export function useStockLevels(params: ListParams) {
  return useQuery({
    queryKey: inventoryKeys.stockLevels.list(params),
    queryFn: () => fetchStockLevels(params),
    placeholderData: (previous) => previous,
  });
}

export function useStockMovements() {
  return useQuery({
    queryKey: inventoryKeys.stockMovements.all(),
    queryFn: fetchStockMovements,
    staleTime: 60_000,
  });
}
