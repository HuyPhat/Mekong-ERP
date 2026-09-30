import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Wizard,
  WizardFooter,
  WizardDraftBanner,
  useWizardDraft,
  LineItemsTable,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  Button,
  toast,
} from '@mekong-erp/ui';
import {
  computeLineTotal,
  computeDocumentTotals,
  type PurchaseOrderLineInput,
} from '@mekong-erp/contract';
import { useWarehouses, useProducts } from '../inventory/queries';
import { useSuppliers, useCreatePurchaseOrder, useSubmitPurchaseOrder } from './queries';
import {
  PoWizardSchema,
  createBlankWizardLine,
  type PoWizardInput,
  type PoWizardValues,
} from './po-wizard-schema';
import {
  buildWizardFooterLabels,
  buildWizardDraftBannerLabels,
  buildLineItemsTableLabels,
} from '../../shared/lib/form-kit-labels';
import { ComboboxField } from '../../shared/components/combobox-field';
import { formatVnd } from '../../shared/lib/format';

const VAT_RATES = [0, 5, 8, 10] as const;

const STEP_FIELD_NAMES: (keyof PoWizardInput)[][] = [
  ['supplierId', 'warehouseId'],
  ['lines'],
  ['deliveryDate', 'terms'],
  [],
];

export function PoWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const { data: suppliersData } = useSuppliers({ page: 1, pageSize: 200 });
  const { data: warehousesData } = useWarehouses();
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const createMutation = useCreatePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();

  const form = useForm<PoWizardInput, unknown, PoWizardValues>({
    resolver: zodResolver(PoWizardSchema),
    defaultValues: {
      supplierId: '',
      supplierLabel: undefined,
      warehouseId: '',
      deliveryDate: '',
      terms: '',
      lines: [createBlankWizardLine()],
    },
  });
  const { control, handleSubmit, watch, setValue, trigger } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const draft = useWizardDraft('po-wizard', form);

  const supplierOptions = useMemo(
    () =>
      (suppliersData?.data ?? []).map((s) => ({ value: s.id, label: s.name, description: s.code })),
    [suppliersData],
  );
  const productOptions = useMemo(
    () =>
      (productsData?.data ?? []).map((p) => ({ value: p.id, label: p.name, description: p.sku })),
    [productsData],
  );

  // `watch('lines')` returns RHF's own array, mutated in place as fields change, so a
  // useMemo keyed on it never recomputes (the review totals went stale). useWatch
  // hands back a fresh value on every change.
  const watchedLines = useWatch({ control, name: 'lines' });
  const computedLines = useMemo(
    () =>
      watchedLines.map((line) => {
        const qty = Number(line.qty) || 0;
        const unitPrice = Number(line.unitPrice) || 0;
        const discountPct = Number(line.discountPct) || 0;
        return {
          productId: line.productId,
          productLabel: line.productLabel,
          qty,
          unitPrice,
          discountPct,
          vatRate: line.vatRate,
          lineTotal: computeLineTotal(qty, unitPrice, discountPct),
        };
      }),
    [watchedLines],
  );
  const totals = useMemo(
    () =>
      computeDocumentTotals(
        computedLines.map((line) => ({ lineTotal: line.lineTotal, vatRate: line.vatRate })),
      ),
    [computedLines],
  );

  const steps = [
    { id: 'supplier', title: t('purchasing.orders.wizard.steps.supplier') },
    { id: 'lines', title: t('purchasing.orders.wizard.steps.lines') },
    { id: 'terms', title: t('purchasing.orders.wizard.steps.terms') },
    { id: 'review', title: t('purchasing.orders.wizard.steps.review') },
  ];

  async function handleNext() {
    const names = STEP_FIELD_NAMES[stepIndex] ?? [];
    const valid = names.length > 0 ? await trigger(names) : true;
    if (valid) setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function buildInput(values: PoWizardValues): {
    supplierId: string;
    warehouseId: string;
    deliveryDate: string;
    terms: string;
    lines: PurchaseOrderLineInput[];
  } {
    return {
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      deliveryDate: values.deliveryDate,
      terms: values.terms,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct,
        vatRate: line.vatRate,
      })),
    };
  }

  const onCreateAndSubmit = handleSubmit(async (values) => {
    try {
      const po = await createMutation.mutateAsync(buildInput(values));
      draft.discardDraft();
      try {
        await submitMutation.mutateAsync(po.id);
        toast({ title: t('purchasing.orders.wizard.review.submitSuccess') });
      } catch {
        toast({
          title: t('purchasing.orders.wizard.review.submitPartialError'),
          variant: 'destructive',
        });
      }
      void navigate({ to: '/purchasing/orders/$poId', params: { poId: po.id } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  });

  const onSaveDraft = handleSubmit(async (values) => {
    try {
      const po = await createMutation.mutateAsync(buildInput(values));
      draft.discardDraft();
      toast({ title: t('purchasing.orders.wizard.review.draftSaved') });
      void navigate({ to: '/purchasing/orders/$poId', params: { poId: po.id } });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  });

  const isSubmitting = createMutation.isPending || submitMutation.isPending;

  return (
    <Form {...form}>
      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-xl font-semibold">{t('purchasing.orders.wizard.createTitle')}</h1>

        {draft.hasDraft && (
          <WizardDraftBanner
            onResume={draft.resumeDraft}
            onDiscard={draft.discardDraft}
            labels={buildWizardDraftBannerLabels(t)}
          />
        )}

        <Wizard steps={steps} currentStepIndex={stepIndex}>
          {stepIndex === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t('purchasing.orders.wizard.supplier.title')}
              </h2>
              <FormField
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('purchasing.orders.wizard.supplier.supplierLabel')}</FormLabel>
                    <FormControl>
                      <ComboboxField
                        value={field.value}
                        selectedLabel={watch('supplierLabel')}
                        onSelect={(value) => {
                          field.onChange(value);
                          setValue(
                            'supplierLabel',
                            supplierOptions.find((option) => option.value === value)?.label,
                          );
                        }}
                        options={supplierOptions}
                        placeholder={t('purchasing.orders.wizard.supplier.supplierPlaceholder')}
                        searchPlaceholder={t(
                          'purchasing.orders.wizard.supplier.supplierPlaceholder',
                        )}
                        emptyMessage={t('purchasing.suppliers.empty')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('purchasing.orders.wizard.supplier.warehouseLabel')}</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="">
                          {t('purchasing.orders.wizard.supplier.warehousePlaceholder')}
                        </option>
                        {(warehousesData?.data ?? []).map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} ({warehouse.code})
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {stepIndex === 1 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t('purchasing.orders.wizard.lines.title')}
              </h2>
              <LineItemsTable
                columns={[
                  {
                    key: 'product',
                    header: t('purchasing.orders.wizard.lines.productColumn'),
                    className: 'w-64',
                  },
                  {
                    key: 'qty',
                    header: t('purchasing.orders.wizard.lines.qtyColumn'),
                    className: 'w-24',
                    align: 'right',
                  },
                  {
                    key: 'unitPrice',
                    header: t('purchasing.orders.wizard.lines.unitPriceColumn'),
                    className: 'w-32',
                    align: 'right',
                  },
                  {
                    key: 'discountPct',
                    header: t('purchasing.orders.wizard.lines.discountColumn'),
                    className: 'w-24',
                    align: 'right',
                  },
                  {
                    key: 'vatRate',
                    header: t('purchasing.orders.wizard.lines.vatColumn'),
                    className: 'w-24',
                    align: 'right',
                  },
                  {
                    key: 'lineTotal',
                    header: t('purchasing.orders.wizard.lines.lineTotalColumn'),
                    className: 'w-32',
                    align: 'right',
                  },
                ]}
                rows={fields}
                onAddRow={() => append(createBlankWizardLine())}
                onRemoveRow={(index) => remove(index)}
                canRemoveRow={() => fields.length > 1}
                labels={buildLineItemsTableLabels(t)}
                renderCell={(_row, index, columnKey) => {
                  if (columnKey === 'product') {
                    return (
                      <Controller
                        control={control}
                        name={`lines.${index}.productId`}
                        render={({ field }) => (
                          <ComboboxField
                            value={field.value}
                            selectedLabel={watch(`lines.${index}.productLabel`)}
                            onSelect={(value) => {
                              field.onChange(value);
                              setValue(
                                `lines.${index}.productLabel`,
                                productOptions.find((option) => option.value === value)?.label,
                              );
                            }}
                            options={productOptions}
                            placeholder={t('purchasing.orders.wizard.lines.productPlaceholder')}
                            searchPlaceholder={t(
                              'purchasing.orders.wizard.lines.productPlaceholder',
                            )}
                            emptyMessage={t('inventory.products.empty')}
                          />
                        )}
                      />
                    );
                  }
                  if (
                    columnKey === 'qty' ||
                    columnKey === 'unitPrice' ||
                    columnKey === 'discountPct'
                  ) {
                    return (
                      <Controller
                        control={control}
                        name={`lines.${index}.${columnKey}`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            className="text-right"
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === '' ? '' : Number(event.target.value),
                              )
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        )}
                      />
                    );
                  }
                  if (columnKey === 'vatRate') {
                    return (
                      <Controller
                        control={control}
                        name={`lines.${index}.vatRate`}
                        render={({ field }) => (
                          <Select
                            className="text-right"
                            value={String(field.value)}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                          >
                            {VAT_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </Select>
                        )}
                      />
                    );
                  }
                  const computed = computedLines[index];
                  return <span>{computed ? formatVnd(computed.lineTotal) : '—'}</span>;
                }}
              />
            </div>
          )}

          {stepIndex === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t('purchasing.orders.wizard.terms.title')}
              </h2>
              <FormField
                control={control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('purchasing.orders.wizard.terms.deliveryDateLabel')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('purchasing.orders.wizard.terms.termsLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('purchasing.orders.wizard.terms.termsPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {stepIndex === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t('purchasing.orders.wizard.review.title')}
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">
                  {t('purchasing.orders.wizard.review.supplierLabel')}
                </dt>
                <dd>{watch('supplierLabel')}</dd>
                <dt className="text-muted-foreground">
                  {t('purchasing.orders.wizard.review.warehouseLabel')}
                </dt>
                <dd>
                  {
                    (warehousesData?.data ?? []).find(
                      (warehouse) => warehouse.id === watch('warehouseId'),
                    )?.name
                  }
                </dd>
                <dt className="text-muted-foreground">
                  {t('purchasing.orders.wizard.review.deliveryDateLabel')}
                </dt>
                <dd>{watch('deliveryDate')}</dd>
                <dt className="text-muted-foreground">
                  {t('purchasing.orders.wizard.review.termsLabel')}
                </dt>
                <dd>{watch('terms')}</dd>
              </dl>

              <div className="rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">
                        {t('purchasing.orders.wizard.lines.productColumn')}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('purchasing.orders.wizard.lines.qtyColumn')}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('purchasing.orders.wizard.lines.unitPriceColumn')}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('purchasing.orders.wizard.lines.lineTotalColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedLines.map((line, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{line.productLabel ?? line.productId}</td>
                        <td className="px-3 py-2 text-right">{line.qty}</td>
                        <td className="px-3 py-2 text-right">{formatVnd(line.unitPrice)}</td>
                        <td className="px-3 py-2 text-right">{formatVnd(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="flex flex-col items-end gap-1 text-sm">
                <div className="flex w-64 justify-between">
                  <dt className="text-muted-foreground">
                    {t('purchasing.orders.wizard.review.subtotal')}
                  </dt>
                  <dd>{formatVnd(totals.subtotal)}</dd>
                </div>
                <div className="flex w-64 justify-between">
                  <dt className="text-muted-foreground">
                    {t('purchasing.orders.wizard.review.vatTotal')}
                  </dt>
                  <dd>{formatVnd(totals.vatTotal)}</dd>
                </div>
                <div className="flex w-64 justify-between font-semibold">
                  <dt>{t('purchasing.orders.wizard.review.grandTotal')}</dt>
                  <dd>{formatVnd(totals.grandTotal)}</dd>
                </div>
              </dl>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => void onSaveDraft()}
                >
                  {t('purchasing.orders.wizard.review.saveDraftButton')}
                </Button>
              </div>
            </div>
          )}
        </Wizard>

        <WizardFooter
          isFirstStep={stepIndex === 0}
          isLastStep={stepIndex === steps.length - 1}
          isSubmitting={isSubmitting}
          onBack={() => setStepIndex((index) => Math.max(index - 1, 0))}
          onNext={() => void handleNext()}
          onSubmit={() => void onCreateAndSubmit()}
          labels={{
            ...buildWizardFooterLabels(t),
            submit: isSubmitting
              ? t('purchasing.orders.wizard.review.submitting')
              : t('purchasing.orders.wizard.review.submitButton'),
          }}
        />
      </div>
    </Form>
  );
}
