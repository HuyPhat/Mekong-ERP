import { useCallback, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  MoneyCell,
  StatusBadge,
  FilterBar,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Textarea,
  toast,
  type ColumnFilterConfig,
  type BulkAction,
  type BulkActionResult,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  ApprovalStatusSchema,
  type ApprovalView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { useCan } from '../../shared/permissions/use-can';
import { useSession } from '../../features/auth/queries';
import { formatDate } from '../../shared/lib/format';
import { useApprovals, useSubmitApprovalDecision } from '../../features/purchasing/queries';
import {
  ApprovalsSearchSchema,
  type ApprovalsSearch,
} from '../../features/purchasing/search-schemas';
import { approvalStatusLabel, approvalStatusTone } from '../../features/purchasing/status';
import { sortingToParam, paramToSorting } from '../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/approvals')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.approvalsRead),
  validateSearch: ApprovalsSearchSchema,
  component: ApprovalsInboxPage,
});

const columnHelper = createDataGridColumnHelper<ApprovalView>();

function toListParams(search: ApprovalsSearch, approverRole: string | undefined): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { status: search.status, ...(approverRole ? { approverRole } : {}) },
  };
}

type ReasonDecision = 'rejected' | 'changes_requested';

function ApprovalsInboxPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const canDecide = useCan(PERMISSIONS.purchaseOrderApprove);
  const { data: session } = useSession();
  const actorId = session?.user?.id ?? '';
  const approverRole = session?.user?.role;

  const [reasonTarget, setReasonTarget] = useState<{ id: string; decision: ReasonDecision } | null>(
    null,
  );
  const [reasonText, setReasonText] = useState('');

  const params = useMemo(() => toListParams(search, approverRole), [search, approverRole]);
  const { data, isLoading, isError, refetch } = useApprovals(params);
  const decideMutation = useSubmitApprovalDecision();

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await decideMutation.mutateAsync({ id, decision: 'approved', actorId });
      } catch {
        toast({ title: t('errors.genericTitle'), variant: 'destructive' });
      }
    },
    [decideMutation, actorId, t],
  );

  async function handleReasonSubmit() {
    if (!reasonTarget) return;
    if (!reasonText.trim()) {
      toast({ title: t('approvals.reasonRequired'), variant: 'destructive' });
      return;
    }
    try {
      await decideMutation.mutateAsync({
        id: reasonTarget.id,
        decision: reasonTarget.decision,
        actorId,
        comment: reasonText.trim(),
      });
      setReasonTarget(null);
      setReasonText('');
    } catch {
      toast({ title: t('errors.genericTitle'), variant: 'destructive' });
    }
  }

  const bulkActions: BulkAction<ApprovalView>[] = useMemo(
    () => [
      {
        id: 'bulk-approve',
        label: t('approvals.bulkApprove'),
        confirmMessage: t('approvals.bulkApproveConfirm'),
        run: async (rows): Promise<BulkActionResult> => {
          const outcomes = await Promise.allSettled(
            rows
              .filter((row) => row.status === 'pending')
              .map((row) =>
                decideMutation.mutateAsync({ id: row.id, decision: 'approved', actorId }),
              ),
          );
          const succeeded = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
          const failed = outcomes.length - succeeded;
          return { succeeded, failed };
        },
      },
    ],
    [t, decideMutation, actorId],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('docNumber', {
        header: t('approvals.columns.docNumber'),
        size: 160,
        cell: (info) => (
          <Link
            to="/purchasing/orders/$poId"
            params={{ poId: info.row.original.docId }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('supplierName', {
        header: t('approvals.columns.supplierName'),
        size: 220,
      }),
      columnHelper.accessor('amount', {
        header: t('approvals.columns.amount'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('approverRole', {
        header: t('approvals.columns.approverRole'),
        size: 160,
      }),
      columnHelper.accessor('createdAt', {
        header: t('approvals.columns.createdAt'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('status', {
        header: t('purchasing.orders.columns.status'),
        size: 140,
        cell: (info) => (
          <StatusBadge tone={approvalStatusTone(info.getValue())}>
            {approvalStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('approvals.columns.actions')}</span>,
        size: 260,
        cell: (info) => {
          const approval = info.row.original;
          if (!canDecide || approval.status !== 'pending') return null;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleApprove(approval.id)}
                disabled={decideMutation.isPending}
              >
                {t('approvals.approveButton')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReasonTarget({ id: approval.id, decision: 'changes_requested' });
                  setReasonText('');
                }}
              >
                {t('approvals.changesRequestedButton')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReasonTarget({ id: approval.id, decision: 'rejected' });
                  setReasonText('');
                }}
              >
                {t('approvals.rejectButton')}
              </Button>
            </div>
          );
        },
      }),
    ],
    [t, canDecide, decideMutation.isPending, handleApprove],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('approvals.statusFilterLabel'),
        type: 'enum-multiselect',
        options: ApprovalStatusSchema.options.map((status) => ({
          label: approvalStatusLabel(t, status),
          value: status,
        })),
      },
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('approvals.title')}</h1>

      <FilterBar
        configs={filterConfigs}
        values={{ status: search.status }}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, status: next.status }) })
        }
      />

      <DataGrid
        viewId="approvals-inbox"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        rowCount={data?.meta.total ?? 0}
        enableRowSelection={canDecide}
        bulkActions={bulkActions}
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
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('approvals.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('approvals.searchPlaceholder')}
        labels={dataGridLabels}
      />

      <Dialog open={reasonTarget !== null} onOpenChange={(open) => !open && setReasonTarget(null)}>
        <DialogContent>
          <DialogTitle>
            {reasonTarget?.decision === 'rejected'
              ? t('approvals.reasonDialogTitleReject')
              : t('approvals.reasonDialogTitleChanges')}
          </DialogTitle>
          <DialogDescription>{t('approvals.reasonLabel')}</DialogDescription>
          <Textarea
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            placeholder={t('approvals.reasonPlaceholder')}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReasonTarget(null)}>
              {t('purchasing.bills.detail.cancel')}
            </Button>
            <Button onClick={() => void handleReasonSubmit()} disabled={decideMutation.isPending}>
              {t('approvals.reasonSubmit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
