import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  fetchSuppliers,
  fetchSupplier,
  fetchPurchaseOrders,
  fetchPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
  fetchGoodsReceipts,
  fetchGoodsReceipt,
  fetchVendorBills,
  fetchVendorBill,
  createVendorBill,
  fetchVendorBillMatch,
  confirmVendorBillMatch,
  overrideVendorBillMatch,
  payVendorBill,
  fetchAuditLog,
  type ListParams,
  type PurchaseOrderInput,
  type ReceiveLineInput,
  type VendorBillLineInput,
} from '@mekong-erp/contract';
import { purchasingKeys } from './query-keys';

export function useSuppliers(params: ListParams) {
  return useQuery({
    queryKey: purchasingKeys.suppliers.list(params),
    queryFn: () => fetchSuppliers(params),
    placeholderData: (previous) => previous,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: purchasingKeys.suppliers.detail(id),
    queryFn: () => fetchSupplier(id),
    enabled: id.length > 0,
  });
}

export function usePurchaseOrders(params: ListParams) {
  return useQuery({
    queryKey: purchasingKeys.purchaseOrders.list(params),
    queryFn: () => fetchPurchaseOrders(params),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: purchasingKeys.purchaseOrders.detail(id),
    queryFn: () => fetchPurchaseOrder(id),
    enabled: id.length > 0,
  });
}

function invalidatePurchaseOrderLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'list'] });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => createPurchaseOrder(input),
    onSuccess: (po) => {
      queryClient.setQueryData(purchasingKeys.purchaseOrders.detail(po.id), po);
      invalidatePurchaseOrderLists(queryClient);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PurchaseOrderInput }) =>
      updatePurchaseOrder(id, input),
    onSuccess: (po) => {
      queryClient.setQueryData(purchasingKeys.purchaseOrders.detail(po.id), po);
      invalidatePurchaseOrderLists(queryClient);
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitPurchaseOrder(id),
    onSuccess: (po) => {
      queryClient.setQueryData(purchasingKeys.purchaseOrders.detail(po.id), po);
      invalidatePurchaseOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),
    onSuccess: (po) => {
      queryClient.setQueryData(purchasingKeys.purchaseOrders.detail(po.id), po);
      invalidatePurchaseOrderLists(queryClient);
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: ReceiveLineInput[] }) =>
      receivePurchaseOrder(id, lines),
    onSuccess: ({ purchaseOrder }) => {
      queryClient.setQueryData(
        purchasingKeys.purchaseOrders.detail(purchaseOrder.id),
        purchaseOrder,
      );
      invalidatePurchaseOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
}

export function useGoodsReceipts(params: ListParams) {
  return useQuery({
    queryKey: purchasingKeys.goodsReceipts.list(params),
    queryFn: () => fetchGoodsReceipts(params),
    placeholderData: (previous) => previous,
  });
}

export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: purchasingKeys.goodsReceipts.detail(id),
    queryFn: () => fetchGoodsReceipt(id),
    enabled: id.length > 0,
  });
}

export function useVendorBills(params: ListParams) {
  return useQuery({
    queryKey: purchasingKeys.vendorBills.list(params),
    queryFn: () => fetchVendorBills(params),
    placeholderData: (previous) => previous,
  });
}

export function useVendorBill(id: string) {
  return useQuery({
    queryKey: purchasingKeys.vendorBills.detail(id),
    queryFn: () => fetchVendorBill(id),
    enabled: id.length > 0,
  });
}

export function useCreateVendorBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lines }: { poId: string; lines: VendorBillLineInput[] }) =>
      createVendorBill(poId, lines),
    onSuccess: (bill) => {
      queryClient.setQueryData(purchasingKeys.vendorBills.detail(bill.id), bill);
      void queryClient.invalidateQueries({ queryKey: ['vendor-bills', 'list'] });
      invalidatePurchaseOrderLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.purchaseOrders.detail(bill.poId),
      });
    },
  });
}

export function useVendorBillMatch(id: string) {
  return useQuery({
    queryKey: purchasingKeys.vendorBills.match(id),
    queryFn: () => fetchVendorBillMatch(id),
    enabled: id.length > 0,
  });
}

// confirm/override/pay all return the bare VendorBill (no denormalized
// poNumber/supplierName), so the detail/list/match caches are invalidated
// to refetch the enriched view rather than merged in place.
function refreshVendorBill(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: purchasingKeys.vendorBills.detail(id) });
  void queryClient.invalidateQueries({ queryKey: purchasingKeys.vendorBills.match(id) });
  void queryClient.invalidateQueries({ queryKey: ['vendor-bills', 'list'] });
}

export function useConfirmVendorBillMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmVendorBillMatch(id),
    onSuccess: (_bill, id) => {
      refreshVendorBill(queryClient, id);
    },
  });
}

export function useOverrideVendorBillMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      overrideVendorBillMatch(id, reason),
    onSuccess: (_bill, { id }) => {
      refreshVendorBill(queryClient, id);
    },
  });
}

export function usePayVendorBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payVendorBill(id),
    onSuccess: (bill, id) => {
      refreshVendorBill(queryClient, id);
      invalidatePurchaseOrderLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.purchaseOrders.detail(bill.poId),
      });
    },
  });
}

export function useAuditLog(params: ListParams) {
  return useQuery({
    queryKey: purchasingKeys.auditLog.list(params),
    queryFn: () => fetchAuditLog(params),
    placeholderData: (previous) => previous,
  });
}
