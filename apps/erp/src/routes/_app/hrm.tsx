import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';

export const Route = createFileRoute('/_app/hrm')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.hrmRead),
  component: HrmLayout,
});

function HrmLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.hrm')}</h1>
      <nav className="flex gap-4 border-b border-border">
        <Link
          to="/hrm/leave"
          search={{ page: 1, pageSize: 50, scope: 'mine' }}
          className="border-b-2 border-transparent px-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
          activeProps={{ className: 'border-accent font-medium text-foreground' }}
        >
          {t('hrm.tabs.leave')}
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
