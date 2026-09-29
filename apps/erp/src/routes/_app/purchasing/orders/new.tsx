import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { PoWizard } from '../../../../features/purchasing/po-wizard';

export const Route = createFileRoute('/_app/purchasing/orders/new')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingWrite),
  component: PoWizard,
});
