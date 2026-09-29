import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  MoneyCell,
  StatusBadge,
  FilterBar,
  Button,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  PurchaseOrderStatusSchema,
  type PurchaseOrderView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate } from '../../../../shared/lib/format';
import { usePurchaseOrders } from '../../../../features/purchasing/queries';
import {
  PurchaseOrdersSearchSchema,
  type PurchaseOrdersSearch,
} from '../../../../features/purchasing/search-schemas';
import { poStatusLabel, poStatusTone } from '../../../../features/purchasing/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/purchasing/orders/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  validateSearch: PurchaseOrdersSearchSchema,
  component: PurchaseOrdersPage,
});

const columnHelper = createDataGridColumnHelper<PurchaseOrderView>();

function toListParams(search: PurchaseOrdersSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: {
      status: search.status,
      orderFrom: search.orderFrom,
      orderTo: search.orderTo,
    },
  };
}

function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const canCreate = useCan(PERMISSIONS.purchasingWrite);

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = usePurchaseOrders(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('purchasing.orders.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/purchasing/orders/$poId"
            params={{ poId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('supplierName', {
        header: t('purchasing.orders.columns.supplierName'),
        size: 220,
      }),
      columnHelper.accessor('status', {
        header: t('purchasing.orders.columns.status'),
        size: 160,
        cell: (info) => (
          <StatusBadge tone={poStatusTone(info.getValue())}>
            {poStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('orderDate', {
        header: t('purchasing.orders.columns.orderDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('deliveryDate', {
        header: t('purchasing.orders.columns.deliveryDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('grandTotal', {
        header: t('purchasing.orders.columns.grandTotal'),
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
        label: t('purchasing.orders.columns.status'),
        type: 'enum-multiselect',
        options: PurchaseOrderStatusSchema.options.map((status) => ({
          label: poStatusLabel(t, status),
          value: status,
        })),
      },
      { id: 'order', label: t('purchasing.orders.columns.orderDate'), type: 'date-range' },
    ],
    [t],
  );

  const filterValues = {
    status: search.status,
    orderFrom: search.orderFrom,
    orderTo: search.orderTo,
  };

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        configs={filterConfigs}
        values={filterValues}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              page: 1,
              status: next.status,
              orderFrom: next.orderFrom,
              orderTo: next.orderTo,
            }),
          })
        }
      />

      <DataGrid
        viewId="purchasing-orders"
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
        emptyMessage={t('purchasing.orders.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('purchasing.orders.searchPlaceholder')}
        labels={dataGridLabels}
        toolbarExtra={
          canCreate ? (
            <Button asChild size="sm">
              <Link to="/purchasing/orders/new">{t('purchasing.orders.newButton')}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
