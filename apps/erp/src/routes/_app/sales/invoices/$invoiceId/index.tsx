import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, MoneyCell, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { useCan } from '../../../../../shared/permissions/use-can';
import { formatDate } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import {
  useCustomerInvoice,
  useRecordCustomerInvoicePayment,
} from '../../../../../features/sales/queries';
import {
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
} from '../../../../../features/sales/status';

export const Route = createFileRoute('/_app/sales/invoices/$invoiceId/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: CustomerInvoiceDetailPage,
});

function CustomerInvoiceDetailPage() {
  const { t } = useTranslation();
  const { invoiceId } = Route.useParams();
  const canWrite = useCan(PERMISSIONS.salesWrite);

  const { data: invoice, isLoading, isError } = useCustomerInvoice(invoiceId);
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });
  const recordPaymentMutation = useRecordCustomerInvoicePayment();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('sales.invoices.detail.loading')}</p>;
  }
  if (isError || !invoice) {
    return <p className="text-destructive">{t('sales.invoices.detail.notFound')}</p>;
  }

  const overdue = isInvoiceOverdue(invoice.status, invoice.dueDate);
  const canRecordPayment = canWrite && invoice.status === 'unpaid';

  async function handleRecordPayment() {
    try {
      await recordPaymentMutation.mutateAsync(invoiceId);
      toast({ title: t('sales.invoices.detail.paymentRecorded') });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/sales/invoices"
        search={{ page: 1, pageSize: 50 }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('sales.invoices.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{invoice.number}</h1>
          <StatusBadge tone={overdue ? 'destructive' : invoiceStatusTone(invoice.status)}>
            {overdue ? t('sales.invoices.status.overdue') : invoiceStatusLabel(t, invoice.status)}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/sales/invoices/$invoiceId/preview" params={{ invoiceId }}>
              {t('sales.invoices.detail.previewButton')}
            </Link>
          </Button>
          {canRecordPayment && (
            <Button
              onClick={() => void handleRecordPayment()}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending
                ? t('sales.invoices.detail.recordingPayment')
                : t('sales.invoices.detail.recordPaymentButton')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('sales.invoices.detail.customerLabel')}</dt>
        <dd>{invoice.customerName}</dd>
        <dt className="text-muted-foreground">{t('sales.invoices.detail.soLabel')}</dt>
        <dd>
          <Link
            to="/sales/orders/$soId"
            params={{ soId: invoice.soId }}
            className="text-foreground hover:underline"
          >
            {invoice.soNumber}
          </Link>
        </dd>
        <dt className="text-muted-foreground">{t('sales.invoices.detail.issueDateLabel')}</dt>
        <dd>{formatDate(invoice.issueDate)}</dd>
        <dt className="text-muted-foreground">{t('sales.invoices.detail.dueDateLabel')}</dt>
        <dd>{formatDate(invoice.dueDate)}</dd>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('sales.invoices.detail.linesTitle')}
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('sales.invoices.detail.columns.product')}</th>
                <th className="px-3 py-2 text-right">{t('sales.invoices.detail.columns.qty')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.invoices.detail.columns.unitPrice')}
                </th>
                <th className="px-3 py-2 text-right">{t('sales.invoices.detail.columns.vat')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.invoices.detail.columns.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {productsById.get(line.productId) ?? line.productId}
                  </td>
                  <td className="px-3 py-2 text-right">{line.qty}</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyCell value={line.unitPrice} />
                  </td>
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
          <div className="flex w-64 justify-between font-semibold">
            <dt>{t('sales.invoices.detail.totalsGrand')}</dt>
            <dd>
              <MoneyCell value={invoice.grandTotal} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
