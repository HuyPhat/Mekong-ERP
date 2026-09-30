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
  QuotationStatusSchema,
  type QuotationView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate } from '../../../../shared/lib/format';
import { useQuotations } from '../../../../features/sales/queries';
import {
  QuotationsSearchSchema,
  type QuotationsSearch,
} from '../../../../features/sales/search-schemas';
import { quotationStatusLabel, quotationStatusTone } from '../../../../features/sales/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/sales/quotations/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  validateSearch: QuotationsSearchSchema,
  component: QuotationsPage,
});

const columnHelper = createDataGridColumnHelper<QuotationView>();

function toListParams(search: QuotationsSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { status: search.status },
  };
}

function QuotationsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const canCreate = useCan(PERMISSIONS.salesWrite);

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useQuotations(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('sales.quotations.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/sales/quotations/$quotationId"
            params={{ quotationId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('customerName', {
        header: t('sales.quotations.columns.customerName'),
        size: 220,
      }),
      columnHelper.accessor('status', {
        header: t('sales.quotations.columns.status'),
        size: 150,
        cell: (info) => (
          <StatusBadge tone={quotationStatusTone(info.getValue())}>
            {quotationStatusLabel(t, info.getValue())}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('quoteDate', {
        header: t('sales.quotations.columns.quoteDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('validUntil', {
        header: t('sales.quotations.columns.validUntil'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('grandTotal', {
        header: t('sales.quotations.columns.grandTotal'),
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
        label: t('sales.quotations.columns.status'),
        type: 'enum-multiselect',
        options: QuotationStatusSchema.options.map((status) => ({
          label: quotationStatusLabel(t, status),
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
        viewId="sales-quotations"
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
        emptyMessage={t('sales.quotations.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('sales.quotations.searchPlaceholder')}
        labels={dataGridLabels}
        toolbarExtra={
          canCreate ? (
            <Button asChild size="sm">
              <Link to="/sales/quotations/new">{t('sales.quotations.newButton')}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
