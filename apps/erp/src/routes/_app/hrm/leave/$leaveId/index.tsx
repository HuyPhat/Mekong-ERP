import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, Timeline, toast } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { useCan } from '../../../../../shared/permissions/use-can';
import { formatDate, formatDateOnly } from '../../../../../shared/lib/format';
import { useSession } from '../../../../../features/auth/queries';
import { useApprovals } from '../../../../../features/approvals/queries';
import { approvalTimelineEntries } from '../../../../../features/approvals/approval-timeline';
import {
  useCancelLeaveRequest,
  useLeaveRequest,
  useMyEmployee,
} from '../../../../../features/hrm/queries';
import {
  leaveStatusLabel,
  leaveStatusTone,
  leaveTypeLabel,
} from '../../../../../features/hrm/status';

export const Route = createFileRoute('/_app/hrm/leave/$leaveId/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.hrmRead),
  component: LeaveRequestDetailPage,
});

/** Today as `yyyy-mm-dd` on the viewer's calendar, comparable with a request's dates. */
function todayDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function LeaveRequestDetailPage() {
  const { t } = useTranslation();
  const { leaveId } = Route.useParams();
  const canWrite = useCan(PERMISSIONS.hrmWrite);
  const canApprove = useCan(PERMISSIONS.leaveRequestApprove);

  const { data: session } = useSession();
  const { data: me } = useMyEmployee(session?.user?.id);
  const { data: leave, isLoading, isError } = useLeaveRequest(leaveId);
  const { data: approvalsData } = useApprovals({
    page: 1,
    pageSize: 50,
    filters: { docId: leaveId },
  });
  const cancelMutation = useCancelLeaveRequest();

  const timelineEntries = useMemo(
    () => approvalTimelineEntries(approvalsData?.data ?? [], t),
    [approvalsData, t],
  );

  if (isLoading) {
    return <p className="text-muted-foreground">{t('hrm.leave.detail.loading')}</p>;
  }
  if (isError || !leave) {
    return <p className="text-destructive">{t('hrm.leave.detail.notFound')}</p>;
  }

  const isRequester = me !== undefined && me !== null && me.id === leave.employeeId;
  const canRevise = canWrite && isRequester && leave.status === 'changes_requested';
  const canCancel =
    canWrite &&
    isRequester &&
    (leave.status === 'pending_approval' ||
      (leave.status === 'approved' && leave.endDate >= todayDateOnly()));
  // Decisions are made in the inbox, as for purchase orders; nobody decides their own.
  const canReview = canApprove && !isRequester && leave.status === 'pending_approval';

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(leaveId);
      toast({ title: t('hrm.leave.detail.cancelSuccess') });
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/hrm/leave"
        search={{ page: 1, pageSize: 50, scope: 'mine' }}
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        {t('hrm.leave.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{leave.number}</h1>
          <StatusBadge tone={leaveStatusTone(leave.status)}>
            {leaveStatusLabel(t, leave.status)}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRevise && (
            <Button asChild>
              <Link to="/hrm/leave/$leaveId/edit" params={{ leaveId }}>
                {t('hrm.leave.detail.reviseButton')}
              </Link>
            </Button>
          )}
          {canReview && (
            <Button asChild variant="outline">
              <Link to="/approvals" search={{ page: 1, pageSize: 50, q: leave.number }}>
                {t('hrm.leave.detail.reviewButton')}
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? t('hrm.leave.detail.cancelling')
                : t('hrm.leave.detail.cancelButton')}
            </Button>
          )}
        </div>
      </div>

      {leave.status === 'changes_requested' && isRequester && (
        <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm">
          {t('hrm.leave.detail.changesRequestedHint')}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <dt className="text-muted-foreground">{t('hrm.leave.detail.employeeLabel')}</dt>
        <dd>
          {leave.employeeName}
          <span className="text-muted-foreground"> · {leave.employeeCode}</span>
        </dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.departmentLabel')}</dt>
        <dd>{t(`hrm.departments.${leave.department}`)}</dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.typeLabel')}</dt>
        <dd>{leaveTypeLabel(t, leave.type)}</dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.periodLabel')}</dt>
        <dd>
          {leave.startDate === leave.endDate
            ? formatDateOnly(leave.startDate)
            : `${formatDateOnly(leave.startDate)} – ${formatDateOnly(leave.endDate)}`}
        </dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.daysLabel')}</dt>
        <dd>{t('hrm.leave.days', { count: leave.days })}</dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.submittedLabel')}</dt>
        <dd>{formatDate(leave.submittedAt)}</dd>
        <dt className="text-muted-foreground">{t('hrm.leave.detail.reasonLabel')}</dt>
        <dd className="col-span-1 sm:col-span-3">{leave.reason}</dd>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('hrm.leave.detail.timelineTitle')}
        </h2>
        <Timeline items={timelineEntries} />
      </section>
    </div>
  );
}
