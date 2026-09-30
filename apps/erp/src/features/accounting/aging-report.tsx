import { useTranslation } from 'react-i18next';
import type { AgingRow, AgingSummary } from '@mekong-erp/contract';
import { formatDate, formatVnd } from '../../shared/lib/format';

export interface AgingReportProps {
  data: { rows: AgingRow[]; summary: AgingSummary[] } | undefined;
  isLoading: boolean;
  partyLabelKey: string;
}

/** Shared table+summary layout for the AR and AP aging reports — identical shape, different data source. */
export function AgingReport({ data, isLoading, partyLabelKey }: AgingReportProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(data?.summary ?? []).map((bucket) => (
          <div key={bucket.bucket} className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">
              {t(`accounting.aging.buckets.${bucket.bucket}`)}
            </p>
            <p className="text-lg font-semibold tabular-nums">{formatVnd(bucket.total)}</p>
            <p className="text-xs text-muted-foreground">
              {t('accounting.aging.docCount', { count: bucket.count })}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t('accounting.aging.columns.number')}</th>
              <th className="px-3 py-2">{t(partyLabelKey)}</th>
              <th className="px-3 py-2">{t('accounting.aging.columns.dueDate')}</th>
              <th className="px-3 py-2 text-right">{t('accounting.aging.columns.daysOverdue')}</th>
              <th className="px-3 py-2">{t('accounting.aging.columns.bucket')}</th>
              <th className="px-3 py-2 text-right">{t('accounting.aging.columns.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.aging.loading')}
                </td>
              </tr>
            ) : (data?.rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.aging.empty')}
                </td>
              </tr>
            ) : (
              (data?.rows ?? []).map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{row.number}</td>
                  <td className="px-3 py-2">{row.partyName}</td>
                  <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                  <td className="px-3 py-2 text-right">{row.daysOverdue}</td>
                  <td className="px-3 py-2">{t(`accounting.aging.buckets.${row.bucket}`)}</td>
                  <td className="px-3 py-2 text-right">{formatVnd(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
