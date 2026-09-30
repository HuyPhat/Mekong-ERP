import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { formatNumber } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import {
  useSalesOrder,
  useDeliveries,
  useDeliverSalesOrder,
} from '../../../../../features/sales/queries';

export const Route = createFileRoute('/_app/sales/orders/$soId/deliver')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesWrite),
  component: DeliverSalesOrderPage,
});

function DeliverSalesOrderPage() {
  const { t } = useTranslation();
  const { soId } = Route.useParams();
  const navigate = useNavigate();

  const { data: so, isLoading, isError } = useSalesOrder(soId);
  const { data: deliveriesData } = useDeliveries({ page: 1, pageSize: 200, filters: { soId } });
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });
  const deliverMutation = useDeliverSalesOrder();

  const productsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsData?.data ?? []) map.set(product.id, product.name);
    return map;
  }, [productsData]);

  const deliveredByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const delivery of deliveriesData?.data ?? []) {
      for (const line of delivery.lines) {
        map.set(line.productId, (map.get(line.productId) ?? 0) + line.deliveredQty);
      }
    }
    return map;
  }, [deliveriesData]);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (isLoading) {
    return <p className="text-muted-foreground">{t('sales.orders.deliver.loading')}</p>;
  }
  if (isError || !so) {
    return <p className="text-destructive">{t('sales.orders.deliver.notFound')}</p>;
  }
  if (so.status !== 'confirmed' && so.status !== 'partially_delivered') {
    return <p className="text-destructive">{t('sales.orders.deliver.notDeliverable')}</p>;
  }

  const remainingByLine = so.lines.map((line) => {
    const deliveredSoFar = deliveredByProduct.get(line.productId) ?? 0;
    return { line, deliveredSoFar, remaining: Math.max(line.qty - deliveredSoFar, 0) };
  });
  const allDelivered = remainingByLine.every((entry) => entry.remaining === 0);

  async function handleSubmit() {
    const lines = remainingByLine
      .map((entry) => ({
        soLineId: entry.line.id,
        productId: entry.line.productId,
        deliveredQty: Math.min(quantities[entry.line.id] ?? entry.remaining, entry.remaining),
      }))
      .filter((line) => line.deliveredQty > 0);

    if (lines.length === 0) {
      toast({ title: t('sales.orders.deliver.nothingToDeliver'), variant: 'destructive' });
      return;
    }

    try {
      await deliverMutation.mutateAsync({ id: soId, lines });
      void navigate({ to: '/sales/orders/$soId', params: { soId } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link
        to="/sales/orders/$soId"
        params={{ soId }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('sales.orders.deliver.backToOrder')}
      </Link>

      <h1 className="text-xl font-semibold">
        {t('sales.orders.deliver.title')} — {so.number}
      </h1>

      {allDelivered ? (
        <p className="text-muted-foreground">{t('sales.orders.deliver.allDelivered')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">{t('sales.orders.deliver.productColumn')}</th>
                  <th className="px-3 py-2 text-right">
                    {t('sales.orders.deliver.orderedColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('sales.orders.deliver.deliveredColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('sales.orders.deliver.remainingColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('sales.orders.deliver.deliverNowColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {remainingByLine.map(({ line, deliveredSoFar, remaining }) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {productsById.get(line.productId) ?? line.productId}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(line.qty)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(deliveredSoFar)}</td>
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
            disabled={deliverMutation.isPending}
          >
            {deliverMutation.isPending
              ? t('sales.orders.deliver.submitting')
              : t('sales.orders.deliver.submitButton')}
          </Button>
        </>
      )}
    </div>
  );
}
