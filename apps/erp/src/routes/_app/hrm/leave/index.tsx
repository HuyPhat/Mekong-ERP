import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  NumberCell,
  StatusBadge,
  FilterBar,
  KpiTile,
  Button,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  LeaveRequestStatusSchema,
  LeaveTypeSchema,
  type LeaveRequestView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate, formatDateOnly } from '../../../../shared/lib/format';
import { useSession } from '../../../../features/auth/queries';
import { useLeaveBalance, useLeaveRequests, useMyEmployee } from '../../../../features/hrm/queries';
import {
  LeaveRequestsSearchSchema,
  type LeaveRequestsSearch,
} from '../../../../features/hrm/search-schemas';
import { leaveStatusLabel, leaveStatusTone, leaveTypeLabel } from '../../../../features/hrm/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/hrm/leave/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.hrmRead),
  validateSearch: LeaveRequestsSearchSchema,
  component: LeaveRequestsPage,
});

const columnHelper = createDataGridColumnHelper<LeaveRequestView>();

function toListParams(search: LeaveRequestsSearch, employeeId: string | undefined): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: {
      status: search.status,
      type: search.type,
      ...(employeeId ? { employeeId } : {}),
    },
  };
}

function LeaveRequestsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const canCreate = useCan(PERMISSIONS.hrmWrite);
  // Seeing everyone's leave is a manager's view. (UX gating, like every permission here.)
  const canSeeAll = useCan(PERMISSIONS.leaveRequestApprove);
  const scope = search.scope === 'all' && canSeeAll ? 'all' : 'mine';

  const { data: session } = useSession();
  const { data: employee, isLoading: employeeLoading } = useMyEmployee(session?.user?.id);
  const year = new Date().getFullYear();
  const { data: balance } = useLeaveBalance(employee?.id, year);

  // "Mine" filters on the employee record, so nothing is asked until it is known.
  const myEmployeeId = scope === 'mine' ? employee?.id : undefined;
  const ready = scope === 'all' || (!employeeLoading && employee !== undefined);
  const params = useMemo(() => toListParams(search, myEmployeeId), [search, myEmployeeId]);
  const { data, isLoading, isError, refetch } = useLeaveRequests(params, ready);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('hrm.leave.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/hrm/leave/$leaveId"
            params={{ leaveId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      ...(scope === 'all'
        ? [
            columnHelper.accessor('employeeName', {
              header: t('hrm.leave.columns.employee'),
              size: 200,
              cell: (info) => (
                <div className="flex flex-col">
                  <span>{info.getValue()}</span>
                  <span className="text-xs text-muted-foreground">
                    {info.row.original.employeeCode} ·{' '}
                    {t(`hrm.departments.${info.row.original.department}`)}
                  </span>
                </div>
              ),
            }),
          ]
        : []),
      columnHelper.accessor('type', {
        header: t('hrm.leave.columns.type'),
        size: 130,
        cell: (info) => leaveTypeLabel(t, info.getValue()),
      }),
      columnHelper.accessor('startDate', {
        header: t('hrm.leave.columns.period'),
        size: 200,
        cell: (info) => {
          const { startDate, endDate } = info.row.original;
          return startDate === endDate
            ? formatDateOnly(startDate)
            : `${formatDateOnly(startDate)} – ${formatDateOnly(endDate)}`;
        },
      }),
      columnHelper.accessor('days', {
        header: t('hrm.leave.columns.days'),
        size: 110,
        cell: (info) => (
          <NumberCell
            value={info.getValue()}
            unit={t('hrm.leave.daysUnit', { count: info.getValue() })}
          />
        ),
      }),
      columnHelper.accessor('status', {
        header: t('hrm.leave.columns.status'),
        size: 170,
        cell: (info) => (
          <StatusBadge tone={leaveStatusTone(info.getValue())}>
            {leaveStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('submittedAt', {
        header: t('hrm.leave.columns.submittedAt'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
    ],
    [t, scope],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('hrm.leave.columns.status'),
        type: 'enum-multiselect',
        options: LeaveRequestStatusSchema.options.map((status) => ({
          label: leaveStatusLabel(t, status),
          value: status,
        })),
      },
      {
        id: 'type',
        label: t('hrm.leave.columns.type'),
        type: 'enum-multiselect',
        options: LeaveTypeSchema.options.map((type) => ({
          label: leaveTypeLabel(t, type),
          value: type,
        })),
      },
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);
  const days = (count: number) => t('hrm.leave.days', { count });

  return (
    <div className="flex flex-col gap-4">
      {scope === 'mine' && balance && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            label={t('hrm.leave.balance.allowance', { year })}
            value={days(balance.allowance)}
          />
          <KpiTile label={t('hrm.leave.balance.used')} value={days(balance.used)} />
          <KpiTile label={t('hrm.leave.balance.pending')} value={days(balance.pending)} />
          <KpiTile label={t('hrm.leave.balance.remaining')} value={days(balance.remaining)} />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        {canSeeAll && (
          <div
            role="group"
            aria-label={t('hrm.leave.scope.label')}
            className="flex gap-1 rounded-md border border-border p-1"
          >
            {(['mine', 'all'] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={scope === option ? 'default' : 'ghost'}
                aria-pressed={scope === option}
                onClick={() =>
                  void navigate({ search: (prev) => ({ ...prev, page: 1, scope: option }) })
                }
              >
                {t(`hrm.leave.scope.${option}`)}
              </Button>
            ))}
          </div>
        )}
        <FilterBar
          configs={filterConfigs}
          values={{ status: search.status, type: search.type }}
          labels={filterBarLabels}
          onChange={(next) =>
            void navigate({
              search: (prev) => ({ ...prev, page: 1, status: next.status, type: next.type }),
            })
          }
        />
      </div>

      <DataGrid
        viewId={`hrm-leave-${scope}`}
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        rowCount={data?.meta.total ?? 0}
        pagination={{ pageIndex: search.page - 1, pageSize: search.pageSize }}
        onPaginationChange={(updater) => {
          const current = { pageIndex: search.page - 1, pageSize: search.pageSize };
          const next = typeof updater === 'function' ? updater(current) : updater;
          void navigate({
            search: (prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }),
          });
        }}
        sorting={paramToSorting(search.sort)}
        onSortingChange={(updater) => {
          const current = paramToSorting(search.sort);
          const next = typeof updater === 'function' ? updater(current) : updater;
          void navigate({ search: (prev) => ({ ...prev, page: 1, sort: sortingToParam(next) }) });
        }}
        isLoading={isLoading || !ready}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t(scope === 'mine' ? 'hrm.leave.emptyMine' : 'hrm.leave.emptyAll')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('hrm.leave.searchPlaceholder')}
        labels={dataGridLabels}
        toolbarExtra={
          canCreate ? (
            <Button asChild size="sm">
              <Link to="/hrm/leave/new">{t('hrm.leave.newButton')}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
