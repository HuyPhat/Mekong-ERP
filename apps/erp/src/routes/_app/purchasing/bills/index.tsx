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
  VendorBillStatusSchema,
  type VendorBillView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate } from '../../../../shared/lib/format';
import { useVendorBills } from '../../../../features/purchasing/queries';
import {
  VendorBillsSearchSchema,
  type VendorBillsSearch,
} from '../../../../features/purchasing/search-schemas';
import { billStatusLabel, billStatusTone } from '../../../../features/purchasing/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/purchasing/bills/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  validateSearch: VendorBillsSearchSchema,
  component: VendorBillsPage,
});

const columnHelper = createDataGridColumnHelper<VendorBillView>();

function toListParams(search: VendorBillsSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { status: search.status },
  };
}

function VendorBillsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const canCreate = useCan(PERMISSIONS.purchasingWrite);

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useVendorBills(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('purchasing.bills.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/purchasing/bills/$billId"
            params={{ billId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('poNumber', {
        header: t('purchasing.bills.columns.poNumber'),
        size: 140,
      }),
      columnHelper.accessor('supplierName', {
        header: t('purchasing.bills.columns.supplierName'),
        size: 220,
      }),
      columnHelper.accessor('status', {
        header: t('purchasing.bills.columns.status'),
        size: 160,
        cell: (info) => (
          <StatusBadge tone={billStatusTone(info.getValue())}>
            {billStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('grandTotal', {
        header: t('purchasing.bills.columns.grandTotal'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('dueDate', {
        header: t('purchasing.bills.columns.dueDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('purchasing.bills.columns.status'),
        type: 'enum-multiselect',
        options: VendorBillStatusSchema.options.map((status) => ({
          label: billStatusLabel(t, status),
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
        viewId="purchasing-bills"
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
        emptyMessage={t('purchasing.bills.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('purchasing.bills.searchPlaceholder')}
        labels={dataGridLabels}
        toolbarExtra={
          canCreate ? (
            <Button asChild size="sm">
              <Link to="/purchasing/bills/new" search={{ poId: undefined }}>
                {t('purchasing.bills.newButton')}
              </Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
