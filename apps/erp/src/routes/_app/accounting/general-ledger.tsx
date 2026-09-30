import { z } from '@mekong-erp/contract';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Select } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { formatDate, formatVnd } from '../../../shared/lib/format';
import { useChartOfAccounts, useGeneralLedger } from '../../../features/accounting/queries';

const GeneralLedgerSearchSchema = z.object({
  accountCode: z.string().optional(),
});

export const Route = createFileRoute('/_app/accounting/general-ledger')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  validateSearch: GeneralLedgerSearchSchema,
  component: GeneralLedgerPage,
});

function GeneralLedgerPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: accounts } = useChartOfAccounts();
  const accountCode = search.accountCode ?? accounts?.[0]?.code ?? '';
  const { data: rows, isLoading } = useGeneralLedger(accountCode);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:w-80">
        <label className="text-sm font-medium">{t('accounting.generalLedger.accountLabel')}</label>
        <Select
          value={accountCode}
          onChange={(event) =>
            void navigate({ search: { accountCode: event.target.value || undefined } })
          }
        >
          {(accounts ?? []).map((account) => (
            <option key={account.id} value={account.code}>
              {account.code} — {account.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t('accounting.generalLedger.columns.date')}</th>
              <th className="px-3 py-2">{t('accounting.generalLedger.columns.journalNumber')}</th>
              <th className="px-3 py-2">{t('accounting.generalLedger.columns.description')}</th>
              <th className="px-3 py-2 text-right">
                {t('accounting.generalLedger.columns.debit')}
              </th>
              <th className="px-3 py-2 text-right">
                {t('accounting.generalLedger.columns.credit')}
              </th>
              <th className="px-3 py-2 text-right">
                {t('accounting.generalLedger.columns.balance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.generalLedger.loading')}
                </td>
              </tr>
            ) : (rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t('accounting.generalLedger.empty')}
                </td>
              </tr>
            ) : (
              (rows ?? []).map((row, index) => (
                <tr
                  key={`${row.journalNumber}-${index}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.journalNumber}</td>
                  <td className="px-3 py-2">{row.description}</td>
                  <td className="px-3 py-2 text-right">
                    {row.debit > 0 ? formatVnd(row.debit) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.credit > 0 ? formatVnd(row.credit) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatVnd(row.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
