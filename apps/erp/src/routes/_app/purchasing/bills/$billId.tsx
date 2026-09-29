import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Textarea,
  StatusBadge,
  MoneyCell,
  toast,
} from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate, formatNumber } from '../../../../shared/lib/format';
import { useProducts } from '../../../../features/inventory/queries';
import {
  useVendorBill,
  useVendorBillMatch,
  useConfirmVendorBillMatch,
  useOverrideVendorBillMatch,
  usePayVendorBill,
} from '../../../../features/purchasing/queries';
import {
  billStatusLabel,
  billStatusTone,
  matchStatusLabel,
  matchStatusTone,
} from '../../../../features/purchasing/status';

export const Route = createFileRoute('/_app/purchasing/bills/$billId')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  component: VendorBillDetailPage,
});

function VendorBillDetailPage() {
  const { t } = useTranslation();
  const { billId } = Route.useParams();
  const canWrite = useCan(PERMISSIONS.purchasingWrite);
  const canOverride = useCan(PERMISSIONS.vendorBillOverrideMatch);

  const { data: bill, isLoading, isError } = useVendorBill(billId);
  const { data: match } = useVendorBillMatch(billId);
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const confirmMutation = useConfirmVendorBillMatch();
  const overrideMutation = useOverrideVendorBillMatch();
  const payMutation = usePayVendorBill();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('purchasing.bills.detail.loading')}</p>;
  }
  if (isError || !bill) {
    return <p className="text-destructive">{t('purchasing.bills.detail.notFound')}</p>;
  }

  async function handleConfirm() {
    try {
      await confirmMutation.mutateAsync(billId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handleOverride() {
    if (!overrideReason.trim()) {
      toast({ title: t('approvals.reasonRequired'), variant: 'destructive' });
      return;
    }
    try {
      await overrideMutation.mutateAsync({ id: billId, reason: overrideReason.trim() });
      setOverrideOpen(false);
      setOverrideReason('');
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  async function handlePay() {
    try {
      await payMutation.mutateAsync(billId);
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  const canConfirm = canWrite && bill.status === 'pending_match' && match?.hasExceptions === false;
  const canOverrideNow =
    canOverride && bill.status === 'pending_match' && match?.hasExceptions === true;
  const canPay = canWrite && (bill.status === 'matched' || bill.status === 'match_override');

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/purchasing/bills"
        search={{ page: 1, pageSize: 50 }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('purchasing.bills.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{bill.number}</h1>
          <StatusBadge tone={billStatusTone(bill.status)}>
            {billStatusLabel(t, bill.status)}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button onClick={() => void handleConfirm()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending
                ? t('purchasing.bills.detail.confirming')
                : t('purchasing.bills.detail.confirmMatchButton')}
            </Button>
          )}
          {canOverrideNow && (
            <Button variant="outline" onClick={() => setOverrideOpen(true)}>
              {t('purchasing.bills.detail.overrideMatchButton')}
            </Button>
          )}
          {canPay && (
            <Button onClick={() => void handlePay()} disabled={payMutation.isPending}>
              {payMutation.isPending
                ? t('purchasing.bills.detail.paying')
                : t('purchasing.bills.detail.payButton')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('purchasing.bills.detail.supplierLabel')}</dt>
        <dd>{bill.supplierName}</dd>
        <dt className="text-muted-foreground">{t('purchasing.bills.detail.poLabel')}</dt>
        <dd>
          <Link
            to="/purchasing/orders/$poId"
            params={{ poId: bill.poId }}
            className="text-foreground hover:underline"
          >
            {bill.poNumber}
          </Link>
        </dd>
        <dt className="text-muted-foreground">{t('purchasing.bills.detail.dueDateLabel')}</dt>
        <dd>{formatDate(bill.dueDate)}</dd>
      </dl>

      {bill.matchOverrideReason && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t('purchasing.bills.detail.overrideReasonShown', { reason: bill.matchOverrideReason })}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('purchasing.bills.detail.linesTitle')}
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('purchasing.bills.detail.columns.product')}</th>
                <th className="px-3 py-2 text-right">{t('purchasing.bills.detail.columns.qty')}</th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.columns.unitPrice')}
                </th>
                <th className="px-3 py-2 text-right">{t('purchasing.bills.detail.columns.vat')}</th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.columns.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {productsById.get(line.productId) ?? line.productId}
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(line.qty)}</td>
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
            <dt>{t('purchasing.orders.wizard.review.grandTotal')}</dt>
            <dd>
              <MoneyCell value={bill.grandTotal} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('purchasing.bills.detail.matchTitle')}
        </h2>
        {match && (
          <p className={match.hasExceptions ? 'text-sm text-warning' : 'text-sm text-success'}>
            {match.hasExceptions
              ? t('purchasing.bills.detail.hasExceptions')
              : t('purchasing.bills.detail.noExceptions')}
          </p>
        )}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t('purchasing.bills.detail.matchColumns.product')}</th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.matchColumns.poQty')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.matchColumns.poUnitPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.matchColumns.receivedQty')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.matchColumns.billedQty')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('purchasing.bills.detail.matchColumns.billedUnitPrice')}
                </th>
                <th className="px-3 py-2 text-left">
                  {t('purchasing.bills.detail.matchColumns.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(match?.lines ?? []).map((line) => (
                <tr key={line.productId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {productsById.get(line.productId) ?? line.productId}
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(line.poQty)}</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyCell value={line.poUnitPrice} />
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(line.receivedQty)}</td>
                  <td className="px-3 py-2 text-right">
                    {line.billedQty !== null ? formatNumber(line.billedQty) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {line.billedUnitPrice !== null ? (
                      <MoneyCell value={line.billedUnitPrice} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={matchStatusTone(line.status)}>
                      {matchStatusLabel(t, line.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogTitle>{t('purchasing.bills.detail.overrideMatchButton')}</DialogTitle>
          <DialogDescription>{t('purchasing.bills.detail.overrideReasonLabel')}</DialogDescription>
          <Textarea
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            placeholder={t('purchasing.bills.detail.overrideReasonPlaceholder')}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              {t('purchasing.bills.detail.cancel')}
            </Button>
            <Button onClick={() => void handleOverride()} disabled={overrideMutation.isPending}>
              {overrideMutation.isPending
                ? t('purchasing.bills.detail.overriding')
                : t('purchasing.bills.detail.overrideSubmit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
