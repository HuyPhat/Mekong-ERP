import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
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
  type QuotationLineInput,
} from '@mekong-erp/contract';
import { useWarehouses, useProducts } from '../inventory/queries';
import { useCustomers, useCreateQuotation } from './queries';
import {
  QuotationFormSchema,
  createBlankQuotationLine,
  type QuotationFormInput,
  type QuotationFormValues,
} from './quotation-form-schema';
import {
  buildWizardDraftBannerLabels,
  buildLineItemsTableLabels,
} from '../../shared/lib/form-kit-labels';
import { ComboboxField } from '../../shared/components/combobox-field';
import { formatVnd } from '../../shared/lib/format';

const VAT_RATES = [0, 5, 8, 10] as const;

export function QuotationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: customersData } = useCustomers({ page: 1, pageSize: 500 });
  const { data: warehousesData } = useWarehouses();
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });
  const createMutation = useCreateQuotation();

  const form = useForm<QuotationFormInput, unknown, QuotationFormValues>({
    resolver: zodResolver(QuotationFormSchema),
    defaultValues: {
      customerId: '',
      customerLabel: undefined,
      warehouseId: '',
      validUntil: '',
      terms: '',
      lines: [createBlankQuotationLine()],
    },
  });
  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const draft = useWizardDraft('quotation-form', form);

  const customerOptions = useMemo(
    () =>
      (customersData?.data ?? []).map((c) => ({ value: c.id, label: c.name, description: c.code })),
    [customersData],
  );
  const productOptions = useMemo(
    () =>
      (productsData?.data ?? []).map((p) => ({ value: p.id, label: p.name, description: p.sku })),
    [productsData],
  );

  const watchedLines = watch('lines');
  const computedLines = useMemo(
    () =>
      watchedLines.map((line) => {
        const qty = Number(line.qty) || 0;
        const unitPrice = Number(line.unitPrice) || 0;
        const discountPct = Number(line.discountPct) || 0;
        return {
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

  function buildInput(values: QuotationFormValues): {
    customerId: string;
    warehouseId: string;
    validUntil: string;
    terms: string;
    lines: QuotationLineInput[];
  } {
    return {
      customerId: values.customerId,
      warehouseId: values.warehouseId,
      validUntil: values.validUntil,
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      const quotation = await createMutation.mutateAsync(buildInput(values));
      draft.discardDraft();
      toast({ title: t('sales.quotations.form.createSuccess') });
      void navigate({
        to: '/sales/quotations/$quotationId',
        params: { quotationId: quotation.id },
      });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  });

  return (
    <Form {...form}>
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold">{t('sales.quotations.form.title')}</h1>

        {draft.hasDraft && (
          <WizardDraftBanner
            onResume={draft.resumeDraft}
            onDiscard={draft.discardDraft}
            labels={buildWizardDraftBannerLabels(t)}
          />
        )}

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('sales.quotations.form.customerSection')}
          </h2>
          <FormField
            control={control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('sales.quotations.form.customerLabel')}</FormLabel>
                <FormControl>
                  <ComboboxField
                    value={field.value}
                    selectedLabel={watch('customerLabel')}
                    onSelect={(value) => {
                      field.onChange(value);
                      setValue(
                        'customerLabel',
                        customerOptions.find((option) => option.value === value)?.label,
                      );
                    }}
                    options={customerOptions}
                    placeholder={t('sales.quotations.form.customerPlaceholder')}
                    searchPlaceholder={t('sales.quotations.form.customerPlaceholder')}
                    emptyMessage={t('sales.customers.empty')}
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
                <FormLabel>{t('sales.quotations.form.warehouseLabel')}</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">{t('sales.quotations.form.warehousePlaceholder')}</option>
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

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('sales.quotations.form.linesSection')}
          </h2>
          <LineItemsTable
            columns={[
              {
                key: 'product',
                header: t('sales.quotations.form.productColumn'),
                className: 'w-64',
              },
              {
                key: 'qty',
                header: t('sales.quotations.form.qtyColumn'),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'unitPrice',
                header: t('sales.quotations.form.unitPriceColumn'),
                className: 'w-32',
                align: 'right',
              },
              {
                key: 'discountPct',
                header: t('sales.quotations.form.discountColumn'),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'vatRate',
                header: t('sales.quotations.form.vatColumn'),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'lineTotal',
                header: t('sales.quotations.form.lineTotalColumn'),
                className: 'w-32',
                align: 'right',
              },
            ]}
            rows={fields}
            onAddRow={() => append(createBlankQuotationLine())}
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
                        placeholder={t('sales.quotations.form.productPlaceholder')}
                        searchPlaceholder={t('sales.quotations.form.productPlaceholder')}
                        emptyMessage={t('inventory.products.empty')}
                      />
                    )}
                  />
                );
              }
              if (columnKey === 'qty' || columnKey === 'unitPrice' || columnKey === 'discountPct') {
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
          <dl className="flex flex-col items-end gap-1 text-sm">
            <div className="flex w-64 justify-between">
              <dt className="text-muted-foreground">{t('sales.quotations.form.subtotal')}</dt>
              <dd>{formatVnd(totals.subtotal)}</dd>
            </div>
            <div className="flex w-64 justify-between">
              <dt className="text-muted-foreground">{t('sales.quotations.form.vatTotal')}</dt>
              <dd>{formatVnd(totals.vatTotal)}</dd>
            </div>
            <div className="flex w-64 justify-between font-semibold">
              <dt>{t('sales.quotations.form.grandTotal')}</dt>
              <dd>{formatVnd(totals.grandTotal)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('sales.quotations.form.termsSection')}
          </h2>
          <FormField
            control={control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('sales.quotations.form.validUntilLabel')}</FormLabel>
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
                <FormLabel>{t('sales.quotations.form.termsLabel')}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t('sales.quotations.form.termsPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={createMutation.isPending} onClick={() => void onSubmit()}>
            {createMutation.isPending
              ? t('sales.quotations.form.submitting')
              : t('sales.quotations.form.submitButton')}
          </Button>
        </div>
      </div>
    </Form>
  );
}
