import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DataGrid, createDataGridColumnHelper, MoneyCell, NumberCell } from '@mekong-erp/ui';
import { PERMISSIONS, type Customer, type ListParams } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useCustomers } from '../../../features/sales/queries';
import {
  CustomersSearchSchema,
  type CustomersSearch,
} from '../../../features/sales/search-schemas';
import { sortingToParam, paramToSorting } from '../../../shared/lib/sort-params';
import { buildDataGridLabels } from '../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/sales/customers')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  validateSearch: CustomersSearchSchema,
  component: CustomersPage,
});

const columnHelper = createDataGridColumnHelper<Customer>();

function toListParams(search: CustomersSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
  };
}

function CustomersPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useCustomers(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('code', { header: t('sales.customers.columns.code'), size: 100 }),
      columnHelper.accessor('name', { header: t('sales.customers.columns.name'), size: 260 }),
      columnHelper.accessor('taxCode', { header: t('sales.customers.columns.taxCode'), size: 130 }),
      columnHelper.accessor('phone', { header: t('sales.customers.columns.phone'), size: 130 }),
      columnHelper.accessor('email', { header: t('sales.customers.columns.email'), size: 200 }),
      columnHelper.accessor('creditLimit', {
        header: t('sales.customers.columns.creditLimit'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('paymentTermsDays', {
        header: t('sales.customers.columns.paymentTermsDays'),
        size: 120,
        cell: (info) => <NumberCell value={info.getValue()} />,
      }),
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);

  return (
    <DataGrid
      viewId="sales-customers"
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
      emptyMessage={t('sales.customers.empty')}
      searchValue={search.q ?? ''}
      onSearchChange={(value) =>
        void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
      }
      searchPlaceholder={t('sales.customers.searchPlaceholder')}
      labels={dataGridLabels}
    />
  );
}
