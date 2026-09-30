import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';

export const Route = createFileRoute('/_app/sales')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: SalesLayout,
});

const TABS = [
  { to: '/sales/customers', labelKey: 'sales.tabs.customers' },
  { to: '/sales/quotations', labelKey: 'sales.tabs.quotations' },
  { to: '/sales/orders', labelKey: 'sales.tabs.orders' },
  { to: '/sales/invoices', labelKey: 'sales.tabs.invoices' },
] as const;

function SalesLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.sales')}</h1>
      <nav className="flex gap-4 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            search={{ page: 1, pageSize: 50 }}
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
