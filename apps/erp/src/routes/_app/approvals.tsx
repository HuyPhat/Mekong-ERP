import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { ModulePlaceholder } from '../../shared/components/module-placeholder';

export const Route = createFileRoute('/_app/approvals')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.approvalsRead),
  component: () => <ModulePlaceholder titleKey="nav.approvals" phase={3} />,
});
