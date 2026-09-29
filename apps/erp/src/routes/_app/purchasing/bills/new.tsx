import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select, toast } from '@mekong-erp/ui';
import {
  PERMISSIONS,
  computeLineTotal,
  computeDocumentTotals,
  type VatRate,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { formatNumber, formatVnd } from '../../../../shared/lib/format';
import { useProducts } from '../../../../features/inventory/queries';
import {
  usePurchaseOrders,
  useGoodsReceipts,
  useCreateVendorBill,
} from '../../../../features/purchasing/queries';
import { VendorBillNewSearchSchema } from '../../../../features/purchasing/search-schemas';
import { ComboboxField } from '../../../../shared/components/combobox-field';

export const Route = createFileRoute('/_app/purchasing/bills/new')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingWrite),
  validateSearch: VendorBillNewSearchSchema,
  component: NewVendorBillPage,
});

const VAT_RATES: VatRate[] = [0, 5, 8, 10];

interface BillLineState {
  qty: number;
  unitPrice: number;
  vatRate: VatRate;
}

function NewVendorBillPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { data: poData } = usePurchaseOrders({
    page: 1,
    pageSize: 200,
    filters: { status: 'received,partially_received' },
  });
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const [poId, setPoId] = useState<string | undefined>(search.poId);
  const { data: grnsData } = useGoodsReceipts({
    page: 1,
    pageSize: 200,
    filters: { poId: poId ?? '' },
  });
  const createMutation = useCreateVendorBill();

  const poOptions = useMemo(
    () =>
      (poData?.data ?? []).map((po) => ({
        value: po.id,
        label: po.number,
        description: po.supplierName,
      })),
    [poData],
  );
  const selectedPo = (poData?.data ?? []).find((po) => po.id === poId);

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

  const [lineState, setLineState] = useState<Record<string, BillLineState>>({});

  function stateFor(poLineId: string, defaults: BillLineState): BillLineState {
    return lineState[poLineId] ?? defaults;
  }

  const billableLines = (selectedPo?.lines ?? []).map((line) => {
    const receivedQty = receivedByProduct.get(line.productId) ?? 0;
    const state = stateFor(line.id, {
      qty: receivedQty,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    });
    return { line, receivedQty, state };
  });

  const computedTotal = computeDocumentTotals(
    billableLines
      .filter(({ state }) => state.qty > 0)
      .map(({ state }) => ({
        lineTotal: computeLineTotal(state.qty, state.unitPrice, 0),
        vatRate: state.vatRate,
      })),
  );

  async function handleSubmit() {
    if (!selectedPo) {
      toast({ title: t('purchasing.bills.new.selectPoFirst'), variant: 'destructive' });
      return;
    }
    const lines = billableLines
      .filter(({ state }) => state.qty > 0)
      .map(({ line, state }) => ({
        poLineId: line.id,
        productId: line.productId,
        qty: state.qty,
        unitPrice: state.unitPrice,
        vatRate: state.vatRate,
      }));
    if (lines.length === 0) {
      toast({ title: t('purchasing.orders.receive.nothingToReceive'), variant: 'destructive' });
      return;
    }
    try {
      const bill = await createMutation.mutateAsync({ poId: selectedPo.id, lines });
      void navigate({ to: '/purchasing/bills/$billId', params: { billId: bill.id } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('purchasing.bills.new.title')}</h1>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{t('purchasing.bills.new.poLabel')}</label>
        <ComboboxField
          value={poId}
          selectedLabel={selectedPo?.number}
          onSelect={(value) => {
            setPoId(value);
            setLineState({});
          }}
          options={poOptions}
          placeholder={t('purchasing.bills.new.poPlaceholder')}
          searchPlaceholder={t('purchasing.bills.new.poPlaceholder')}
          emptyMessage={t('purchasing.orders.empty')}
        />
      </div>

      {selectedPo && (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">{t('purchasing.bills.new.productColumn')}</th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.bills.new.orderedColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.bills.new.receivedColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">{t('purchasing.bills.new.qtyColumn')}</th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.bills.new.unitPriceColumn')}
                  </th>
                  <th className="px-3 py-2 text-right">{t('purchasing.bills.new.vatColumn')}</th>
                  <th className="px-3 py-2 text-right">
                    {t('purchasing.bills.new.lineTotalColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {billableLines.map(({ line, receivedQty, state }) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {productsById.get(line.productId) ?? line.productId}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(line.qty)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(receivedQty)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={state.qty}
                        onChange={(event) =>
                          setLineState((prev) => ({
                            ...prev,
                            [line.id]: {
                              ...state,
                              qty: Math.max(0, Number(event.target.value) || 0),
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={state.unitPrice}
                        onChange={(event) =>
                          setLineState((prev) => ({
                            ...prev,
                            [line.id]: {
                              ...state,
                              unitPrice: Math.max(0, Number(event.target.value) || 0),
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Select
                        className="text-right"
                        value={state.vatRate}
                        onChange={(event) =>
                          setLineState((prev) => ({
                            ...prev,
                            [line.id]: { ...state, vatRate: Number(event.target.value) as VatRate },
                          }))
                        }
                      >
                        {VAT_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}%
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatVnd(computeLineTotal(state.qty, state.unitPrice, 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="flex flex-col items-end gap-1 text-sm">
            <div className="flex w-64 justify-between font-semibold">
              <dt>{t('purchasing.orders.wizard.review.grandTotal')}</dt>
              <dd>{formatVnd(computedTotal.grandTotal)}</dd>
            </div>
          </dl>

          <Button
            className="w-fit"
            onClick={() => void handleSubmit()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? t('purchasing.bills.new.submitting')
              : t('purchasing.bills.new.submitButton')}
          </Button>
        </>
      )}
    </div>
  );
}
