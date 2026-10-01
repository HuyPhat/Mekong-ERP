import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Timeline, StatusBadge, Button, MoneyCell, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { useCan } from '../../../../../shared/permissions/use-can';
import { formatDate } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import {
  usePurchaseOrder,
  useGoodsReceipts,
  useVendorBills,
  useSubmitPurchaseOrder,
  useCancelPurchaseOrder,
} from '../../../../../features/purchasing/queries';
import { poStatusLabel, poStatusTone } from '../../../../../features/purchasing/status';
import { useApprovals } from '../../../../../features/approvals/queries';
import { approvalTimelineEntries } from '../../../../../features/approvals/approval-timeline';

export const Route = createFileRoute('/_app/purchasing/orders/$poId/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  component: PurchaseOrderDetailPage,
});

function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const { poId } = Route.useParams();
  const canWrite = useCan(PERMISSIONS.purchasingWrite);

  const { data: po, isLoading, isError } = usePurchaseOrder(poId);
  const { data: approvalsData } = useApprovals({ page: 1, pageSize: 50, filters: { docId: poId } });
  const { data: grnsData } = useGoodsReceipts({ page: 1, pageSize: 50, filters: { poId } });
  const { data: billsData } = useVendorBills({ page: 1, pageSize: 50, filters: { poId } });
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const submitMutation = useSubmitPurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  const timelineEntries = useMemo(
    () => approvalTimelineEntries(approvalsData?.data ?? [], t),
    [approvalsData, t],
  );

  if (isLoading) {
    return <p className="text-muted-foreground">{t('purchasing.orders.detail.loading')}</p>;
  }
  if (isError || !po) {
    return <p className="text-destructive">{t('purchasing.orders.detail.notFound')}</p>;
  }

  const canSubmit = canWrite && (po.status === 'draft' || po.status === 'changes_requested');
  const canCancel = canWrite && ['draft', 'rejected', 'changes_requested'].includes(po.status);
  const canReceive = canWrite && (po.status === 'approved' || po.status === 'partially_received');
  const canBill = canWrite && (po.status === 'received' || po.status === 'partially_received');

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync(poId);
      toast({ title: t('purchasing.orders.wizard.review.submitSuccess') });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(poId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/purchasing/orders"
        search={{ page: 1, pageSize: 50 }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('purchasing.orders.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{po.number}</h1>
          <StatusBadge tone={poStatusTone(po.status)}>{poStatusLabel(t, po.status)}</StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button onClick={() => void handleSubmit()} disabled={submitMutation.isPending}>
              {submitMutation.isPending
                ? t('purchasing.orders.detail.submitting')
                : po.status === 'changes_requested'
                  ? t('purchasing.orders.detail.resubmitButton')
                  : t('purchasing.orders.detail.submitButton')}
            </Button>
          )}
          {canReceive && (
            <Button asChild variant="outline">
              <Link to="/purchasing/orders/$poId/receive" params={{ poId }}>
                {t('purchasing.orders.detail.receiveButton')}
              </Link>
            </Button>
          )}
          {canBill && (
            <Button asChild variant="outline">
              <Link to="/purchasing/bills/new" search={{ poId }}>
                {t('purchasing.orders.detail.createBillButton')}
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? t('purchasing.orders.detail.cancelling')
                : t('purchasing.orders.detail.cancelButton')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('purchasing.orders.detail.supplierLabel')}</dt>
        <dd className="col-span-1">{po.supplierName}</dd>
        <dt className="text-muted-foreground">{t('purchasing.orders.detail.deliveryDateLabel')}</dt>
        <dd>{formatDate(po.deliveryDate)}</dd>
        <dt className="text-muted-foreground">{t('purchasing.orders.detail.termsLabel')}</dt>
        <dd className="col-span-1">{po.terms}</dd>
        <dt className="text-muted-foreground">
          {t('purchasing.orders.detail.createdLabel', { date: formatDate(po.createdAt) })}
        </dt>
        <dd>
          {po.submittedAt
            ? t('purchasing.orders.detail.submittedLabel', { date: formatDate(po.submittedAt) })
            : '—'}
        </dd>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('purchasing.orders.detail.linesTitle')}
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('purchasing.orders.detail.columns.product')}</th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.orders.detail.columns.qty')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.orders.detail.columns.unitPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.orders.detail.columns.discount')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.orders.detail.columns.vat')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.orders.detail.columns.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => (
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
            <dt className="text-muted-foreground">
              {t('purchasing.orders.detail.totalsSubtotal')}
            </dt>
            <dd>
              <MoneyCell value={po.subtotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between">
            <dt className="text-muted-foreground">{t('purchasing.orders.detail.totalsVat')}</dt>
            <dd>
              <MoneyCell value={po.vatTotal} />
            </dd>
          </div>
          <div className="flex w-64 justify-between font-semibold">
            <dt>{t('purchasing.orders.detail.totalsGrand')}</dt>
            <dd>
              <MoneyCell value={po.grandTotal} />
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('purchasing.orders.detail.grnsTitle')}
          </h2>
          {(grnsData?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t('purchasing.orders.detail.noGrns')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {grnsData?.data.map((grn) => (
                <li
                  key={grn.id}
                  className="flex justify-between rounded-md border border-border px-3 py-2"
                >
                  <span>{grn.number}</span>
                  <span className="text-muted-foreground">{formatDate(grn.receivedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('purchasing.orders.detail.billsTitle')}
          </h2>
          {(billsData?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t('purchasing.orders.detail.noBills')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {billsData?.data.map((bill) => (
                <li key={bill.id}>
                  <Link
                    to="/purchasing/bills/$billId"
                    params={{ billId: bill.id }}
                    className="flex justify-between rounded-md border border-border px-3 py-2 hover:border-accent"
                  >
                    <span>{bill.number}</span>
                    <span className="text-muted-foreground">
                      <MoneyCell value={bill.grandTotal} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('purchasing.orders.detail.timelineTitle')}
        </h2>
        <Timeline items={timelineEntries} />
      </section>
    </div>
  );
}
