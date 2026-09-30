import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { LeaveRequestForm } from '../../../../features/hrm/leave-form';

export const Route = createFileRoute('/_app/hrm/leave/new')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.hrmWrite),
  component: () => <LeaveRequestForm />,
});
