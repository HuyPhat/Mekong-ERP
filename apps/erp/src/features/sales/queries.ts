import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  fetchCustomers,
  fetchCustomer,
  fetchQuotations,
  fetchQuotation,
  createQuotation,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToSalesOrder,
  fetchSalesOrders,
  fetchSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  deliverSalesOrder,
  fetchDeliveries,
  fetchDelivery,
  fetchCustomerInvoices,
  fetchCustomerInvoice,
  createCustomerInvoice,
  recordCustomerInvoicePayment,
  type ListParams,
  type QuotationInput,
  type DeliverLineInput,
} from '@mekong-erp/contract';
import { salesKeys } from './query-keys';

export function useCustomers(params: ListParams) {
  return useQuery({
    queryKey: salesKeys.customers.list(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: (previous) => previous,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: salesKeys.customers.detail(id),
    queryFn: () => fetchCustomer(id),
    enabled: id.length > 0,
  });
}

export function useQuotations(params: ListParams) {
  return useQuery({
    queryKey: salesKeys.quotations.list(params),
    queryFn: () => fetchQuotations(params),
    placeholderData: (previous) => previous,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: salesKeys.quotations.detail(id),
    queryFn: () => fetchQuotation(id),
    enabled: id.length > 0,
  });
}

function invalidateQuotationLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: QuotationInput) => createQuotation(input),
    onSuccess: (quotation) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      invalidateQuotationLists(queryClient);
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuotationInput }) =>
      updateQuotation(id, input),
    onSuccess: (quotation) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      invalidateQuotationLists(queryClient);
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendQuotation(id),
    onSuccess: (quotation) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      invalidateQuotationLists(queryClient);
    },
  });
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acceptQuotation(id),
    onSuccess: (quotation) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      invalidateQuotationLists(queryClient);
    },
  });
}

export function useRejectQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectQuotation(id),
    onSuccess: (quotation) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      invalidateQuotationLists(queryClient);
    },
  });
}

export function useConvertQuotationToSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => convertQuotationToSalesOrder(id),
    onSuccess: ({ quotation, salesOrder }) => {
      queryClient.setQueryData(salesKeys.quotations.detail(quotation.id), quotation);
      queryClient.setQueryData(salesKeys.salesOrders.detail(salesOrder.id), salesOrder);
      invalidateQuotationLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['sales-orders', 'list'] });
    },
  });
}

export function useSalesOrders(params: ListParams) {
  return useQuery({
    queryKey: salesKeys.salesOrders.list(params),
    queryFn: () => fetchSalesOrders(params),
    placeholderData: (previous) => previous,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: salesKeys.salesOrders.detail(id),
    queryFn: () => fetchSalesOrder(id),
    enabled: id.length > 0,
  });
}

function invalidateSalesOrderLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['sales-orders', 'list'] });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmSalesOrder(id),
    onSuccess: (so) => {
      queryClient.setQueryData(salesKeys.salesOrders.detail(so.id), so);
      invalidateSalesOrderLists(queryClient);
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSalesOrder(id),
    onSuccess: (so) => {
      queryClient.setQueryData(salesKeys.salesOrders.detail(so.id), so);
      invalidateSalesOrderLists(queryClient);
    },
  });
}

export function useDeliverSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: DeliverLineInput[] }) =>
      deliverSalesOrder(id, lines),
    onSuccess: ({ salesOrder }) => {
      queryClient.setQueryData(salesKeys.salesOrders.detail(salesOrder.id), salesOrder);
      invalidateSalesOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

export function useDeliveries(params: ListParams) {
  return useQuery({
    queryKey: salesKeys.deliveries.list(params),
    queryFn: () => fetchDeliveries(params),
    placeholderData: (previous) => previous,
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: salesKeys.deliveries.detail(id),
    queryFn: () => fetchDelivery(id),
    enabled: id.length > 0,
  });
}

export function useCustomerInvoices(params: ListParams) {
  return useQuery({
    queryKey: salesKeys.customerInvoices.list(params),
    queryFn: () => fetchCustomerInvoices(params),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerInvoice(id: string) {
  return useQuery({
    queryKey: salesKeys.customerInvoices.detail(id),
    queryFn: () => fetchCustomerInvoice(id),
    enabled: id.length > 0,
  });
}

export function useCreateCustomerInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (soId: string) => createCustomerInvoice(soId),
    onSuccess: (invoice) => {
      queryClient.setQueryData(salesKeys.customerInvoices.detail(invoice.id), invoice);
      void queryClient.invalidateQueries({ queryKey: ['customer-invoices', 'list'] });
      invalidateSalesOrderLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: salesKeys.salesOrders.detail(invoice.soId),
      });
    },
  });
}

function refreshCustomerInvoice(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: salesKeys.customerInvoices.detail(id) });
  void queryClient.invalidateQueries({ queryKey: ['customer-invoices', 'list'] });
}

export function useRecordCustomerInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recordCustomerInvoicePayment(id),
    onSuccess: (invoice, id) => {
      refreshCustomerInvoice(queryClient, id);
      invalidateSalesOrderLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: salesKeys.salesOrders.detail(invoice.soId),
      });
    },
  });
}
