import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';

export const Route = createFileRoute('/_app/purchasing')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  component: PurchasingLayout,
});

const TABS = [
  { to: '/purchasing/suppliers', labelKey: 'purchasing.tabs.suppliers' },
  { to: '/purchasing/orders', labelKey: 'purchasing.tabs.orders' },
  { to: '/purchasing/bills', labelKey: 'purchasing.tabs.bills' },
] as const;

function PurchasingLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.purchasing')}</h1>
      <nav className="flex gap-4 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            search={{ page: 1, pageSize: 50 }}
            className="border-b-2 px-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: 'border-accent font-medium text-foreground' }}
            inactiveProps={{ className: 'border-transparent' }}
            // Stay marked on the tab's own sub-pages (new, detail), whose URL carries no list search.
            activeOptions={{ includeSearch: false }}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
