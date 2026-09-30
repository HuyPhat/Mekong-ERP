import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useChartOfAccounts } from '../../../features/accounting/queries';

export const Route = createFileRoute('/_app/accounting/chart-of-accounts')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: ChartOfAccountsPage,
});

function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useChartOfAccounts();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t('accounting.chartOfAccounts.note')}</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t('accounting.chartOfAccounts.columns.code')}</th>
              <th className="px-3 py-2">{t('accounting.chartOfAccounts.columns.name')}</th>
              <th className="px-3 py-2">{t('accounting.chartOfAccounts.columns.type')}</th>
              <th className="px-3 py-2">{t('accounting.chartOfAccounts.columns.normalBalance')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.chartOfAccounts.loading')}
                </td>
              </tr>
            ) : (
              (accounts ?? []).map((account) => (
                <tr key={account.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{account.code}</td>
                  <td className="px-3 py-2">{account.name}</td>
                  <td className="px-3 py-2">{t(`accounting.accountTypes.${account.type}`)}</td>
                  <td className="px-3 py-2">
                    {t(`accounting.normalBalance.${account.normalBalance}`)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
