import { useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, MoneyCell, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate } from '../../../../shared/lib/format';
import { useProducts } from '../../../../features/inventory/queries';
import {
  useQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useRejectQuotation,
  useConvertQuotationToSalesOrder,
} from '../../../../features/sales/queries';
import { quotationStatusLabel, quotationStatusTone } from '../../../../features/sales/status';

export const Route = createFileRoute('/_app/sales/quotations/$quotationId')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: QuotationDetailPage,
});

function QuotationDetailPage() {
  const { t } = useTranslation();
  const { quotationId } = Route.useParams();
  const navigate = useNavigate();
  const canWrite = useCan(PERMISSIONS.salesWrite);

  const { data: quotation, isLoading, isError } = useQuotation(quotationId);
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const sendMutation = useSendQuotation();
  const acceptMutation = useAcceptQuotation();
  const rejectMutation = useRejectQuotation();
  const convertMutation = useConvertQuotationToSalesOrder();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('sales.quotations.detail.loading')}</p>;
  }
  if (isError || !quotation) {
    return <p className="text-destructive">{t('sales.quotations.detail.notFound')}</p>;
  }

  const canSend = canWrite && quotation.status === 'draft';
  const canDecide = canWrite && quotation.status === 'sent';
  const canConvert = canWrite && quotation.status === 'accepted';

  async function handleSend() {
    try {
      await sendMutation.mutateAsync(quotationId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync(quotationId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync(quotationId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleConvert() {
    try {
      const result = await convertMutation.mutateAsync(quotationId);
      toast({ title: t('sales.quotations.detail.convertSuccess') });
      void navigate({ to: '/sales/orders/$soId', params: { soId: result.salesOrder.id } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/sales/quotations"
        search={{ page: 1, pageSize: 50 }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('sales.quotations.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{quotation.number}</h1>
          <StatusBadge tone={quotationStatusTone(quotation.status)}>
            {quotationStatusLabel(t, quotation.status)}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button onClick={() => void handleSend()} disabled={sendMutation.isPending}>
              {sendMutation.isPending
                ? t('sales.quotations.detail.sending')
                : t('sales.quotations.detail.sendButton')}
            </Button>
          )}
          {canDecide && (
            <>
              <Button onClick={() => void handleAccept()} disabled={acceptMutation.isPending}>
                {t('sales.quotations.detail.acceptButton')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleReject()}
                disabled={rejectMutation.isPending}
              >
                {t('sales.quotations.detail.rejectButton')}
              </Button>
            </>
          )}
          {canConvert && (
            <Button onClick={() => void handleConvert()} disabled={convertMutation.isPending}>
              {convertMutation.isPending
                ? t('sales.quotations.detail.converting')
                : t('sales.quotations.detail.convertButton')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('sales.quotations.detail.customerLabel')}</dt>
        <dd>{quotation.customerName}</dd>
        <dt className="text-muted-foreground">{t('sales.quotations.detail.validUntilLabel')}</dt>
        <dd>{formatDate(quotation.validUntil)}</dd>
        <dt className="text-muted-foreground">{t('sales.quotations.detail.termsLabel')}</dt>
        <dd className="col-span-1">{quotation.terms}</dd>
        <dt className="text-muted-foreground">
          {t('sales.quotations.detail.createdLabel', { date: formatDate(quotation.createdAt) })}
        </dt>
        <dd>
          {quotation.convertedToSoId ? (
            <Link
              to="/sales/orders/$soId"
              params={{ soId: quotation.convertedToSoId }}
              className="text-foreground hover:underline"
            >
              {t('sales.quotations.detail.viewSalesOrder')}
            </Link>
          ) : (
            '—'
          )}
        </dd>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('sales.quotations.detail.linesTitle')}
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('sales.quotations.detail.columns.product')}</th>
                <th className="px-3 py-2 text-right">{t('sales.quotations.detail.columns.qty')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.quotations.detail.columns.unitPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('sales.quotations.detail.columns.discount')}
                </th>
                <th className="px-3 py-2 text-right">{t('sales.quotations.detail.columns.vat')}</th>
                <th className="px-3 py-2 text-right">
                  {t('sales.quotations.detail.columns.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((line) => (
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
            <dt className="text-muted-foreground">{t('sales.quotations.detail.totalsSubtotal')}</dt>
            <dd>
              <MoneyCell value={quotation.subtotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between">
            <dt className="text-muted-foreground">{t('sales.quotations.detail.totalsVat')}</dt>
            <dd>
              <MoneyCell value={quotation.vatTotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between font-semibold">
            <dt>{t('sales.quotations.detail.totalsGrand')}</dt>
            <dd>
              <MoneyCell value={quotation.grandTotal} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
