import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.adminRead),
  component: () => <ModulePlaceholder titleKey="nav.admin" phase={5} />,
});
