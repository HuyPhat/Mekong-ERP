import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DataGrid, createDataGridColumnHelper, MoneyCell, NumberCell } from '@mekong-erp/ui';
import { PERMISSIONS, type Supplier, type ListParams } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useSuppliers } from '../../../features/purchasing/queries';
import {
  SuppliersSearchSchema,
  type SuppliersSearch,
} from '../../../features/purchasing/search-schemas';
import { sortingToParam, paramToSorting } from '../../../shared/lib/sort-params';
import { buildDataGridLabels } from '../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/purchasing/suppliers')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.purchasingRead),
  validateSearch: SuppliersSearchSchema,
  component: SuppliersPage,
});

const columnHelper = createDataGridColumnHelper<Supplier>();

function toListParams(search: SuppliersSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
  };
}

function SuppliersPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useSuppliers(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('code', { header: t('purchasing.suppliers.columns.code'), size: 100 }),
      columnHelper.accessor('name', { header: t('purchasing.suppliers.columns.name'), size: 260 }),
      columnHelper.accessor('taxCode', {
        header: t('purchasing.suppliers.columns.taxCode'),
        size: 130,
      }),
      columnHelper.accessor('phone', {
        header: t('purchasing.suppliers.columns.phone'),
        size: 130,
      }),
      columnHelper.accessor('email', {
        header: t('purchasing.suppliers.columns.email'),
        size: 200,
      }),
      columnHelper.accessor('creditLimit', {
        header: t('purchasing.suppliers.columns.creditLimit'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('paymentTermsDays', {
        header: t('purchasing.suppliers.columns.paymentTermsDays'),
        size: 120,
        cell: (info) => <NumberCell value={info.getValue()} />,
      }),
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);

  return (
    <DataGrid
      viewId="purchasing-suppliers"
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
      emptyMessage={t('purchasing.suppliers.empty')}
      searchValue={search.q ?? ''}
      onSearchChange={(value) =>
        void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
      }
      searchPlaceholder={t('purchasing.suppliers.searchPlaceholder')}
      labels={dataGridLabels}
    />
  );
}
