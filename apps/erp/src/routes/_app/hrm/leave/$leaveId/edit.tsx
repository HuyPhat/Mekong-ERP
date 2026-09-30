import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { LeaveRequestForm } from '../../../../../features/hrm/leave-form';
import { useLeaveRequest } from '../../../../../features/hrm/queries';

export const Route = createFileRoute('/_app/hrm/leave/$leaveId/edit')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.hrmWrite),
  component: EditLeaveRequestPage,
});

function EditLeaveRequestPage() {
  const { t } = useTranslation();
  const { leaveId } = Route.useParams();
  const { data: leave, isLoading, isError } = useLeaveRequest(leaveId);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('hrm.leave.detail.loading')}</p>;
  }
  if (isError || !leave) {
    return <p className="text-destructive">{t('hrm.leave.detail.notFound')}</p>;
  }
  // Only a request that was sent back can be changed; everything else is settled or in review.
  if (leave.status !== 'changes_requested') {
    return (
      <div className="flex flex-col gap-3">
        <p>{t('hrm.leave.edit.notEditable')}</p>
        <Link
          to="/hrm/leave/$leaveId"
          params={{ leaveId }}
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
        >
          {t('hrm.leave.edit.backToRequest')}
        </Link>
      </div>
    );
  }
  return <LeaveRequestForm revising={leave} />;
}
