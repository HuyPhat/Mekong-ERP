import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  MoneyCell,
  StatusBadge,
  FilterBar,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  SalesOrderStatusSchema,
  type SalesOrderView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { formatDate } from '../../../../shared/lib/format';
import { useSalesOrders } from '../../../../features/sales/queries';
import {
  SalesOrdersSearchSchema,
  type SalesOrdersSearch,
} from '../../../../features/sales/search-schemas';
import { soStatusLabel, soStatusTone } from '../../../../features/sales/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/sales/orders/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  validateSearch: SalesOrdersSearchSchema,
  component: SalesOrdersPage,
});

const columnHelper = createDataGridColumnHelper<SalesOrderView>();

function toListParams(search: SalesOrdersSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { status: search.status, customerId: search.customerId },
  };
}

function SalesOrdersPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useSalesOrders(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('sales.orders.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/sales/orders/$soId"
            params={{ soId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('customerName', {
        header: t('sales.orders.columns.customerName'),
        size: 220,
      }),
      columnHelper.accessor('status', {
        header: t('sales.orders.columns.status'),
        size: 160,
        cell: (info) => (
          <StatusBadge tone={soStatusTone(info.getValue())}>
            {soStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('orderDate', {
        header: t('sales.orders.columns.orderDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('deliveryDate', {
        header: t('sales.orders.columns.deliveryDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('grandTotal', {
        header: t('sales.orders.columns.grandTotal'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('sales.orders.columns.status'),
        type: 'enum-multiselect',
        options: SalesOrderStatusSchema.options.map((status) => ({
          label: soStatusLabel(t, status),
          value: status,
        })),
      },
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        configs={filterConfigs}
        values={{ status: search.status }}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, status: next.status }) })
        }
      />

      <DataGrid
        viewId="sales-orders"
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
        emptyMessage={t('sales.orders.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('sales.orders.searchPlaceholder')}
        labels={dataGridLabels}
      />
    </div>
  );
}
