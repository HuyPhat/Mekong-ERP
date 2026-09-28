import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';

export const Route = createFileRoute('/_app/sales')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: () => <ModulePlaceholder titleKey="nav.sales" phase={4} />,
});
