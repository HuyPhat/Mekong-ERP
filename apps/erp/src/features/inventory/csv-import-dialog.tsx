import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  parseCsvFile,
  validateImportRows,
  type CsvParseResult,
  type ImportRowResult,
} from '@mekong-erp/ui';
import { ProductImportRowSchema, type ProductImportRow } from '@mekong-erp/contract';
import { useImportProducts } from './queries';

const PRODUCT_FIELDS: { key: keyof ProductImportRow; labelKey: string }[] = [
  { key: 'sku', labelKey: 'inventory.products.columns.sku' },
  { key: 'name', labelKey: 'inventory.products.columns.name' },
  { key: 'category', labelKey: 'inventory.products.columns.category' },
  { key: 'unit', labelKey: 'inventory.products.columns.unit' },
  { key: 'costPrice', labelKey: 'inventory.products.columns.costPrice' },
  { key: 'salePrice', labelKey: 'inventory.products.columns.salePrice' },
  { key: 'reorderPoint', labelKey: 'inventory.products.columns.reorderPoint' },
];

type Step = 'pick' | 'map' | 'preview' | 'done';

export interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('pick');
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ImportRowResult<ProductImportRow>[]>([]);
  const importMutation = useImportProducts();

  function reset() {
    setStep('pick');
    setParsed(null);
    setMapping({});
    setResults([]);
    importMutation.reset();
  }

  async function handleFile(file: File) {
    const result = await parseCsvFile(file);
    const autoMap: Record<string, string> = {};
    for (const field of PRODUCT_FIELDS) {
      const match = result.headers.find(
        (header) => header.toLowerCase() === field.key.toLowerCase(),
      );
      if (match) autoMap[field.key] = match;
    }
    setParsed(result);
    setMapping(autoMap);
    setStep('map');
  }

  function runValidation() {
    if (!parsed) return;
    const rows = validateImportRows(parsed.rows, (raw) => {
      const mapped: Record<string, string> = {};
      for (const field of PRODUCT_FIELDS) {
        const header = mapping[field.key];
        mapped[field.key] = header ? (raw[header] ?? '') : '';
      }
      const result = ProductImportRowSchema.safeParse(mapped);
      if (!result.success) {
        return { errors: result.error.issues.map((issue) => issue.message) };
      }
      return { data: result.data };
    });
    setResults(rows);
    setStep('preview');
  }

  const validRows = useMemo(
    () => results.flatMap((row) => (row.data ? [row.data] : [])),
    [results],
  );
  const invalidCount = results.length - validRows.length;

  async function handleCommit() {
    await importMutation.mutateAsync(validRows);
    setStep('done');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t('inventory.products.import.title')}</DialogTitle>
        <DialogDescription>{t('inventory.products.import.description')}</DialogDescription>

        {step === 'pick' && (
          <div className="mt-4">
            <label className="flex flex-col gap-2 text-sm">
              {t('inventory.products.import.pickFile')}
              <input
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="text-sm"
              />
            </label>
          </div>
        )}

        {step === 'map' && parsed && (
          <div className="mt-4 flex flex-col gap-2">
            {PRODUCT_FIELDS.map((field) => (
              <label key={field.key} className="flex items-center justify-between gap-2 text-sm">
                {t(field.labelKey)}
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(event) =>
                    setMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">{t('inventory.products.import.noColumn')}</option>
                  {parsed.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                {t('inventory.products.import.cancel')}
              </Button>
              <Button onClick={runValidation}>{t('inventory.products.import.validate')}</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm">
              {t('inventory.products.import.summary', {
                valid: validRows.length,
                invalid: invalidCount,
              })}
            </p>
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {results.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-border last:border-0">
                      <td className="p-1 tabular-nums text-muted-foreground">{row.rowNumber}</td>
                      <td className="p-1">
                        {row.errors ? (
                          <span className="text-destructive">{row.errors.join('; ')}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t('inventory.products.import.rowOk')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                {t('inventory.products.import.cancel')}
              </Button>
              <Button
                onClick={() => void handleCommit()}
                disabled={validRows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending
                  ? t('inventory.products.import.committing')
                  : t('inventory.products.import.commit', { count: validRows.length })}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && importMutation.data && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm">
              {t('inventory.products.import.done', {
                succeeded: importMutation.data.succeeded,
                failed: importMutation.data.failed,
              })}
            </p>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                {t('inventory.products.import.close')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
