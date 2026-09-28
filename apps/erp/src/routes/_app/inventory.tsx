import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';

export const Route = createFileRoute('/_app/inventory')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.inventoryRead),
  component: () => <ModulePlaceholder titleKey="nav.inventory" phase={2} />,
});
