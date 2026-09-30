import { useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, MoneyCell, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { useCan } from '../../../../../shared/permissions/use-can';
import { formatDate } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import {
  useSalesOrder,
  useDeliveries,
  useCustomerInvoices,
  useConfirmSalesOrder,
  useCancelSalesOrder,
} from '../../../../../features/sales/queries';
import { useCreateCustomerInvoice } from '../../../../../features/sales/queries';
import {
  soStatusLabel,
  soStatusTone,
  invoiceStatusLabel,
  invoiceStatusTone,
} from '../../../../../features/sales/status';

export const Route = createFileRoute('/_app/sales/orders/$soId/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: SalesOrderDetailPage,
});

function SalesOrderDetailPage() {
  const { t } = useTranslation();
  const { soId } = Route.useParams();
  const navigate = useNavigate();
  const canWrite = useCan(PERMISSIONS.salesWrite);

  const { data: so, isLoading, isError } = useSalesOrder(soId);
  const { data: deliveriesData } = useDeliveries({ page: 1, pageSize: 50, filters: { soId } });
  const { data: invoicesData } = useCustomerInvoices({ page: 1, pageSize: 50, filters: { soId } });
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const confirmMutation = useConfirmSalesOrder();
  const cancelMutation = useCancelSalesOrder();
  const createInvoiceMutation = useCreateCustomerInvoice();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('sales.orders.detail.loading')}</p>;
  }
  if (isError || !so) {
    return <p className="text-destructive">{t('sales.orders.detail.notFound')}</p>;
  }

  const canConfirm = canWrite && so.status === 'draft';
  const canCancel = canWrite && (so.status === 'draft' || so.status === 'confirmed');
  const canDeliver = canWrite && (so.status === 'confirmed' || so.status === 'partially_delivered');
  const canInvoice = canWrite && (so.status === 'delivered' || so.status === 'partially_delivered');

  async function handleConfirm() {
    try {
      await confirmMutation.mutateAsync(soId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(soId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleCreateInvoice() {
    try {
      const invoice = await createInvoiceMutation.mutateAsync(soId);
      void navigate({ to: '/sales/invoices/$invoiceId', params: { invoiceId: invoice.id } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/sales/orders"
        search={{ page: 1, pageSize: 50 }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('sales.orders.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{so.number}</h1>
          <StatusBadge tone={soStatusTone(so.status)}>{soStatusLabel(t, so.status)}</StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button onClick={() => void handleConfirm()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending
                ? t('sales.orders.detail.confirming')
                : t('sales.orders.detail.confirmButton')}
            </Button>
          )}
          {canDeliver && (
            <Button asChild variant="outline">
              <Link to="/sales/orders/$soId/deliver" params={{ soId }}>
                {t('sales.orders.detail.deliverButton')}
              </Link>
            </Button>
          )}
          {canInvoice && (
            <Button
              onClick={() => void handleCreateInvoice()}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending
                ? t('sales.orders.detail.invoicing')
                : t('sales.orders.detail.createInvoiceButton')}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? t('sales.orders.detail.cancelling')
                : t('sales.orders.detail.cancelButton')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('sales.orders.detail.customerLabel')}</dt>
        <dd>{so.customerName}</dd>
        <dt className="text-muted-foreground">{t('sales.orders.detail.deliveryDateLabel')}</dt>
        <dd>{formatDate(so.deliveryDate)}</dd>
        <dt className="text-muted-foreground">{t('sales.orders.detail.termsLabel')}</dt>
        <dd className="col-span-1">{so.terms}</dd>
        <dt className="text-muted-foreground">
          {t('sales.orders.detail.createdLabel', { date: formatDate(so.createdAt) })}
        </dt>
        <dd>
          {so.quotationId ? (
            <Link
              to="/sales/quotations/$quotationId"
              params={{ quotationId: so.quotationId }}
              className="text-foreground hover:underline"
            >
              {t('sales.orders.detail.viewQuotation')}
            </Link>
          ) : (
            '—'
          )}
        </dd>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('sales.orders.detail.linesTitle')}
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('sales.orders.detail.columns.product')}</th>
                <th className="px-3 py-2 text-right">{t('sales.orders.detail.columns.qty')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.orders.detail.columns.unitPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('sales.orders.detail.columns.discount')}
                </th>
                <th className="px-3 py-2 text-right">{t('sales.orders.detail.columns.vat')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.orders.detail.columns.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {so.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {productsById.get(line.productId) ?? line.productId}
                  </td>
                  <td className="px-3 py-2 text-right">{line.qty}</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyCell value={line.unitPrice} />
                  </td>
                  <td className="px-3 py-2 text-right">{line.discountPct}%</td>
                  <td className="px-3 py-2 text-right">{line.vatRate}%</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyCell value={line.lineTotal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="flex flex-col items-end gap-1 text-sm">
          <div className="flex w-64 justify-between">
            <dt className="text-muted-foreground">{t('sales.orders.detail.totalsSubtotal')}</dt>
            <dd>
              <MoneyCell value={so.subtotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between">
            <dt className="text-muted-foreground">{t('sales.orders.detail.totalsVat')}</dt>
            <dd>
              <MoneyCell value={so.vatTotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between font-semibold">
            <dt>{t('sales.orders.detail.totalsGrand')}</dt>
            <dd>
              <MoneyCell value={so.grandTotal} />
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('sales.orders.detail.deliveriesTitle')}
          </h2>
          {(deliveriesData?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t('sales.orders.detail.noDeliveries')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {deliveriesData?.data.map((delivery) => (
                <li
                  key={delivery.id}
                  className="flex justify-between rounded-md border border-border px-3 py-2"
                >
                  <span>{delivery.number}</span>
                  <span className="text-muted-foreground">{formatDate(delivery.deliveredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('sales.orders.detail.invoicesTitle')}
          </h2>
          {(invoicesData?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t('sales.orders.detail.noInvoices')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {invoicesData?.data.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    to="/sales/invoices/$invoiceId"
                    params={{ invoiceId: invoice.id }}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-accent"
                  >
                    <span>{invoice.number}</span>
                    <StatusBadge tone={invoiceStatusTone(invoice.status)}>
                      {invoiceStatusLabel(t, invoice.status)}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
