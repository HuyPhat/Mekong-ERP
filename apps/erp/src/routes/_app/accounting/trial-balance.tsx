import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { formatVnd } from '../../../shared/lib/format';
import { useTrialBalance } from '../../../features/accounting/queries';

export const Route = createFileRoute('/_app/accounting/trial-balance')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useTrialBalance();
  const balanced = data ? data.totals.debit === data.totals.credit : true;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {data && (
          <StatusBadge tone={balanced ? 'success' : 'destructive'}>
            {balanced
              ? t('accounting.trialBalance.balanced')
              : t('accounting.trialBalance.unbalanced')}
          </StatusBadge>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t('accounting.trialBalance.columns.accountCode')}</th>
              <th className="px-3 py-2">{t('accounting.trialBalance.columns.accountName')}</th>
              <th className="px-3 py-2 text-right">{t('accounting.trialBalance.columns.debit')}</th>
              <th className="px-3 py-2 text-right">
                {t('accounting.trialBalance.columns.credit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.trialBalance.loading')}
                </td>
              </tr>
            ) : (
              (data?.rows ?? []).map((row) => (
                <tr key={row.accountCode} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{row.accountCode}</td>
                  <td className="px-3 py-2">{row.accountName}</td>
                  <td className="px-3 py-2 text-right">
                    {row.debit > 0 ? formatVnd(row.debit) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.credit > 0 ? formatVnd(row.credit) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data && (
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  {t('accounting.trialBalance.totalsRow')}
                </td>
                <td className="px-3 py-2 text-right">{formatVnd(data.totals.debit)}</td>
                <td className="px-3 py-2 text-right">{formatVnd(data.totals.credit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
