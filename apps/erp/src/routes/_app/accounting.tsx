import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';

export const Route = createFileRoute('/_app/accounting')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: () => <ModulePlaceholder titleKey="nav.accounting" phase={4} />,
});
