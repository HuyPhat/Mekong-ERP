import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  FilterBar,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import { PERMISSIONS, type AuditLogEntry, type ListParams } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { formatDate } from '../../shared/lib/format';
import { useAuditLog } from '../../features/purchasing/queries';
import {
  AuditLogSearchSchema,
  type AuditLogSearch,
} from '../../features/purchasing/search-schemas';
import { sortingToParam, paramToSorting } from '../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.adminRead),
  validateSearch: AuditLogSearchSchema,
  component: AuditLogPage,
});

const ENTITY_TYPES = [
  'purchase_order',
  'vendor_bill',
  'quotation',
  'sales_order',
  'customer_invoice',
  'leave_request',
] as const;

const columnHelper = createDataGridColumnHelper<AuditLogEntry>();

function toListParams(search: AuditLogSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { entityType: search.entityType },
  };
}

function AuditLogPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useAuditLog(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('at', {
        header: t('admin.auditLog.columns.at'),
        size: 160,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('entityType', {
        header: t('admin.auditLog.columns.entityType'),
        size: 140,
        cell: (info) => {
          const type = info.getValue();
          return t(`admin.auditLog.entityTypes.${type}`, { defaultValue: type });
        },
      }),
      columnHelper.accessor('entityNumber', {
        header: t('admin.auditLog.columns.entityNumber'),
        size: 140,
      }),
      columnHelper.accessor('action', { header: t('admin.auditLog.columns.action'), size: 200 }),
      columnHelper.accessor('actorId', {
        header: t('admin.auditLog.columns.actorId'),
        size: 180,
        cell: (info) => {
          const actorId = info.getValue();
          return t(`roles.${actorId}`, { defaultValue: actorId });
        },
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'entityType',
        label: t('admin.auditLog.entityTypeFilterLabel'),
        type: 'enum-multiselect',
        options: ENTITY_TYPES.map((type) => ({
          label: t(`admin.auditLog.entityTypes.${type}`),
          value: type,
        })),
      },
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('admin.auditLog.title')}</h1>

      <FilterBar
        configs={filterConfigs}
        values={{ entityType: search.entityType }}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, entityType: next.entityType }) })
        }
      />

      <DataGrid
        viewId="admin-audit-log"
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
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('admin.auditLog.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('admin.auditLog.searchPlaceholder')}
        labels={dataGridLabels}
      />
    </div>
  );
}
