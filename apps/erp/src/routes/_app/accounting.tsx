import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';

export const Route = createFileRoute('/_app/accounting')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: AccountingLayout,
});

const TABS = [
  { to: '/accounting/trial-balance', labelKey: 'accounting.tabs.trialBalance' },
  { to: '/accounting/general-ledger', labelKey: 'accounting.tabs.generalLedger' },
  { to: '/accounting/ar-aging', labelKey: 'accounting.tabs.arAging' },
  { to: '/accounting/ap-aging', labelKey: 'accounting.tabs.apAging' },
  { to: '/accounting/chart-of-accounts', labelKey: 'accounting.tabs.chartOfAccounts' },
] as const;

function AccountingLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.accounting')}</h1>
      <nav className="flex flex-wrap gap-4 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="border-b-2 px-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: 'border-accent font-medium text-foreground' }}
            inactiveProps={{ className: 'border-transparent' }}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
