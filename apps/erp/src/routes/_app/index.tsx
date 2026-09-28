import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { useSession } from '../../features/auth/queries';

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.dashboardRead),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { data } = useSession();

  return (
    <div className="flex flex-col gap-2">
      {data?.user && (
        <>
          <h1 className="text-xl font-semibold">
            {t('dashboard.welcome', { name: data.user.name })}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.roleLabel', { role: t(`roles.${data.user.role}`) })}
          </p>
        </>
      )}
      <p className="mt-4 text-muted-foreground">{t('placeholder.comingInPhase', { phase: 4 })}</p>
    </div>
  );
}
