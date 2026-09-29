import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { formatNumber } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import {
  usePurchaseOrder,
  useGoodsReceipts,
  useReceivePurchaseOrder,
} from '../../../../../features/purchasing/queries';

export const Route = createFileRoute('/_app/purchasing/orders/$poId/receive')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingWrite),
  component: ReceiveGoodsPage,
});

function ReceiveGoodsPage() {
  const { t } = useTranslation();
  const { poId } = Route.useParams();
  const navigate = useNavigate();

  const { data: po, isLoading, isError } = usePurchaseOrder(poId);
  const { data: grnsData } = useGoodsReceipts({ page: 1, pageSize: 200, filters: { poId } });
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });
  const receiveMutation = useReceivePurchaseOrder();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  const receivedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const grn of grnsData?.data ?? []) {
      for (const line of grn.lines) {
        map.set(line.productId, (map.get(line.productId) ?? 0) + line.receivedQty);
      }
    }
    return map;
  }, [grnsData]);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (isLoading) {
    return <p className="text-muted-foreground">{t('purchasing.orders.receive.loading')}</p>;
  }
  if (isError || !po) {
    return <p className="text-destructive">{t('purchasing.orders.receive.notFound')}</p>;
  }
  if (po.status !== 'approved' && po.status !== 'partially_received') {
    return <p className="text-destructive">{t('purchasing.orders.receive.notReceivable')}</p>;
  }

  const remainingByLine = po.lines.map((line) => {
    const receivedSoFar = receivedByProduct.get(line.productId) ?? 0;
    return { line, receivedSoFar, remaining: Math.max(line.qty - receivedSoFar, 0) };
  });
  const allReceived = remainingByLine.every((entry) => entry.remaining === 0);

  async function handleSubmit() {
    const lines = remainingByLine
      .map((entry) => ({
        poLineId: entry.line.id,
        productId: entry.line.productId,
        receivedQty: Math.min(quantities[entry.line.id] ?? entry.remaining, entry.remaining),
      }))
      .filter((line) => line.receivedQty > 0);

    if (lines.length === 0) {
      toast({ title: t('purchasing.orders.receive.nothingToReceive'), variant: 'destructive' });
      return;
    }

    try {
      await receiveMutation.mutateAsync({ id: poId, lines });
      void navigate({ to: '/purchasing/orders/$poId', params: { poId } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link
        to="/purchasing/orders/$poId"
        params={{ poId }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('purchasing.orders.receive.backToOrder')}
      </Link>

      <h1 className="text-xl font-semibold">
        {t('purchasing.orders.receive.title')} — {po.number}
      </h1>

      {allReceived ? (
        <p className="text-muted-foreground">{t('purchasing.orders.receive.allReceived')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">{t('purchasing.orders.receive.productColumn')}</th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.orders.receive.orderedColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.orders.receive.receivedColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.orders.receive.remainingColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.orders.receive.receiveNowColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {remainingByLine.map(({ line, receivedSoFar, remaining }) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {productsById.get(line.productId) ?? line.productId}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(line.qty)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(receivedSoFar)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(remaining)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        disabled={remaining === 0}
                        className="text-right"
                        value={quantities[line.id] ?? remaining}
                        onChange={(event) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [line.id]: Math.max(
                              0,
                              Math.min(remaining, Number(event.target.value) || 0),
                            ),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            className="w-fit"
            onClick={() => void handleSubmit()}
            disabled={receiveMutation.isPending}
          >
            {receiveMutation.isPending
              ? t('purchasing.orders.receive.submitting')
              : t('purchasing.orders.receive.submitButton')}
          </Button>
        </>
      )}
    </div>
  );
}
