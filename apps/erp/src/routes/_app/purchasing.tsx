import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';
import { Can } from '../../shared/permissions/can';

export const Route = createFileRoute('/_app/purchasing')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  component: PurchasingPage,
});

function PurchasingPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <ModulePlaceholder titleKey="nav.purchasing" phase={3} />
      <Can
        permission={PERMISSIONS.purchaseOrderApprove}
        fallback={<p className="text-sm text-muted-foreground">{t('purchasing.approveHidden')}</p>}
      >
        <Button className="w-fit">{t('purchasing.approveDemoButton')}</Button>
      </Can>
    </div>
  );
}
